/**
 * JSON文件数据库层 — UTF8安全 + 多周计划
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 默认数据结构
function defaultData() {
  return {
    weeks: [],
    currentWeekId: null,
    dailyData: {},
    vpsList: []
  };
}

// 默认周计划
function defaultWeek() {
  const now = new Date();
  const day = now.getDay() || 7;
  // 下周一
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 8);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const fmt = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');

  return {
    id: Date.now(),
    startDate: fmt(monday),
    endDate: fmt(friday),
    dailyBudget: 300,
    weekBudget: 1500,
    inquiryGoal: 400,
    groupGoal: 20,
    countries: ['印度尼西亚','越南','埃塞俄比亚','尼日利亚','南非']
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
  }
  return defaultData();
}

// UTF8写入（无BOM）
function write(data) {
  try {
    if (fs.existsSync(DB_FILE)) {
      // 多层备份 — 每次写入都保留时间戳副本，最多30份
      const backupDir = path.join(DATA_DIR, 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      fs.copyFileSync(DB_FILE, path.join(backupDir, 'db-' + ts + '.json'));
      const files = fs.readdirSync(backupDir).sort().reverse();
      files.slice(30).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
    }
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, json, 'utf-8');
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
  if (data.currentWeekId) {
    const w = data.weeks.find(w => w.id === data.currentWeekId);
    if (w) return w;
  }
  // fallback: 返回最近一周
  if (data.weeks.length > 0) return data.weeks[data.weeks.length - 1];
  // 创建默认周
  const dw = defaultWeek();
  data.weeks.push(dw);
  data.currentWeekId = dw.id;
  write(data);
  return dw;
}

function addWeek(weekData) {
  const data = read();
  // 强制日期为 YYYY-MM-DD 字符串，杜绝时区污染
  const clean = { ...weekData };
  if (clean.startDate) clean.startDate = String(clean.startDate).substring(0, 10);
  if (clean.endDate) clean.endDate = String(clean.endDate).substring(0, 10);
  const w = { ...defaultWeek(), ...clean, id: Date.now() };
  data.weeks.push(w);
  data.currentWeekId = w.id;
  write(data);
  return w;
}

function updateWeek(id, updates) {
  const data = read();
  const idx = data.weeks.findIndex(w => w.id === id);
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
  const week = data.weeks.find(w => w.id === id);
  if (week) {
    week.hidden = true;
  }
  if (data.currentWeekId === id) {
    const visible = data.weeks.filter(w => !w.hidden);
    data.currentWeekId = visible.length > 0 ? visible[visible.length - 1].id : null;
  }
  write(data);
  return true;
}

function restoreWeek(id) {
  const data = read();
  const week = data.weeks.find(w => w.id === id);
  if (week) {
    week.hidden = false;
    data.currentWeekId = id;
  }
  write(data);
  return week;
}

function permanentlyDeleteWeek(id) {
  const data = read();
  data.weeks = data.weeks.filter(w => w.id !== id);
  if (data.currentWeekId === id) {
    const visible = data.weeks.filter(w => !w.hidden);
    data.currentWeekId = visible.length > 0 ? visible[visible.length - 1].id : null;
  }
  write(data);
  return true;
}

function setCurrentWeek(id) {
  const data = read();
  const exists = data.weeks.find(w => w.id === id);
  if (!exists) return null;
  data.currentWeekId = id;
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
  const item = { id: Date.now(), ...vps };
  data.vpsList.push(item);
  write(data);
  return item;
}

function updateVps(id, updates) {
  const data = read();
  const idx = data.vpsList.findIndex(v => v.id === id);
  if (idx === -1) return null;
  data.vpsList[idx] = { ...data.vpsList[idx], ...updates };
  write(data);
  return data.vpsList[idx];
}

function deleteVps(id) {
  const data = read();
  data.vpsList = data.vpsList.filter(v => v.id !== id);
  write(data);
  return true;
}

module.exports = {
  getWeeks, getCurrentWeek, addWeek, updateWeek, deleteWeek, restoreWeek, permanentlyDeleteWeek, setCurrentWeek,
  getDailyData, getAllDailyData, saveDailyData, deleteDailyData,
  getVpsList, addVps, updateVps, deleteVps
};
