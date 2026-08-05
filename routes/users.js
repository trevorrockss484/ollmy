const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 管理员中间件
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '需要管理员权限' });
  }
  next();
}

router.use(requireAdmin);

// 用户列表
router.get('/', (req, res) => {
  try {
    const users = db.getUsers().map(u => ({ id: u.id, username: u.username, role: u.role, displayName: u.displayName, enabled: u.enabled, createdAt: u.createdAt }));
    res.json({ success: true, data: users });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 新增用户
router.post('/', (req, res) => {
  try {
    const { username, password, role, displayName } = req.body || {};
    if (!username || !password) return res.json({ success: false, error: '用户名和密码不能为空' });
    const existing = db.getUserByUsername(username);
    if (existing) return res.json({ success: false, error: '用户名已存在' });
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const user = db.addUser({ username, passwordHash, role: role || 'staff', displayName: displayName || username, enabled: true });
    res.json({ success: true, data: { id: user.id, username: user.username, role: user.role, displayName: user.displayName, enabled: user.enabled } });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 更新用户
router.put('/:id', (req, res) => {
  try {
    const { password, role, displayName, enabled } = req.body || {};
    const updates = {};
    if (password) updates.passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (role !== undefined) updates.role = role;
    if (displayName !== undefined) updates.displayName = displayName;
    if (enabled !== undefined) updates.enabled = enabled;
    const user = db.updateUser(req.params.id, updates);
    if (!user) return res.json({ success: false, error: '用户不存在' });
    res.json({ success: true, data: { id: user.id, username: user.username, role: user.role, displayName: user.displayName, enabled: user.enabled } });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 删除用户
router.delete('/:id', (req, res) => {
  try {
    const user = db.getUserByUsername ? null : null;
    const u = db.getUsers().find(u => u.id == req.params.id);
    if (u && u.role === 'admin') {
      const admins = db.getUsers().filter(x => x.role === 'admin' && x.enabled !== false);
      if (admins.length <= 1) return res.json({ success: false, error: '不能删除最后一个管理员' });
    }
    db.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

module.exports = router;
