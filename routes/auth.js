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
    const perms = roleObj.permissions || { edit: false, add: false, delete: false };
    const perPage = roleObj.perPagePerms || {};
    const tabAccess = roleObj.tabAccess || { assets: true, scripts: true, prompts: true };
    return { username, role, menus: roleObj.menus || [], permissions: perms, perPagePerms: perPage, tabAccess };
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
    const permissions = roleObj ? (roleObj.permissions || { edit: false, add: false, delete: false }) : { edit: false, add: false, delete: false };
    const perPagePerms = roleObj ? (roleObj.perPagePerms || {}) : {};
    const tabAccess = roleObj ? (roleObj.tabAccess || { assets: true, scripts: true, prompts: true }) : { assets: true, scripts: true, prompts: true };
    return res.json({ success: true, data: { token, username, role: user.role, displayName: user.displayName, menus: roleObj ? roleObj.menus : [], permissions, perPagePerms, tabAccess } });
  }
  res.status(401).json({ success: false, error: '用户名或密码错误' });
});

// 验证token
router.post('/verify', (req, res) => {
  const { token } = req.body || {};
  const result = token ? verifyToken(token) : null;
  if (result) {
    return res.json({ success: true, data: { username: result.username, role: result.role, menus: result.menus, permissions: result.permissions, perPagePerms: result.perPagePerms, tabAccess: result.tabAccess } });
  }
  res.status(401).json({ success: false, error: '未授权' });
});

const fs = require('fs');
const path = require('path');

// 成本锁密码持久化
const PIN_FILE = path.join(__dirname, '..', 'database', 'data', 'cost-pin.txt');
function loadCostPin() {
  try { return fs.readFileSync(PIN_FILE, 'utf8').trim() || null } catch { return null }
}
function saveCostPin(pin) {
  const dir = path.dirname(PIN_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PIN_FILE, pin, 'utf8');
}
let COST_PIN = loadCostPin() || process.env.PAN_COST_PIN || 'default-change-me';

// 系统管理：更新成本锁密码
router.put('/update-cost-pin', (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ success: false, error: '需要管理员权限' });
  if (!req.body.pin) return res.json({ success: false, error: '密码不能为空' });
  COST_PIN = req.body.pin;
  saveCostPin(req.body.pin);
  db.logOperation('system.updateCostPin', {}, req.user);
  res.json({ success: true });
});

// 验证成本锁密码
router.post('/verify-pin', (req, res) => {
  if (req.body.pin === COST_PIN) return res.json({ success: true })
  res.json({ success: false })
});

// 导出 verifyToken 供中间件使用
router.verifyToken = verifyToken;

module.exports = router;
