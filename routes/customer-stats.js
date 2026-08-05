const express = require('express');
const router = express.Router();
const db = require('../database/db');

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
    const { accountId } = req.query;
    const summary = db.getCustomerStatsMonthly(req.params.month, accountId);
    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 新增/覆盖（同日期+账号 upsert）
router.post('/', (req, res) => {
  try {
    const record = db.upsertCustomerStat(req.body);

    // 双向同步：把国家客资写回报日报
    const { date, accountId, countryBreakdown } = req.body;
    if (date && countryBreakdown && Array.isArray(countryBreakdown) && countryBreakdown.length) {
      const existing = db.getDailyData(date, { accountId }) || { countries: {}, summary: '', optimize: '' };
      const countries = { ...(existing.countries || {}) };
      for (const cb of countryBreakdown) {
        if (cb.country && cb.count > 0) {
          if (!countries[cb.country]) countries[cb.country] = { budget: null, usdBudget: null, newCustomer: 0, grouped: null, groupEntries: [] };
          countries[cb.country].newCustomer = cb.count || 0;
        }
      }
      db.saveDailyData(date, { countries, summary: existing.summary || '', optimize: existing.optimize || '' }, { accountId });
    }

    res.json({ success: true, data: record });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 修改（同日期+账号 upsert）
router.put('/:id', (req, res) => {
  try {
    const record = db.upsertCustomerStat({ ...req.body, id: req.params.id });
    res.json({ success: true, data: record });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 删除
router.delete('/:id', (req, res) => {
  try {
    db.deleteCustomerStat(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

module.exports = router;
