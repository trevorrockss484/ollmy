const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取月度/周度汇总
router.get('/monthly/:month', (req, res) => {
  try {
    const month = req.params.month; // 格式: 2025-06
    const all = db.getAllDailyData();

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
      const fb = d.fb || {};
      summary.fbBudget += fb.budget || 0;
      summary.fbCustomer += fb.newCustomer || 0;
      summary.fbGrouped += fb.grouped || 0;
      summary.fbCatNoReply += fb.catNoReply || 0;
      summary.fbMsgIgnore += fb.msgIgnore || 0;
      summary.fbLowBudget += fb.lowBudget || 0;
      summary.fbCompetitor += fb.competitor || 0;
      summary.fbHarass += fb.harass || 0;
      summary.fbVisitPending += fb.visitPending || 0;
      summary.daily[date] = {
        country: d.country,
        fbBudget: fb.budget || 0,
        fbGrouped: fb.grouped || 0,
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
    const { startDate, endDate } = req.query;
    const all = db.getAllDailyData({ startDate, endDate });
    const dates = Object.keys(all).sort();

    let summary = {
      days: dates.length,
      fbBudget: 0, fbCustomer: 0, fbGrouped: 0,
      totalBudget: 0
    };

    dates.forEach(date => {
      const d = all[date];
      const fb = d.fb || {};
      summary.fbBudget += fb.budget || 0;
      summary.fbCustomer += fb.newCustomer || 0;
      summary.fbGrouped += fb.grouped || 0;
    });

    summary.totalBudget = summary.fbBudget;

    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

module.exports = router;
