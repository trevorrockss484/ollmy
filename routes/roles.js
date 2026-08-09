const express = require('express');
const router = express.Router();
const db = require('../database/db');

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '需要管理员权限' });
  }
  next();
}

router.use(requireAdmin);

// 角色列表
router.get('/', (req, res) => {
  try {
    const roles = db.getRoles().map(r => ({ id: r.id, name: r.name, displayName: r.displayName, menus: r.menus, enabled: r.enabled, createdAt: r.createdAt }));
    res.json({ success: true, data: roles });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 新增角色
router.post('/', (req, res) => {
  try {
    const { name, displayName, menus } = req.body || {};
    if (!name) return res.json({ success: false, error: '角色名称不能为空' });
    const existing = db.getRoleByName(name);
    if (existing) return res.json({ success: false, error: '角色名已存在' });
    const role = db.addRole({ name, displayName: displayName || name, menus: menus || [], enabled: true });
    db.logOperation('roles.add', { name: role.name }, req.user);
    res.json({ success: true, data: role });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 更新角色
router.put('/:id', (req, res) => {
  try {
    const { displayName, menus, enabled } = req.body || {};
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (menus !== undefined) updates.menus = menus;
    if (enabled !== undefined) updates.enabled = enabled;
    const role = db.updateRole(req.params.id, updates);
    if (!role) return res.json({ success: false, error: '角色不存在' });
    db.logOperation('roles.update', { name: role.name }, req.user);
    res.json({ success: true, data: role });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 删除角色
router.delete('/:id', (req, res) => {
  try {
    const role = db.getRoles().find(r => r.id == req.params.id);
    if (!role) return res.json({ success: false, error: '角色不存在' });
    if (role.name === 'admin') return res.json({ success: false, error: '不能删除管理员角色' });
    // 检查是否还有用户使用此角色
    const usersWithRole = db.getUsers().filter(u => u.role === role.name && u.enabled !== false);
    if (usersWithRole.length) return res.json({ success: false, error: `还有 ${usersWithRole.length} 个用户使用此角色，请先更换他们的角色` });
    db.deleteRole(req.params.id);
    db.logOperation('roles.delete', { name: role.name }, req.user);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

module.exports = router;
