/**
 * JSON文件数据库层 — UTF8安全 + 多周计划 + 原子写入 + UUID
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 生成唯一 ID（时间戳毫秒 + 随机后缀，保持数字类型兼容存量数据）
function uid() {
  return Date.now();
}

// 写锁：防止并发读改写覆盖
let writeQueue = Promise.resolve();
function withWriteLock(fn) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(() => {
      try {
        const result = fn();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    }).catch(() => {});
  });
}

// 默认数据结构
function defaultData() {
  return {
    weeks: [],
    currentWeekId: null,
    dailyData: {},
    vpsList: [],
    prompts: [],
    assets: [],
    library: [],
    compressed: [],
    scripts: []
  };
}

// 默认周计划
function defaultWeek() {
  const now = new Date();
  const day = now.getDay() || 7;
  // 本周一
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const fmt = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');

  return {
    id: uid(),
    startDate: fmt(monday),
    endDate: fmt(friday),
    dailyBudget: 300,
    weekBudget: 1500,
    inquiryGoal: 400,
    groupGoal: 20,
    countries: ['印度尼西亚','越南','埃塞俄比亚','尼日利亚','南非'],
    hidden: false,
  };
}

// BOM清理 + UTF8读取
function read() {
  try {
    if (fs.existsSync(DB_FILE)) {
      let raw = fs.readFileSync(DB_FILE, 'utf-8');
      // 清理BOM
      if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
      const data = JSON.parse(raw);
      // 补齐缺失字段
      const def = defaultData();
      for (const key of Object.keys(def)) {
        if (!(key in data)) data[key] = def[key];
      }
      // 兼容旧版config字段迁移
      if (data.config && !data.weeks) {
        data.weeks = [{
          id: 1,
          startDate: data.config.startDate,
          endDate: data.config.endDate,
          dailyBudget: data.config.dailyBudget,
          weekBudget: data.config.weekBudget,
          inquiryGoal: data.config.inquiryGoal,
          groupGoal: data.config.groupGoal,
          countries: ['印度尼西亚','越南','埃塞俄比亚','尼日利亚','南非']
        }];
        data.currentWeekId = 1;
        delete data.config;
      }
      return data;
    }
  } catch (e) {
    console.error('数据库读取失败:', e.message);
    // 尝试从最新备份恢复
    const backupDir = path.join(DATA_DIR, "backups")
    if (fs.existsSync(backupDir)) {
      const backups = fs.readdirSync(backupDir).sort().reverse()
      for (const b of backups) {
        try {
          let raw = fs.readFileSync(path.join(backupDir, b), "utf-8")
          if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1)
          const data = JSON.parse(raw)
          // 恢复数据并重新写入主文件
          const def = defaultData()
          for (const key of Object.keys(def)) { if (!(key in data)) data[key] = def[key] }
          write(data)
          console.error("已从备份恢复数据库:", b)
          return data
        } catch (_) {}
      }
    }
  }
  return defaultData();
}

// 原子写入：先写临时文件，再 rename 替换主文件
function write(data) {
  try {
    if (fs.existsSync(DB_FILE)) {
      // 备份 — 加入毫秒防同一秒覆盖
      const backupDir = path.join(DATA_DIR, 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, '-').substring(0, 19) + '-' + String(now.getMilliseconds()).padStart(3, '0');
      fs.copyFileSync(DB_FILE, path.join(backupDir, 'db-' + ts + '.json'));
      const files = fs.readdirSync(backupDir).sort().reverse();
      files.slice(30).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
    }
    const json = JSON.stringify(data, null, 2);
    const tmpFile = DB_FILE + '.tmp.' + uid();
    fs.writeFileSync(tmpFile, json, 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
    return true;
  } catch (e) {
    console.error('数据库写入失败:', e.message);
    return false;
  }
}

// ==================== 周配置操作 ====================
function getWeeks() {
  return read().weeks;
}

function getCurrentWeek() {
  const data = read();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isExpired = (w) => {
    if (!w?.endDate) return true;
    const end = new Date(w.endDate + 'T00:00:00');
    return (today - end) / 86400000 > 7;
  };
  const isActive = (w) => {
    const s = new Date(w.startDate + 'T00:00:00');
    const e = new Date(w.endDate + 'T00:00:00');
    return s <= today && e >= today;
  };

  // 用户手动切换：直接返回，不检查过期
  if (data.currentWeekId != null && data.manualWeek) {
    const w = data.weeks.find(w => w.id == data.currentWeekId);
    if (w && !w.hidden) return w;
    // 手动周被删/隐藏了 → 退回到自动选择
  }

  // 自动选择：优先活跃周，无活跃周则创建当前周（而非选历史/未来周）
  const candidates = data.weeks.filter(w => !w.hidden && !isExpired(w));
  const active = candidates.find(w => isActive(w));
  if (active) {
    if (data.currentWeekId != active.id || data.manualWeek) {
      data.currentWeekId = active.id;
      data.manualWeek = false;
      write(data);
    }
    return active;
  }
  // 无有效周：创建新周
  const dw = defaultWeek();
  data.weeks.push(dw);
  data.currentWeekId = dw.id;
  data.manualWeek = false;
  write(data);
  return dw;
}

function hasOverlap(data, start, end) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return data.weeks.some(w => {
    if (w.hidden) return false
    const ws = new Date(w.startDate + 'T00:00:00')
    const we = new Date(w.endDate + 'T00:00:00')
    return ws <= e && we >= s
  })
}

function addWeek(weekData) {
  const data = read();
  // 强制日期为 YYYY-MM-DD 字符串，杜绝时区污染
  const clean = { ...weekData };
  if (clean.startDate) clean.startDate = String(clean.startDate).substring(0, 10);
  if (clean.endDate) clean.endDate = String(clean.endDate).substring(0, 10);
  const w = { ...defaultWeek(), ...clean, id: uid() };
  data.weeks.push(w);
  data.currentWeekId = w.id;
  data.manualWeek = true;           // 用户创建新周 = 主动操作，不过期检查
  write(data);
  return w;
}

function updateWeek(id, updates) {
  const data = read();
  const idx = data.weeks.findIndex(w => w.id == id);
  if (idx === -1) return null;
  const clean = { ...updates };
  if (clean.startDate) clean.startDate = String(clean.startDate).substring(0, 10);
  if (clean.endDate) clean.endDate = String(clean.endDate).substring(0, 10);
  data.weeks[idx] = { ...data.weeks[idx], ...clean };
  write(data);
  return data.weeks[idx];
}

function deleteWeek(id) {
  const data = read();
  const week = data.weeks.find(w => w.id == id);
  if (week) { week.hidden = true; }
  // 确保所有周都有 hidden 属性
  for (const w of data.weeks) { if (w.hidden === undefined || w.hidden === null) w.hidden = false; }
  if (data.currentWeekId == id) {
    const visible = data.weeks.filter(w => !w.hidden);
    data.currentWeekId = visible.length > 0 ? visible[visible.length - 1].id : null;
    data.manualWeek = false;
  }
  write(data);
  return true;
}

function restoreWeek(id) {
  const data = read();
  const week = data.weeks.find(w => w.id == id);
  if (week) {
    week.hidden = false;
    data.currentWeekId = id;
    data.manualWeek = true;
  }
  write(data);
  return week;
}

function permanentlyDeleteWeek(id) {
  const data = read();
  data.weeks = data.weeks.filter(w => w.id != id);
  if (data.currentWeekId == id) {
    const visible = data.weeks.filter(w => !w.hidden);
    data.currentWeekId = visible.length > 0 ? visible[visible.length - 1].id : null;
    data.manualWeek = false;
  }
  write(data);
  return true;
}

function setCurrentWeek(id) {
  const data = read();
  const exists = data.weeks.find(w => w.id == id);
  if (!exists) return null;
  data.currentWeekId = id;
  data.manualWeek = true;           // 用户主动切换，跳过过期检查
  write(data);
  return data.currentWeekId;
}

// ==================== 日报操作 ====================
function getDailyData(date) {
  const data = read();
  return data.dailyData[date] || null;
}

function getAllDailyData(query = {}) {
  const data = read();
  let entries = Object.entries(data.dailyData);
  if (query.startDate) entries = entries.filter(([d]) => d >= query.startDate);
  if (query.endDate) entries = entries.filter(([d]) => d <= query.endDate);
  if (query.country) entries = entries.filter(([, v]) => v.country === query.country);
  entries.sort(([a], [b]) => b.localeCompare(a));
  return Object.fromEntries(entries);
}

function saveDailyData(date, dailyRecord) {
  const data = read();
  data.dailyData[date] = { ...dailyRecord, savedAt: new Date().toISOString() };
  write(data);
  return data.dailyData[date];
}

function deleteDailyData(date) {
  const data = read();
  delete data.dailyData[date];
  write(data);
  return true;
}

// ==================== VPS操作 ====================
function getVpsList() {
  return read().vpsList;
}

function addVps(vps) {
  const data = read();
  const item = { id: uid(), ...vps };
  data.vpsList.push(item);
  write(data);
  return item;
}

function updateVps(id, updates) {
  const data = read();
  const idx = data.vpsList.findIndex(v => v.id == id);
  if (idx === -1) return null;
  data.vpsList[idx] = { ...data.vpsList[idx], ...updates };
  write(data);
  return data.vpsList[idx];
}

function deleteVps(id) {
  const data = read();
  data.vpsList = data.vpsList.filter(v => v.id != id);
  write(data);
  return true;
}

// ==================== 通用CRUD工厂 ====================
// collection: data key name
// defaults: 对象，新增时合并的默认字段
// sorter:   排序函数，默认按id降序
function makeCrud(collection, defaults = {}, sorter) {
  return {
    list() {
      const data = read();
      const arr = data[collection] || [];
      return sorter ? arr.sort(sorter) : arr.sort((a, b) => (b.id || 0) - (a.id || 0));
    },
    get(id) {
      const data = read();
      return (data[collection] || []).find(item => item.id == id) || null;
    },
    add(item) {
      const data = read();
      if (!Array.isArray(data[collection])) data[collection] = [];
      const record = { id: uid(), ...defaults, ...item, createdAt: new Date().toISOString() };
      data[collection].push(record);
      write(data);
      return record;
    },
    update(id, updates) {
      const data = read();
      const idx = (data[collection] || []).findIndex(item => item.id == id);
      if (idx === -1) return null;
      data[collection][idx] = { ...data[collection][idx], ...updates, id };
      write(data);
      return data[collection][idx];
    },
    delete(id) {
      const data = read();
      const found = (data[collection] || []).find(item => item.id == id);
      data[collection] = (data[collection] || []).filter(item => item.id != id);
      write(data);
      return found;
    }
  };
}

const promptsDb = makeCrud('prompts', { title: '', step: '未分类', sortOrder: 0, content: '', tags: [] },
  (a, b) => {
    if (a.step !== b.step) return (a.step || '').localeCompare(b.step || '');
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  }
);

const assetsDb = makeCrud('assets', { name: '', type: 'character', fileName: '', originalName: '', fileSize: 0, tags: [] });
const libraryDb = makeCrud('library', { name: '', fileName: '', originalName: '', fileSize: 0, tags: [] });
const compressedDb = makeCrud('compressed', { originalName: '', compressedName: '', originalSize: 0, compressedSize: 0, width: 0, height: 0, format: 'webp', quality: 80, name: '', category: '' });

function getPrompts() { return promptsDb.list(); }
function getPrompt(id) { return promptsDb.get(id); }
function addPrompt(item) { return promptsDb.add(item); }
function updatePrompt(id, updates) { return promptsDb.update(id, updates); }
function deletePrompt(id) { return promptsDb.delete(id); }
function reorderPrompts(orderedIds) {
  const data = read();
  if (!Array.isArray(data.prompts)) return false;
  orderedIds.forEach((id, i) => {
    const p = data.prompts.find(p => p.id == id);
    if (p) p.sortOrder = i + 1;
  });
  write(data);
  return true;
}

function getAssets(type) {
  const all = assetsDb.list();
  return type ? all.filter(a => a.type === type) : all;
}
function getAsset(id) { return assetsDb.get(id); }
function addAsset(item) { return assetsDb.add({ ...item, gridOverlay: item.gridOverlay !== undefined ? item.gridOverlay : (item.type === 'character') }); }
function updateAsset(id, updates) { return assetsDb.update(id, updates); }
function deleteAsset(id) { return assetsDb.delete(id); }

function getLibrary() { return libraryDb.list(); }
function getLibraryItem(id) { return libraryDb.get(id); }
function addLibraryItem(item) { return libraryDb.add(item); }
function updateLibraryItem(id, updates) { return libraryDb.update(id, updates); }
function deleteLibraryItem(id) { return libraryDb.delete(id); }

function getCompressed() { return compressedDb.list(); }
function getCompressedItem(id) { return compressedDb.get(id); }
function addCompressed(item) { return compressedDb.add(item); }
function updateCompressed(id, updates) { return compressedDb.update(id, updates); }
function deleteCompressed(id) { return compressedDb.delete(id); }

const scriptsDb = makeCrud('scripts', { title: '', content: '', contentCn: '', category: '开场白', tags: [], usageCount: 0 });

module.exports = {
  getWeeks, getCurrentWeek, addWeek, updateWeek, deleteWeek, restoreWeek, permanentlyDeleteWeek, setCurrentWeek,
  getDailyData, getAllDailyData, saveDailyData, deleteDailyData,
  getVpsList, addVps, updateVps, deleteVps,
  getPrompts, getPrompt, addPrompt, updatePrompt, deletePrompt, reorderPrompts,
  getAssets, getAsset, addAsset, updateAsset, deleteAsset,
  getLibrary, getLibraryItem, addLibraryItem, updateLibraryItem, deleteLibraryItem,
  hasOverlap,
  getCompressed, getCompressedItem, addCompressed, updateCompressed, deleteCompressed,
  getScripts() { return scriptsDb.list(); },
  getScript(id) { return scriptsDb.get(id); },
  addScript(item) { return scriptsDb.add(item); },
  updateScript(id, u) { return scriptsDb.update(id, u); },
  deleteScript(id) { return scriptsDb.delete(id); },
  incScriptUsage(id) {
    const s = scriptsDb.get(id);
    if (!s) return null;
    return scriptsDb.update(id, { usageCount: (s.usageCount || 0) + 1 });
  },
};
