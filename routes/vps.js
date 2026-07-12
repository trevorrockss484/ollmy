const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取所有VPS
router.get('/', (req, res) => {
  try {
    const list = db.getVpsList();
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 添加VPS
router.post('/', (req, res) => {
  try {
    const vps = db.addVps(req.body);
    res.json({ success: true, data: vps });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 更新VPS
router.put('/:id', (req, res) => {
  try {
    const vps = db.updateVps(req.params.id, req.body);
    if (!vps) return res.status(404).json({ success: false, error: 'VPS不存在' });
    res.json({ success: true, data: vps });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 删除VPS
router.delete('/:id', (req, res) => {
  try {
    db.deleteVps(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

module.exports = router;
