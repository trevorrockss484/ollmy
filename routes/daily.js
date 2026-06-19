const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取日报
router.get('/:date?', (req, res) => {
  try {
    if (req.params.date) {
      const record = db.getDailyData(req.params.date);
      if (!record) return res.json({ success: true, data: null });
      return res.json({ success: true, data: record });
    }
    const all = db.getAllDailyData(req.query);
    res.json({ success: true, data: all });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 查询日报（支持日期范围和筛选）
router.get('/query/list', (req, res) => {
  try {
    const { startDate, endDate, country } = req.query;
    const all = db.getAllDailyData({ startDate, endDate, country });
    res.json({ success: true, data: all });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 保存日报
router.post('/:date', (req, res) => {
  try {
    const record = db.saveDailyData(req.params.date, req.body);
    res.json({ success: true, data: record });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 删除日报
router.delete('/:date', (req, res) => {
  try {
    db.deleteDailyData(req.params.date);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
