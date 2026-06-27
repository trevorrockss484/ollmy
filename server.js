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
  // 资产/资料库下载和静态文件不需要认证
  if (req.path.startsWith('/assets/') && req.path.endsWith('/download')) return next();
  if (req.path.startsWith('/library/') && (req.path.endsWith('/download') || req.path.endsWith('/preview'))) return next();
  if (req.path.startsWith('/uploads/')) return next();
  const token = req.headers['x-auth-token'] || '';
  if (token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const parts = decoded.split(':');
      // format: username:timestamp，过期 7 天，需校验用户名
      if (parts.length >= 2 && parts[0] === '15377581454' && Date.now() - Number(parts[parts.length-1]) < 7 * 86400_000) {
        return next();
      }
    } catch {}
  }
  res.status(401).json({ success: false, error: '未登录' });
});

// API 路由
app.use('/api/config', require('./routes/config'));
app.use('/api/daily', require('./routes/daily'));
// reminders 路由需 db 层支持（暂未实现，禁用）
// app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/vps', require('./routes/vps'));
app.use('/api/summary', require('./routes/summary'));
app.use('/api/prompts', require('./routes/prompts'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/library', require('./routes/library'));

// 静态资源 - 上传文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 静态文件
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return;
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
    res.status(500).json({ success: false, error: "服务器内部错误" });
  } else {
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Pan助手 → http://localhost:${PORT}`);
});
