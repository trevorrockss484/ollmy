const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 查询日报（放前面，避免被 /:date 误匹配）
router.get('/query/list', (req, res) => {
  try {
    const { startDate, endDate, country, accountId } = req.query;
    const all = db.getAllDailyData({ startDate, endDate, country, accountId });
    res.json({ success: true, data: all });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

router.get('/accounts/list', (req, res) => {
  try {
    res.json({ success: true, data: db.getAccounts() });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 获取单日报
router.get('/:date', (req, res) => {
  try {
    const record = db.getDailyData(req.params.date, { accountId: req.query.accountId });
    if (!record) return res.json({ success: true, data: null });
    res.json({ success: true, data: record });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 保存日报
router.post('/:date', (req, res) => {
  try {
    const record = db.saveDailyData(req.params.date, req.body, { accountId: req.query.accountId });
    res.json({ success: true, data: record });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 删除日报
router.delete('/:date', (req, res) => {
  try {
    db.deleteDailyData(req.params.date);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

module.exports = router;
