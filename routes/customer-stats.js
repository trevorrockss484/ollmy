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

// 共享：将国家客资 + 分配销售客户详情同步回日报
function syncToDailyReport(date, accountId, countryBreakdown, salesAssignments) {
  if (!date || !accountId) return
  const existing = db.getDailyData(date, { accountId }) || { countries: {}, summary: '', optimize: '' }
  const countries = { ...(existing.countries || {}) }
  const emptyCountry = () => ({ budget: null, usdBudget: null, newCustomer: 0, grouped: null, groupEntries: [] })

  // 1. 国家客资 → 日报 newCustomer
  if (Array.isArray(countryBreakdown) && countryBreakdown.length) {
    for (const cb of countryBreakdown) {
      if (cb.country && cb.count > 0) {
        if (!countries[cb.country]) countries[cb.country] = emptyCountry()
        countries[cb.country].newCustomer = cb.count || 0
      }
    }
  }

  // 2. 分配销售客户详情 → 按国家聚合，写日报 grouped + groupEntries（拉群）
  if (Array.isArray(salesAssignments) && salesAssignments.length) {
    const byCountry = {}
    for (const sa of salesAssignments) {
      const customers = Array.isArray(sa.customers) ? sa.customers : []
      for (const c of customers) {
        if (!c || !c.country) continue
        if (!byCountry[c.country]) byCountry[c.country] = []
        byCountry[c.country].push({ text: c.text || '', status: c.status || '' })
      }
    }
    for (const [country, entries] of Object.entries(byCountry)) {
      if (!countries[country]) countries[country] = emptyCountry()
      countries[country].grouped = entries.length
      countries[country].groupEntries = entries
    }
  }

  db.saveDailyData(date, { countries, summary: existing.summary || '', optimize: existing.optimize || '' }, { accountId })
}

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
    db.logOperation('customerStats.delete', { id: req.params.id }, req.user);
    emitCustomerStatsChanged(stat?.date || null, stat?.accountId || null, req.query.clientId || null);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

module.exports = router;
