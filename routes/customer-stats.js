const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bus = require('../database/events');

function emitCustomerStatsChanged(date, accountId, clientId) {
  bus.emit('customer-stats-changed', { date: date || null, accountId: accountId || null, clientId: clientId || null });
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

// 共享：将国家客资同步回日报
function syncToDailyReport(date, accountId, countryBreakdown) {
  if (!date || !accountId || !Array.isArray(countryBreakdown) || !countryBreakdown.length) return
  const existing = db.getDailyData(date, { accountId }) || { countries: {}, summary: '', optimize: '' }
  const countries = { ...(existing.countries || {}) }
  for (const cb of countryBreakdown) {
    if (cb.country && cb.count > 0) {
      if (!countries[cb.country]) countries[cb.country] = { budget: null, usdBudget: null, newCustomer: 0, grouped: null, groupEntries: [] }
      countries[cb.country].newCustomer = cb.count || 0
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
    const { date, accountId, countryBreakdown } = req.body
    syncToDailyReport(date, accountId, countryBreakdown)
    db.logOperation('customerStats.save', { date, accountId }, req.user);
    emitCustomerStatsChanged(date, accountId, clientId);
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
    const { date, accountId, countryBreakdown } = req.body
    syncToDailyReport(date, accountId, countryBreakdown)
    emitCustomerStatsChanged(date, accountId, clientId);
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
