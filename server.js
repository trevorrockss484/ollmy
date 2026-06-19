const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3456;

// body-parser
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ===== 所有 /api/ 路由统一设置JSON响应头 =====
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 认证路由（无需验证）
app.use('/api/auth', require('./routes/auth'));

// API 认证中间件
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login' || req.path === '/auth/verify') return next();
  const token = req.headers['x-auth-token'] || '';
  if (token) {
    const decoded = Buffer.from(token, 'base64').toString();
    if (decoded.includes(':')) return next();
  }
  res.status(401).json({ success: false, error: '未登录' });
});

// API 路由
app.use('/api/config', require('./routes/config'));
app.use('/api/daily', require('./routes/daily'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/vps', require('./routes/vps'));
app.use('/api/summary', require('./routes/summary'));

// 静态文件
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return;
  if (req.path.startsWith('/assets/')) return res.status(404).end();
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(distIndex);
  }
  res.status(200).send('Pan助手');
});

// 未匹配API返回404 JSON
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ success: false, error: err.message });
  } else {
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Pan助手 → http://localhost:${PORT}`);
});
