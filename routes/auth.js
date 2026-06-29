const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const VALID_USER = process.env.PAN_USER || '15377581454';
// PAN_PASSWORD_HASH = SHA-256 hex of password. Generate with: node -e "console.log(require('crypto').createHash('sha256').update('yourpass').digest('hex'))"
const VALID_PASSWORD_HASH = process.env.PAN_PASSWORD_HASH || crypto.createHash('sha256').update('Pan18218040143').digest('hex');
const TOKEN_SECRET = process.env.PAN_TOKEN_SECRET || 'pan-secret-change-me';
const TOKEN_EXPIRY = 7 * 86400_000; // 7天

function signToken(username, timestamp) {
  const payload = username + ':' + timestamp;
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(payload + ':' + sig).toString('base64');
}

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const parts = decoded.split(':');
    // format: username:timestamp:signature
    if (parts.length < 3) return null;
    const sig = parts.pop();
    const timestamp = parts.pop();
    const username = parts.join(':');
    const payload = username + ':' + timestamp;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    if (Date.now() - Number(timestamp) > TOKEN_EXPIRY) return null;
    if (username !== VALID_USER) return null;
    return username;
  } catch { return null; }
}

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const passwordHash = crypto.createHash('sha256').update(password || '').digest('hex');
  if (username === VALID_USER && passwordHash === VALID_PASSWORD_HASH) {
    const now = Date.now();
    const token = signToken(username, now);
    return res.json({ success: true, data: { token, username } });
  }
  res.status(401).json({ success: false, error: '用户名或密码错误' });
});

// 验证token
router.post('/verify', (req, res) => {
  const { token } = req.body || {};
  if (token && verifyToken(token)) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: '未授权' });
});

// 导出 verifyToken 供中间件使用
router.verifyToken = verifyToken;

module.exports = router;
