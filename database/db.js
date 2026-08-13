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
  return Date.now() + Math.floor(Math.random() * 10000);
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

// 默认广告账号
const DEFAULT_ACCOUNTS = [
  { id: 'lisa-office', name: '莉莎办公家具', businessLine: '办公家具', enabled: true, sort: 1 },
  { id: 'zhenshan-office', name: '甄珊办公家具', businessLine: '办公家具', enabled: true, sort: 2 },
  { id: 'xiege-office', name: '谢哥办公家具', businessLine: '办公家具', enabled: true, sort: 3 },
]

function getDefaultAccountId() { return DEFAULT_ACCOUNTS[0].id }
function normalizeAccountId(accountId) {
  if (!accountId || accountId === 'default') return getDefaultAccountId()
  return String(accountId)
}
function getAccountMeta(accountId) {
  const id = normalizeAccountId(accountId)
  return DEFAULT_ACCOUNTS.find(a => a.id === id) || { id, name: id, businessLine: '', enabled: true, sort: 99 }
}

// 默认数据结构
function defaultData() {
  return {
    weeks: [],
    currentWeekId: null,
    accounts: DEFAULT_ACCOUNTS,
    currentAccountId: getDefaultAccountId(),
    dailyData: {},
    vpsList: [],
    prompts: [],
    assets: [],
    library: [],
    compressed: [],
    scripts: [],
    customerStats: [],
    users: [],
    roles: [],
    salesPersons: []
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
    accountBudgets: {},
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
          accountBudgets: {},
          countries: ['印度尼西亚','越南','埃塞俄比亚','尼日利亚','南非']
        }];
        data.currentWeekId = 1;
        delete data.config;
      }
      // 补齐旧周缺少的 accountBudgets 字段
      if (Array.isArray(data.weeks)) {
        for (const w of data.weeks) {
          if (!w.accountBudgets) w.accountBudgets = {};
        }
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

// 获取指定账号的周预算（优先 accountBudgets，fallback 全局默认值）
function getWeekAccountBudgets(week, accountId) {
  const id = normalizeAccountId(accountId)
  const acc = (week.accountBudgets && week.accountBudgets[id]) || {}
  return {
    dailyBudget: acc.dailyBudget != null ? acc.dailyBudget : (week.dailyBudget || 300),
    weekBudget: acc.weekBudget != null ? acc.weekBudget : (week.weekBudget || 1500),
    inquiryGoal: acc.inquiryGoal != null ? acc.inquiryGoal : (week.inquiryGoal || 400),
    groupGoal: acc.groupGoal != null ? acc.groupGoal : (week.groupGoal || 20),
  }
}

// ==================== 日报操作 ====================

// 将旧格式 { country, fb: {..., summary, optimize} } 转为新格式，并补齐 accounts 账号维度
function _migrateDailyRecord(record) {
  if (!record) return null

  let base = record
  if (!base.countries) {
    const fb = base.fb || {}
    const { summary, optimize, ...fbData } = fb
    base = {
      ...base,
      countries: { [base.country || '综合']: fbData },
      summary: summary || '',
      optimize: optimize || '',
      savedAt: base.savedAt || null
    }
  }

  const savedAt = base.savedAt || null
  const accounts = {}
  if (base.accounts && typeof base.accounts === 'object') {
    for (const [rawId, acc] of Object.entries(base.accounts)) {
      const accountId = normalizeAccountId(acc?.accountId || rawId)
      const meta = getAccountMeta(accountId)
      accounts[accountId] = {
        accountId,
        accountName: acc?.accountName || meta.name,
        businessLine: acc?.businessLine || meta.businessLine || '',
        countries: acc?.countries || {},
        summary: acc?.summary || '',
        optimize: acc?.optimize || '',
        savedAt: acc?.savedAt || savedAt
      }
    }
  }

  if (!Object.keys(accounts).length) {
    const accountId = getDefaultAccountId()
    const meta = getAccountMeta(accountId)
    accounts[accountId] = {
      accountId,
      accountName: meta.name,
      businessLine: meta.businessLine,
      countries: base.countries || {},
      summary: base.summary || '',
      optimize: base.optimize || '',
      savedAt
    }
  }

  const defaultAcc = accounts[getDefaultAccountId()] || Object.values(accounts)[0]
  return {
    ...base,
    accounts,
    countries: base.countries || defaultAcc?.countries || {},
    summary: base.summary || defaultAcc?.summary || '',
    optimize: base.optimize || defaultAcc?.optimize || '',
    savedAt
  }
}

function pickAccountRecord(record, accountId) {
  const migrated = _migrateDailyRecord(record)
  if (!migrated) return null
  const id = normalizeAccountId(accountId)
  if (id === 'all') return migrated
  const acc = migrated.accounts?.[id]
  if (!acc) return null
  return {
    countries: acc.countries || {},
    summary: acc.summary || '',
    optimize: acc.optimize || '',
    accountId: acc.accountId || id,
    accountName: acc.accountName || getAccountMeta(id).name,
    businessLine: acc.businessLine || '',
    accounts: { [id]: acc },
    savedAt: acc.savedAt || migrated.savedAt || null
  }
}

function getDailyData(date, options = {}) {
  const data = read();
  const record = data.dailyData[date];
  if (options.accountId) return pickAccountRecord(record, options.accountId)
  return _migrateDailyRecord(record);
}

function getAllDailyData(query = {}) {
  const data = read();
  let entries = Object.entries(data.dailyData);
  if (query.startDate) entries = entries.filter(([d]) => d >= query.startDate);
  if (query.endDate) entries = entries.filter(([d]) => d <= query.endDate);
  entries.sort(([a], [b]) => b.localeCompare(a));

  const result = {};
  const accountId = query.accountId ? normalizeAccountId(query.accountId) : null
  for (const [date, record] of entries) {
    const migrated = _migrateDailyRecord(record);
    if (!migrated) continue

    let out = migrated
    if (accountId && accountId !== 'all') {
      out = pickAccountRecord(migrated, accountId)
      if (!out) continue
    }

    if (query.country) {
      const hasCountry = (r) => {
        if (r.countries && Object.keys(r.countries).some(c => c === query.country)) return true
        if (r.accounts) return Object.values(r.accounts).some(acc => acc.countries && Object.keys(acc.countries).some(c => c === query.country))
        return false
      }
      if (!hasCountry(out)) continue
    }

    result[date] = out
  }
  return result;
}

function saveDailyData(date, dailyRecord, options = {}) {
  const data = read();
  const accountId = normalizeAccountId(options.accountId || dailyRecord.accountId || data.currentAccountId)
  const meta = getAccountMeta(accountId)
  const existing = _migrateDailyRecord(data.dailyData[date]) || { accounts: {}, savedAt: null }
  existing.accounts = existing.accounts || {}
  existing.accounts[accountId] = {
    accountId,
    accountName: dailyRecord.accountName || meta.name,
    businessLine: dailyRecord.businessLine || meta.businessLine || '',
    countries: dailyRecord.countries || {},
    summary: dailyRecord.summary || '',
    optimize: dailyRecord.optimize || '',
    savedAt: new Date().toISOString()
  }

  const defaultAcc = existing.accounts[getDefaultAccountId()] || existing.accounts[accountId]
  data.dailyData[date] = {
    ...existing,
    accounts: existing.accounts,
    countries: defaultAcc.countries || {},
    summary: defaultAcc.summary || '',
    optimize: defaultAcc.optimize || '',
    savedAt: new Date().toISOString()
  };
  write(data);
  return pickAccountRecord(data.dailyData[date], accountId);
}

function getAccounts() {
  const data = read();
  const accounts = Array.isArray(data.accounts) && data.accounts.length ? data.accounts : DEFAULT_ACCOUNTS
  return accounts.map(a => ({ ...a, id: normalizeAccountId(a.id) })).sort((a, b) => (a.sort || 99) - (b.sort || 99))
}

function deleteDailyData(date) {
  const data = read();
  delete data.dailyData[date];
  write(data);
  return true;
}

// ==================== VPS操作 ====================
function getVpsList(includeDeleted) {
  const list = read().vpsList;
  if (includeDeleted) return list;
  return list.filter(v => !v.deleted);
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
  return updateVps(id, { deleted: true, deletedAt: new Date().toISOString() });
}
function restoreVps(id) {
  return updateVps(id, { deleted: false, deletedAt: null });
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

const assetsDb = makeCrud('assets', { name: '', type: 'character', fileName: '', originalName: '', fileSize: 0, tags: [], mediaType: 'image', showName: '', episode: null, characterName: '', outfit: '' });
const libraryDb = makeCrud('library', { name: '', fileName: '', originalName: '', fileSize: 0, tags: [], readingProgress: 0, status: null });
const showScriptsDb = makeCrud('showScripts', { showName: '', showNameEn: '', type: 'script', episode: 1, done: false, title: '', content: '', tags: [], uploadedFile: null });
const compressedDb = makeCrud('compressed', { originalName: '', compressedName: '', originalSize: 0, compressedSize: 0, width: 0, height: 0, format: 'webp', quality: 80, name: '', category: '' });

function getPrompts(userId) {
  const all = promptsDb.list();
  return userId ? all.filter(p => (p.userId || 'admin') === userId) : all;
}
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

function getAssets(type, userId) {
  const all = assetsDb.list();
  const filtered = userId ? all.filter(a => (a.userId || 'admin') === userId) : all;
  return type ? filtered.filter(a => a.type === type) : filtered;
}
function getAsset(id) { return assetsDb.get(id); }
function addAsset(item) { return assetsDb.add({ ...item, gridOverlay: item.gridOverlay !== undefined ? item.gridOverlay : (item.type === 'character') }); }
function updateAsset(id, updates) { return assetsDb.update(id, updates); }
function deleteAsset(id) { return assetsDb.delete(id); }
function batchDeleteAssets(ids) {
  const data = read();
  if (!Array.isArray(data.assets)) return [];
  const deleted = [];
  const idSet = new Set(ids.map(String));
  data.assets = data.assets.filter(a => {
    if (idSet.has(String(a.id))) { deleted.push(a); return false; }
    return true;
  });
  write(data);
  return deleted;
}

// ===== 提示词步骤配置 =====
const DEFAULT_PROMPT_STEPS = [
  { key: '第一步：剧本', label: '剧本生成', color: '#a78bfa' },
  { key: '第二步：人物 物品 场景的提取', label: '元素提取', color: '#60a5fa' },
  { key: '第三步：生资产', label: '资产生成', color: '#22d3ee' },
  { key: '第四步：分镜提示词', label: '分镜提示词', color: '#fb923c' },
  { key: '第五步：生分镜', label: '分镜生成', color: '#f472b6' },
];

function getPromptSteps() {
  const data = read();
  if (!data.promptSteps || !Array.isArray(data.promptSteps) || data.promptSteps.length === 0) {
    return DEFAULT_PROMPT_STEPS;
  }
  return data.promptSteps;
}

function savePromptSteps(steps) {
  const data = read();
  data.promptSteps = steps;
  write(data);
  return data.promptSteps;
}

function getLibrary() { return libraryDb.list(); }
function getLibraryItem(id) { return libraryDb.get(id); }
function addLibraryItem(item) { return libraryDb.add(item); }
function updateLibraryItem(id, updates) { return libraryDb.update(id, updates); }
function deleteLibraryItem(id) { return libraryDb.delete(id); }

function getShowScripts(userId) {
  const all = showScriptsDb.list();
  return userId ? all.filter(s => (s.userId || 'admin') === userId) : all;
}
function getShowScript(id) { return showScriptsDb.get(id); }
function addShowScript(item) { return showScriptsDb.add(item); }
function updateShowScript(id, updates) { return showScriptsDb.update(id, updates); }
function deleteShowScript(id) { return showScriptsDb.delete(id); }

function getCompressed() { return compressedDb.list(); }
function getCompressedItem(id) { return compressedDb.get(id); }
function addCompressed(item) { return compressedDb.add(item); }
function updateCompressed(id, updates) { return compressedDb.update(id, updates); }
function deleteCompressed(id) { return compressedDb.delete(id); }

const scriptsDb = makeCrud('scripts', { title: '', content: '', contentCn: '', category: '开场白', tags: [], usageCount: 0 });

const customerStatsDb = makeCrud('customerStats', {
  date: '', accountId: '', accountName: '',
  newCustomers: 0, repliedCustomers: 0, registeredCustomers: 0,
  groupedWithPlan: 0, visitingCustomers: 0, closedDeals: 0,
  salesAssignments: [],
  countryBreakdown: []
})

const salesPersonsDb = makeCrud('salesPersons', { name: '', group: '' });

// 按日期范围和账号查询客户统计数据
function queryCustomerStats({ startDate, endDate, accountId } = {}) {
  let list = customerStatsDb.list()
  if (startDate) list = list.filter(r => r.date >= startDate)
  if (endDate) list = list.filter(r => r.date <= endDate)
  if (accountId) list = list.filter(r => r.accountId === accountId)
  return list
}

// 按日期+账号查找唯一记录（用于 upsert）
function findCustomerStatByDate(date, accountId) {
  return customerStatsDb.list().find(r => r.date === date && r.accountId === accountId) || null
}

// 保存或更新（同一日期+账号只保留一条）
function upsertCustomerStat(record) {
  const existing = findCustomerStatByDate(record.date, record.accountId)
  if (existing) {
    return customerStatsDb.update(existing.id, record)
  }
  return customerStatsDb.add(record)
}

// 月度汇总
function getCustomerStatsMonthly(month, accountId) {
  const list = customerStatsDb.list().filter(r => {
    if (!r.date) return false
    const m = r.date.substring(0, 7)
    if (m !== month) return false
    if (accountId && r.accountId !== accountId) return false
    return true
  })
  return {
    month,
    newCustomers: list.reduce((s, r) => s + (r.newCustomers || 0), 0),
    repliedCustomers: list.reduce((s, r) => s + (r.repliedCustomers || 0), 0),
    registeredCustomers: list.reduce((s, r) => s + (r.registeredCustomers || 0), 0),
    groupedWithPlan: list.reduce((s, r) => s + (r.groupedWithPlan || 0), 0),
    visitingCustomers: list.reduce((s, r) => s + (r.visitingCustomers || 0), 0),
    closedDeals: list.reduce((s, r) => s + (r.closedDeals || 0), 0),
    // 合并所有分配销售（按销售名分组累加）
    salesAssignments: (() => {
      const agg = {}
      for (const r of list) {
        const arr = Array.isArray(r.salesAssignments) ? r.salesAssignments : []
        for (const sa of arr) {
          if (sa.name) agg[sa.name] = (agg[sa.name] || 0) + (sa.count || 0)
        }
      }
      return Object.entries(agg).map(([name, count]) => ({ name, count }))
    })(),
    // 按国家聚合客资
    countryBreakdown: (() => {
      const agg = {}
      for (const r of list) {
        const arr = Array.isArray(r.countryBreakdown) ? r.countryBreakdown : []
        for (const cb of arr) {
          if (cb.country) agg[cb.country] = (agg[cb.country] || 0) + (cb.count || 0)
        }
      }
      return Object.entries(agg).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count)
    })(),
    records: list.length
  }
}

// ==================== 用户管理 ====================
const usersDb = makeCrud('users', { username: '', passwordHash: '', role: 'staff', displayName: '', enabled: true })
const rolesDb = makeCrud('roles', { name: '', displayName: '', menus: [], enabled: true })

const ALL_MENUS = ['/', '/plan', '/report', '/history', '/monitor', '/assets', '/media', '/video-library', '/compress', '/video-compress', '/customer-stats', '/logs', '/settings', '/user-manage', '/role-manage']

// 种子默认角色和管理员
function seedDefaultRoles() {
  const crypto = require('crypto')
  const DEF_FULL = { edit: true, add: true, delete: true }
  const DEF_RO = { edit: false, add: false, delete: false }
  const DEF_TAB_ACCESS = { assets: true, scripts: true, prompts: true }
  if (!rolesDb.list().some(r => r.name === 'admin')) {
    rolesDb.add({ name: 'admin', displayName: '管理员', menus: [...ALL_MENUS], permissions: DEF_FULL, perPagePerms: {}, tabAccess: DEF_TAB_ACCESS, enabled: true })
  } else {
    const admin = rolesDb.list().find(r => r.name === 'admin')
    if (admin) {
      const merged = [...new Set([...(admin.menus || []), ...ALL_MENUS])]
      const fixes = {}
      if (merged.length !== (admin.menus || []).length) fixes.menus = merged
      if (!admin.perPagePerms) fixes.perPagePerms = {}
      if (!admin.tabAccess) fixes.tabAccess = DEF_TAB_ACCESS
      if (Object.keys(fixes).length) rolesDb.update(admin.id, fixes)
    }
  }
  if (!rolesDb.list().some(r => r.name === 'staff')) {
    rolesDb.add({ name: 'staff', displayName: '访客', menus: [...ALL_MENUS], permissions: DEF_RO, perPagePerms: {}, tabAccess: DEF_TAB_ACCESS, enabled: true })
  }
  for (const r of rolesDb.list()) {
    const fixes = {}
    if (!r.permissions) fixes.permissions = r.name === 'admin' ? {...DEF_FULL} : {...DEF_RO}
    if (!r.perPagePerms) fixes.perPagePerms = {}
    if (!r.tabAccess) fixes.tabAccess = {...DEF_TAB_ACCESS}
    if (Object.keys(fixes).length) rolesDb.update(r.id, fixes)
  }
  // 默认管理员用户
  if (!usersDb.list().some(u => u.role === 'admin')) {
    const adminUser = process.env.PAN_USER || 'admin'
    const adminPass = process.env.PAN_PASSWORD || 'admin123'
    usersDb.add({
      username: adminUser,
      passwordHash: crypto.createHash('sha256').update(adminPass).digest('hex'),
      role: 'admin',
      displayName: '管理员',
      enabled: true
    })
  }
}

function getUserByUsername(username) {
  return usersDb.list().find(u => u.username === username && u.enabled !== false) || null
}

function getRoleByName(name) {
  return rolesDb.list().find(r => r.name === name && r.enabled !== false) || null
}


// 操作日志
const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
function logOperation(action, detail, user) {
  try {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      action,
      detail,
      user: user ? user.username : 'system',
      role: user ? user.role : ''
    }) + '\n';
    const logFile = path.join(LOG_DIR, new Date().toISOString().slice(0,10).replace(/-/g,'') + '.log');
    fs.appendFileSync(logFile, line, 'utf8');
  } catch {}
}

