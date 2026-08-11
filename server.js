const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3456;

// ===== 数据自动备份 =====
const DATA_DIR = path.join(__dirname, 'database');
const BACKUP_DIR = path.join(__dirname, 'backup');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const BACKUP_INTERVAL = 60 * 60 * 1000; // 每小时备份

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function backupData() {
  try {
    ensureBackupDir();
    if (!fs.existsSync(DATA_FILE)) return;
    const now = new Date();
    const stamp = now.getFullYear() + '-' +
      String(now.getMonth()+1).padStart(2,'0') + '-' +
      String(now.getDate()).padStart(2,'0') + '_' +
      String(now.getHours()).padStart(2,'0') + '-' +
      String(now.getMinutes()).padStart(2,'0');
    const dest = path.join(BACKUP_DIR, 'data_' + stamp + '.json');
    fs.copyFileSync(DATA_FILE, dest);
    // 保留最近 48 个备份（2天）
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('data_')).sort();
    while (files.length > 48) {
      fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
    }
  } catch (e) {
    console.error('数据备份失败:', e.message);
  }
}

// 启动时立即备份一次，之后每小时
backupData();
setInterval(backupData, BACKUP_INTERVAL);
console.log('✅ 数据自动备份已启用（每小时，最多保留48份）');

// HTML 转义（防 XSS）
function htmlEscape(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// body-parser
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ===== 所有 /api/ 路由统一设置JSON响应头（跳过非JSON端点） =====
app.use('/api', (req, res, next) => {
  const path = req.path.toLowerCase();
  if (path.includes('/download') || path.includes('/preview') || path.includes('/batch-download') || path.includes('/content')) {
    return next();
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 认证路由（需先加载引用，供中间件使用 verifyToken）
const authRoutes = require('./routes/auth');

// API 认证中间件（必须在路由注册前执行，确保 req.user 先设置）
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login' || req.path === '/auth/verify') return next();
  const token = req.headers['x-auth-token'] || req.query.token || '';
  const result = token ? authRoutes.verifyToken(token) : null;
  if (result) {
    req.user = result; // { username, role, menus, permissions, perPagePerms, tabAccess }
    return next();
  }
  res.status(401).json({ success: false, error: '未登录' });
});

// 认证路由（注册在中间件之后，确保 update-cost-pin 等路由能拿到 req.user）
app.use('/api/auth', authRoutes);

// 写入权限中间件
function checkPerm(req, res, next) {
  const method = req.method.toUpperCase();
  if (method === 'GET') return next();
  if (!req.user) return next();
  if (req.user.role === 'admin') return next();
  const path = req.path.toLowerCase();
  if (path.startsWith('/logs') || path.startsWith('/system')) return next();
  // 逐页面权限：先匹配 perPagePerms，fallback 到全局 permissions
  const perPage = req.user.perPagePerms || {};
  const globalPerms = req.user.permissions || {};
  // 尝试匹配最长的路径前缀
  const matched = Object.keys(perPage).filter(k => path.startsWith(k)).sort((a,b) => b.length - a.length)[0];
  const perms = matched ? perPage[matched] : globalPerms;
  if (method === 'POST' && !perms.add) return res.status(403).json({ success: false, error: '无新增权限，仅可查看' });
  if (method === 'PUT' && !perms.edit) return res.status(403).json({ success: false, error: '无编辑权限，仅可查看' });
  if (method === 'DELETE' && !perms.delete) return res.status(403).json({ success: false, error: '无删除权限，仅可查看' });
  next();
}
app.use('/api', checkPerm);

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
app.use('/api/tools', require('./routes/tools'));
app.use('/api/customer-stats', require('./routes/customer-stats'));
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/sales-persons', require('./routes/sales-persons'));
app.use('/api/scripts', require('./routes/scripts'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/system', require('./routes/system'));

// ===== 分享预览页（微信/社交 OG 卡片） =====
const ogPage = ({ title, image, desc, type, width, height }) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta property="og:title" content="${htmlEscape(title)}">
<meta property="og:image" content="${htmlEscape(image)}">
<meta property="og:description" content="${htmlEscape(desc)}">
<meta property="og:type" content="${type === 'video' ? 'video' : 'image'}">
${type === 'video' ? '<meta property="og:video" content="' + htmlEscape(image) + '">' : ''}
${width && height ? '<meta property="og:image:width" content="' + htmlEscape(String(width)) + '"><meta property="og:image:height" content="' + htmlEscape(String(height)) + '">' : ''}
<title>${htmlEscape(title)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#0a0a0a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'PingFang SC','Microsoft YaHei',sans-serif;}
  .card{max-width:680px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.3);}
  .card img,.card video{width:100%;display:block;max-height:70vh;object-fit:contain;background:#000;}
  .card-body{padding:20px 24px;}
  .card-body h2{font-size:20px;font-weight:700;color:#111827;margin-bottom:6px;}
  .card-body p{font-size:14px;color:#6b7280;line-height:1.6;}
  .card-body .meta{margin-top:8px;font-size:12px;color:#9ca3af;}
</style>
</head>
<body>
<div class="card">
  ${type === 'video'
    ? '<video src="' + htmlEscape(image) + '" controls autoplay poster=""/>'
    : '<img src="' + htmlEscape(image) + '" alt="' + htmlEscape(title) + '"/>'}
  <div class="card-body">
    <h2>${htmlEscape(title)}</h2>
    <p>${htmlEscape(desc)}</p>
    <div class="meta">${htmlEscape(String(width))}×${htmlEscape(String(height))} · 来自 Pan助手素材库</div>
  </div>
</div>
</body>
</html>`;

// 图片分享页
app.get('/share/image/:id', (req, res) => {
  try {
    const db = require('./database/db');
    const item = db.getCompressedItem(Number(req.params.id));
    if (!item || item.type === 'video') return res.status(404).send('素材不存在');
    const imgUrl = '/uploads/compress/saved/' + encodeURIComponent(item.compressedName);
    const title = item.name || item.originalName || '分享图片';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(ogPage({
      title,
      image: req.protocol + '://' + req.get('host') + imgUrl,
      desc: (item.width||0) + '×' + (item.height||0) + ' · ' + (item.format||'jpg').toUpperCase() + ' · ' + ((item.compressedSize||0)/1024).toFixed(1) + 'KB',
      type: 'image',
      width: item.width, height: item.height,
    }));
  } catch (e) { res.status(500).send('服务器错误'); }
});

// 视频分享页
app.get('/share/video/:id', (req, res) => {
  try {
    const db = require('./database/db');
    const item = db.getCompressedItem(Number(req.params.id));
    if (!item || item.type !== 'video') return res.status(404).send('素材不存在');
    const videoUrl = '/uploads/video/library/' + encodeURIComponent(item.compressedName);
    const title = item.name || item.originalName || '分享视频';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(ogPage({
      title,
      image: '', type: 'video',
      desc: (item.width||0) + '×' + (item.height||0) + ' · ' + ((item.compressedSize||0)/1024/1024).toFixed(1) + 'MB · ' + Math.floor((item.duration||0)/60) + '分' + Math.floor((item.duration||0)%60) + '秒',
      width: item.width, height: item.height,
    }).replace('poster=""', 'poster="' + (item.coverUrl ? '/uploads/video/covers/' + encodeURIComponent(item.coverName||'') : '') + '"'));
  } catch (e) { res.status(500).send('服务器错误'); }
});

// 静态资源 - 上传文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 静态文件
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// 未匹配API返回404 JSON
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

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
