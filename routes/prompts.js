const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取全部提示词
router.get('/', (req, res) => {
  try {
    const list = db.getPrompts();
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 获取单条
router.get('/:id', (req, res) => {
  try {
    const p = db.getPrompt(req.params.id);
    if (!p) return res.status(404).json({ success: false, error: '提示词不存在' });
    res.json({ success: true, data: p });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 新增
router.post('/', (req, res) => {
  try {
    const p = db.addPrompt(req.body);
    res.json({ success: true, data: p });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 编辑
router.put('/:id', (req, res) => {
  try {
    const p = db.updatePrompt(req.params.id, req.body);
    if (!p) return res.status(404).json({ success: false, error: '提示词不存在' });
    res.json({ success: true, data: p });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 删除
router.delete('/:id', (req, res) => {
  try {
    db.deletePrompt(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 排序
router.put('/reorder/batch', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids is required' });
    db.reorderPrompts(ids);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

module.exports = router;
