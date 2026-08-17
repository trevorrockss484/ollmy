const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bus = require('../database/events');

function emitCustomerStatsChanged(date, accountId, clientId) {
  bus.emit('customer-stats-changed', { date: date || null, accountId: accountId || null, clientId: clientId || null });
}

// 客户统计同步回日报后，广播 daily-changed 让日报页自动刷新客资
function emitDailyChanged(date, accountId, clientId) {
  bus.emit('daily-changed', { date: date || null, accountId: accountId || null, clientId: clientId || null });
}

// 查询列表（按日期范围+账号）
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    const list = db.queryCustomerStats({ startDate, endDate, accountId });
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 月度汇总
router.get('/monthly/:month', (req, res) => {
  try {
    const { accountId, endDate } = req.query;
    const summary = db.getCustomerStatsMonthly(req.params.month, accountId, endDate);
    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 共享：以客户统计为源头，将国家客资 + 分配销售客户详情同步回日报（重算，清除统计外国家的残留拉群）
function syncToDailyReport(date, accountId, countryBreakdown, salesAssignments) {
  if (!date || !accountId) return

  // 空保护：既无客资又无分配销售时跳过同步，避免误清空日报已有的客资/拉群数据
  const hasBreakdown = Array.isArray(countryBreakdown) && countryBreakdown.some(cb => cb && cb.country)
  const hasAssign = Array.isArray(salesAssignments) && salesAssignments.some(sa => sa && Array.isArray(sa.customers) && sa.customers.some(c => c && c.country))
  if (!hasBreakdown && !hasAssign) return

  const existing = db.getDailyData(date, { accountId }) || { countries: {}, summary: '', optimize: '' }
  const countries = { ...(existing.countries || {}) }
  const emptyCountry = () => ({ budget: null, usdBudget: null, newCustomer: 0, grouped: null, groupEntries: [] })

  // 1. 国家客资 → 新客户数（以统计为准）
  const customerCountByCountry = {}
  if (Array.isArray(countryBreakdown)) {
    for (const cb of countryBreakdown) {
      if (cb.country) customerCountByCountry[cb.country] = cb.count || 0
    }
  }

  // 2. 分配销售客户详情 → 按国家聚合，写日报 grouped + groupEntries（拉群）
  const groupedByCountry = {}
  if (Array.isArray(salesAssignments)) {
    for (const sa of salesAssignments) {
      const customers = Array.isArray(sa.customers) ? sa.customers : []
      for (const c of customers) {
        if (!c || !c.country) continue
        if (!groupedByCountry[c.country]) groupedByCountry[c.country] = []
        groupedByCountry[c.country].push({ text: c.text || '', status: c.status || '' })
      }
    }
  }

  // 3. 统计涉及的全部国家 = 客资国家 ∪ 拉群国家
  const allStatCountries = new Set([...Object.keys(customerCountByCountry), ...Object.keys(groupedByCountry)])

  // 4. 对统计内的国家：重算客资、拉群；对统计外的国家：清空客资与拉群（保留费用等日报独有字段）
  for (const country of allStatCountries) {
    if (!countries[country]) countries[country] = emptyCountry()
    countries[country].newCustomer = customerCountByCountry[country] || 0
    const entries = groupedByCountry[country] || []
    countries[country].grouped = entries.length
    countries[country].groupEntries = entries
  }
  for (const country of Object.keys(countries)) {
    if (!allStatCountries.has(country)) {
      countries[country].newCustomer = 0
      countries[country].grouped = 0
      countries[country].groupEntries = []
    }
  }

  db.saveDailyData(date, { countries, summary: existing.summary || '', optimize: existing.optimize || '' }, { accountId })
}

// 从已保存的客户统计记录重新同步到日报（供「从统计同步」按钮复用，避免前端重复实现同步逻辑）
function syncStatToDaily(date, accountId) {
  if (!date || !accountId) return false
  const stat = db.findCustomerStatByDate(date, accountId)
  if (!stat) return false
  syncToDailyReport(date, accountId, stat.countryBreakdown, stat.salesAssignments)
  return true
}

// 清空日报里该账号所有国家的客资/拉群（删除统计记录时调用；保留费用等日报独有字段）
function clearDailyFromStat(date, accountId) {
  if (!date || !accountId) return
  const existing = db.getDailyData(date, { accountId }) || { countries: {}, summary: '', optimize: '' }
  const countries = { ...(existing.countries || {}) }
  for (const country of Object.keys(countries)) {
    countries[country].newCustomer = 0
    countries[country].grouped = 0
    countries[country].groupEntries = []
  }
  db.saveDailyData(date, { countries, summary: existing.summary || '', optimize: existing.optimize || '' }, { accountId })
}

// 手动触发同步（日报页「从统计同步」按钮）
router.post('/sync-to-daily', (req, res) => {
  try {
    const { date, accountId } = req.body || {}
    const ok = syncStatToDaily(date, accountId)
    emitDailyChanged(date, accountId, req.query.clientId || req.body.clientId || null)
    res.json({ success: true, synced: ok })
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 新增/覆盖（同日期+账号 upsert）
router.post('/', (req, res) => {
  try {
    const clientId = req.body.clientId || req.query.clientId || null
    const clean = { ...req.body }; delete clean.clientId
    const record = db.upsertCustomerStat(clean);
    const { date, accountId, countryBreakdown, salesAssignments } = req.body
    syncToDailyReport(date, accountId, countryBreakdown, salesAssignments)
    db.logOperation('customerStats.save', { date, accountId }, req.user);
    emitCustomerStatsChanged(date, accountId, clientId);
    emitDailyChanged(date, accountId, clientId);
    res.json({ success: true, data: record });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 修改（同日期+账号 upsert）
router.put('/:id', (req, res) => {
  try {
    const clientId = req.body.clientId || req.query.clientId || null
    const clean = { ...req.body }; delete clean.clientId
    const record = db.upsertCustomerStat({ ...clean, id: req.params.id });
    const { date, accountId, countryBreakdown, salesAssignments } = req.body
    syncToDailyReport(date, accountId, countryBreakdown, salesAssignments)
    emitCustomerStatsChanged(date, accountId, clientId);
    emitDailyChanged(date, accountId, clientId);
    res.json({ success: true, data: record });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 删除
router.delete('/:id', (req, res) => {
  try {
    const stat = db.getCustomerStat(req.params.id);
    db.deleteCustomerStat(req.params.id);
    // 删除统计记录 = 源头数据没了，同步清空日报里的客资/拉群
    if (stat) clearDailyFromStat(stat.date, stat.accountId);
    db.logOperation('customerStats.delete', { id: req.params.id }, req.user);
    emitCustomerStatsChanged(stat?.date || null, stat?.accountId || null, req.query.clientId || null);
    emitDailyChanged(stat?.date || null, stat?.accountId || null, req.query.clientId || null);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

module.exports = router;
