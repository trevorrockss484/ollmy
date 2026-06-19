const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取所有提醒
router.get('/', (req, res) => {
  try {
    const reminders = db.getReminders();
    res.json({ success: true, data: reminders });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 添加提醒
router.post('/', (req, res) => {
  try {
    const reminder = db.addReminder(req.body);
    res.json({ success: true, data: reminder });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 更新提醒
router.put('/:id', (req, res) => {
  try {
    const reminder = db.updateReminder(Number(req.params.id), req.body);
    if (!reminder) return res.status(404).json({ success: false, error: '提醒不存在' });
    res.json({ success: true, data: reminder });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 删除提醒
router.delete('/:id', (req, res) => {
  try {
    db.deleteReminder(Number(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
