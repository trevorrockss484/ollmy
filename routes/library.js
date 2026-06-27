const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const db = require('../database/db');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'library');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeName = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    cb(null, Date.now() + '_' + safeName + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(doc|docx|pdf|txt|xlsx?|pptx?|zip|rar|7z)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持文档格式: doc, docx, pdf, txt, xls, ppt, zip 等'));
    }
  }
});

router.get('/', (req, res) => {
  try {
    res.json({ success: true, data: db.getLibrary() });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

router.post('/upload', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: '请选择文件' });
    }
    const name = req.body.name || '';
    let tags = [];
    try { tags = JSON.parse(req.body.tags || '[]'); } catch { tags = []; }

    const items = [];
    for (const file of req.files) {
      const docName = req.files.length > 1 ? (name + ' ' + (items.length + 1)) : (name || path.basename(file.originalname, path.extname(file.originalname)));
      const item = db.addLibraryItem({
        name: docName.trim(),
        fileName: file.filename,
        originalName: file.originalname,
        fileSize: file.size,
        tags
      });
      items.push(item);
    }
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 预览 — docx转HTML显示，.doc提示下载，PDF/txt等inline
router.get('/:id/preview', async (req, res) => {
  try {
    const item = db.getLibraryItem(Number(req.params.id));
    if (!item) return res.status(404).send('文件不存在');
    const filePath = path.join(UPLOAD_DIR, item.fileName);
    if (!fs.existsSync(filePath)) return res.status(404).send('文件不存在');
    const ext = path.extname(item.fileName).toLowerCase();

    if (ext === '.docx') {
      const result = await mammoth.convertToHtml({ path: filePath });
      if (!result || !result.value) {
        return res.status(500).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:PingFang SC,sans-serif;max-width:500px;margin:80px auto;text-align:center;color:#6b7280;line-height:2;}</style></head><body><div style="font-size:64px;">⚠️</div><h2>文档转换失败</h2><p>该 .docx 文件可能已损坏或格式不兼容</p></body></html>`);
      }
      // sanitize: strip script/event handlers for iframe safety
      let html = result.value;
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
      html = html.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
      const page = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:PingFang SC,Microsoft YaHei,sans-serif;max-width:860px;margin:0 auto;padding:32px 24px;line-height:1.9;color:#333;font-size:15px;}img{max-width:100%;}h1,h2,h3{color:#1a1a1a;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ddd;padding:8px 12px;}</style></head><body>${html}</body></html>`;
      return res.type('html').send(page);
    }

    if (ext === '.doc') {
      return res.type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:PingFang SC,Microsoft YaHei,sans-serif;max-width:500px;margin:80px auto;text-align:center;color:#6b7280;line-height:2;}</style></head><body><div style="font-size:64px;">📄</div><h2 style="color:#374151;">${item.name}</h2><p>.doc 旧格式不支持在线预览</p><p style="font-size:13px;">${item.originalName} · ${(item.fileSize/1024).toFixed(0)} KB</p><a href="/api/library/${item.id}/download" style="display:inline-block;margin-top:8px;padding:10px 32px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">⬇ 下载查看</a></body></html>`);
    }

    // PDF/txt等 inline 在浏览器打开
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

router.get('/:id/download', (req, res) => {
  try {
    const item = db.getLibraryItem(Number(req.params.id));
    if (!item) return res.status(404).json({ success: false, error: '文件不存在' });
    const filePath = path.join(UPLOAD_DIR, item.fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: '文件不存在' });
    const ext = path.extname(item.fileName);
    const dlName = (item.name || item.originalName || 'document') + ext;
    res.download(filePath, dlName);
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

router.put('/:id', (req, res) => {
  try {
    const item = db.updateLibraryItem(Number(req.params.id), req.body);
    if (!item) return res.status(404).json({ success: false, error: '文件不存在' });
    res.json({ success: true, data: item });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const item = db.deleteLibraryItem(Number(req.params.id));
    if (!item) return res.status(404).json({ success: false, error: '文件不存在' });
    const filePath = path.join(UPLOAD_DIR, item.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, error: '文件大小不能超过100MB' });
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) return res.status(400).json({ success: false, error: err.message });
  next();
});

module.exports = router;
