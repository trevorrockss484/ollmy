const express = require('express');
const router = express.Router();

const VALID_PASSWORD = 'Pan18218040143';
const VALID_USER = '15377581454';

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === VALID_USER && password === VALID_PASSWORD) {
    const token = Buffer.from(username + ':' + Date.now()).toString('base64');
    return res.json({ success: true, data: { token, username } });
  }
  res.status(401).json({ success: false, error: '用户名或密码错误' });
});

// 验证token
router.post('/verify', (req, res) => {
  const { token } = req.body || {};
  if (token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const parts = decoded.split(':');
      if (parts[0] === VALID_USER && parts.length >= 2 && Date.now() - Number(parts[parts.length-1]) < 7 * 86400_000) {
        return res.json({ success: true });
      }
    } catch {}
  }
  res.status(401).json({ success: false, error: '未授权' });
});

module.exports = router;