module.exports = {
  getWeeks, getCurrentWeek, addWeek, updateWeek, deleteWeek, restoreWeek, permanentlyDeleteWeek, setCurrentWeek,
  getWeekAccountBudgets,
  getAccounts, getDefaultAccountId, normalizeAccountId,
  getDailyData, getAllDailyData, saveDailyData, deleteDailyData,
  getVpsList, addVps, updateVps, deleteVps, restoreVps,
  getPrompts, getPrompt, addPrompt, updatePrompt, deletePrompt, reorderPrompts,
  getAssets, getAsset, addAsset, updateAsset, deleteAsset, batchDeleteAssets,
  getPromptSteps, savePromptSteps,
  getLibrary, getLibraryItem, addLibraryItem, updateLibraryItem, deleteLibraryItem,
  getShowScripts, getShowScript, addShowScript, updateShowScript, deleteShowScript,
  hasOverlap,
  getCompressed, getCompressedItem, addCompressed, updateCompressed, deleteCompressed,
  logOperation,
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
  queryCustomerStats,
  getCustomerStat(id) { return customerStatsDb.get(id); },
  upsertCustomerStat,
  deleteCustomerStat(id) { return customerStatsDb.delete(id); },
  getCustomerStatsMonthly,
  seedDefaultRoles, getUserByUsername, getRoleByName,
  getUsers() { return usersDb.list(); },
  addUser(item) { return usersDb.add(item); },
  updateUser(id, u) { return usersDb.update(id, u); },
  deleteUser(id) { return usersDb.delete(id); },
  getRoles() { return rolesDb.list(); },
  addRole(item) { return rolesDb.add(item); },
  updateRole(id, u) { return rolesDb.update(id, u); },
  deleteRole(id) { return rolesDb.delete(id); },
  getSalesPersons() { return salesPersonsDb.list(); },
  addSalesPerson(item) { return salesPersonsDb.add(item); },
  deleteSalesPerson(id) { return salesPersonsDb.delete(id); },
};
