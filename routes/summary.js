const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取月度/周度汇总
router.get('/monthly/:month', (req, res) => {
  try {
    const month = req.params.month; // 格式: 2025-06
    const { accountId } = req.query;
    const all = db.getAllDailyData(accountId ? { accountId } : {});

    const dates = Object.keys(all).filter(d => d.startsWith(month)).sort();

    let summary = {
      month,
      days: dates.length,
      fbBudget: 0, fbCustomer: 0, fbGrouped: 0,
      fbCatNoReply: 0, fbMsgIgnore: 0, fbLowBudget: 0,
      fbCompetitor: 0, fbHarass: 0, fbVisitPending: 0,
      daily: {}
    };

    dates.forEach(date => {
      const d = all[date];
      // 新格式：遍历所有国家汇总
      const countries = d.countries || {};
      let dayBudget = 0, dayGrouped = 0;
      Object.values(countries).forEach(c => {
        summary.fbBudget += c.budget || 0;
        summary.fbCustomer += c.newCustomer || 0;
        summary.fbGrouped += c.grouped || 0;
        summary.fbCatNoReply += c.catNoReply || 0;
        summary.fbMsgIgnore += c.msgIgnore || 0;
        summary.fbLowBudget += c.lowBudget || 0;
        summary.fbCompetitor += c.competitor || 0;
        summary.fbHarass += c.harass || 0;
        summary.fbVisitPending += c.visitPending || 0;
        dayBudget += c.budget || 0;
        dayGrouped += c.grouped || 0;
      });
      summary.daily[date] = {
        countries: Object.keys(countries),
        fbBudget: dayBudget,
        fbGrouped: dayGrouped,
      };
    });

    summary.totalBudget = summary.fbBudget;
    summary.fbAvgCost = summary.fbCustomer > 0 ? (summary.fbBudget / summary.fbCustomer).toFixed(2) : 0;

    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 获取周汇总
router.get('/weekly', (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    const all = db.getAllDailyData({ startDate, endDate, accountId });
    const dates = Object.keys(all).sort();

    let summary = {
      days: dates.length,
      fbBudget: 0, fbCustomer: 0, fbGrouped: 0,
      totalBudget: 0
    };

    dates.forEach(date => {
      const d = all[date];
      const countries = d.countries || {};
      Object.values(countries).forEach(c => {
        summary.fbBudget += c.budget || 0;
        summary.fbCustomer += c.newCustomer || 0;
        summary.fbGrouped += c.grouped || 0;
      });
    });

    summary.totalBudget = summary.fbBudget;

    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

module.exports = router;
