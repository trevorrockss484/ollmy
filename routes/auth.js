const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const db = require('../database/db');

const TOKEN_SECRET = process.env.PAN_TOKEN_SECRET || 'pan-secret-change-me';
const TOKEN_EXPIRY = 7 * 86400_000; // 7天

// 首次启动种子管理员
db.seedDefaultRoles()

function signToken(username, role, timestamp) {
  const payload = username + ':' + role + ':' + timestamp;
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(payload + ':' + sig).toString('base64');
}

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const parts = decoded.split(':');
    if (parts.length < 4) return null;
    const sig = parts.pop();
    const timestamp = parts.pop();
    const role = parts.pop();
    const username = parts.join(':');
    const payload = username + ':' + role + ':' + timestamp;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    if (Date.now() - Number(timestamp) > TOKEN_EXPIRY) return null;
    // 验证用户存在于 DB 且角色存在
    const user = db.getUserByUsername(username);
    if (!user || user.role !== role) return null;
    const roleObj = db.getRoleByName(role);
    if (!roleObj) return null;
    return { username, role, menus: roleObj.menus || [] };
  } catch { return null; }
}

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const passwordHash = crypto.createHash('sha256').update(password || '').digest('hex');
  const user = db.getUserByUsername(username);
  if (user && passwordHash === user.passwordHash) {
    const now = Date.now();
    const token = signToken(username, user.role, now);
    const roleObj = db.getRoleByName(user.role);
    return res.json({ success: true, data: { token, username, role: user.role, displayName: user.displayName, menus: roleObj ? roleObj.menus : [] } });
  }
  res.status(401).json({ success: false, error: '用户名或密码错误' });
});

// 验证token
router.post('/verify', (req, res) => {
  const { token } = req.body || {};
  const result = token ? verifyToken(token) : null;
  if (result) {
    return res.json({ success: true, data: { username: result.username, role: result.role, menus: result.menus } });
  }
  res.status(401).json({ success: false, error: '未授权' });
});

// 导出 verifyToken 供中间件使用
router.verifyToken = verifyToken;

module.exports = router;
