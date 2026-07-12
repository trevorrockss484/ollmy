const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取所有周计划
router.get('/weeks', (req, res) => {
  try { res.json({ success: true, data: db.getWeeks() }); }
  catch (e) { res.status(500).json({ success: false, error: "服务器内部错误" }); }
});

// 获取当前周配置
router.get('/current', (req, res) => {
  try { res.json({ success: true, data: db.getCurrentWeek() }); }
  catch (e) { res.status(500).json({ success: false, error: "服务器内部错误" }); }
});

// 获取指定周
router.get('/week/:id', (req, res) => {
  try {
    const weeks = db.getWeeks();
    const w = weeks.find(w => w.id == req.params.id);
    if (!w) return res.status(404).json({ success: false, error: '周计划不存在' });
    res.json({ success: true, data: w });
  } catch (e) { res.status(500).json({ success: false, error: "服务器内部错误" }); }
});

// 新增周计划
router.post('/week', (req, res) => {
  try {
    const { startDate, endDate } = req.body || {};
    if (db.hasOverlap({ weeks: db.getWeeks() }, startDate, endDate)) {
      return res.status(400).json({ success: false, error: '该日期范围与已有周重叠，不能重复创建' });
    }
    res.json({ success: true, data: db.addWeek(req.body) });
  } catch (e) { res.status(500).json({ success: false, error: "服务器内部错误" }); }
});

// 更新周计划
router.put('/week/:id', (req, res) => {
  try {
    const w = db.updateWeek(req.params.id, req.body);
    if (!w) return res.status(404).json({ success: false, error: '周计划不存在' });
    res.json({ success: true, data: w });
  } catch (e) { res.status(500).json({ success: false, error: "服务器内部错误" }); }
});

// 关闭周计划（软删除）
router.delete('/week/:id', (req, res) => {
  try { db.deleteWeek(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, error: "服务器内部错误" }); }
});

// 恢复周计划
router.put('/week/:id/restore', (req, res) => {
  try {
    const w = db.restoreWeek(req.params.id);
    if (!w) return res.status(404).json({ success: false, error: '周不存在' });
    res.json({ success: true, data: w });
  } catch (e) { res.status(500).json({ success: false, error: "服务器内部错误" }); }
});

// 永久删除周计划
router.delete('/week/:id/permanent', (req, res) => {
  try { db.permanentlyDeleteWeek(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ success: false, error: "服务器内部错误" }); }
});

// 切换到指定周
router.put('/current', (req, res) => {
  try {
    const id = db.setCurrentWeek(req.body.id);
    if (!id) return res.status(404).json({ success: false, error: '周计划不存在' });
    res.json({ success: true, data: db.getCurrentWeek() });
  } catch (e) { res.status(500).json({ success: false, error: "服务器内部错误" }); }
});

module.exports = router;
