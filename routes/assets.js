const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');

// 上传目录
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'assets', 'original');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 判断文件媒体类型
function getMediaType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const videoExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv'];
  const audioExts = ['.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a', '.wma'];
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  return 'image';
}

// multer配置：原样存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeName = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    const fileName = Date.now() + '_' + safeName + ext;
    cb(null, fileName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB（视频需要更大空间）
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|bmp|tiff?|mp4|mov|avi|webm|mkv|flv|wmv|mp3|wav|aac|ogg|flac|m4a|wma)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持图片/视频/音频格式: JPG, PNG, GIF, MP4, MOV, MP3, WAV 等'));
    }
  }
});

// 列表
router.get('/', (req, res) => {
  try {
    const type = req.query.type || '';
    const list = db.getAssets(type || null);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 上传
router.post('/upload', upload.array('files', 20), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: '请选择文件' });
    }
    const name = req.body.name || '';
    const type = req.body.type || 'character';
    let tags = [];
    try { tags = JSON.parse(req.body.tags || '[]'); } catch { tags = []; }

    const assets = [];
    for (const file of req.files) {
      // 多文件时自动加编号
      const assetName = req.files.length > 1
        ? (name + ' ' + (assets.length + 1))
        : (name || path.basename(file.originalname, path.extname(file.originalname)));

      const asset = db.addAsset({
        name: assetName.trim(),
        type,
        fileName: file.filename,
        originalName: file.originalname,
        fileSize: file.size,
        mediaType: getMediaType(file.originalname),
        gridOverlay: type === 'character',
        tags
      });
      assets.push(asset);
    }
    db.logOperation('assets.upload', { count: assets.length, name: name || assets[0]?.name }, req.user);
    res.json({ success: true, data: assets });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 下载原文件
router.get('/:id/download', (req, res) => {
  try {
    const asset = db.getAsset(req.params.id);
    if (!asset) return res.status(404).json({ success: false, error: '资产不存在' });
    const filePath = path.join(UPLOAD_DIR, asset.fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: '文件不存在' });
    const ext = path.extname(asset.fileName);
    const dlName = (asset.name || asset.originalName || 'asset') + ext;
    res.download(filePath, dlName);
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 更新元数据
router.put('/:id', (req, res) => {
  try {
    const asset = db.updateAsset(req.params.id, req.body);
    if (!asset) return res.status(404).json({ success: false, error: '资产不存在' });
    db.logOperation('assets.update', { name: asset.name }, req.user);
    res.json({ success: true, data: asset });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 删除（含文件）
router.delete('/:id', (req, res) => {
  try {
    const asset = db.deleteAsset(req.params.id);
    if (!asset) return res.status(404).json({ success: false, error: '资产不存在' });
    // 删除物理文件
    const filePath = path.join(UPLOAD_DIR, asset.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    db.logOperation('assets.delete', { name: asset.name }, req.user);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 批量删除
router.post('/batch-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供要删除的资产ID列表' });
    }
    const deleted = db.batchDeleteAssets(ids);
    // 删除物理文件
    for (const asset of deleted) {
      const filePath = path.join(UPLOAD_DIR, asset.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    db.logOperation('assets.batchDelete', { count: deleted.length }, req.user);
    res.json({ success: true, data: { count: deleted.length } });
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 批量下载（打包zip）
router.post('/batch-download', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供要下载的资产ID列表' });
    }
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 6 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="assets-' + Date.now() + '.zip"');

    archive.on('error', (err) => { res.status(500).end(); });
    archive.pipe(res);

    for (const id of ids) {
      const asset = db.getAsset(id);
      if (!asset) continue;
      const filePath = path.join(UPLOAD_DIR, asset.fileName);
      if (!fs.existsSync(filePath)) continue;
      const ext = path.extname(asset.fileName);
      const dlName = (asset.name || asset.originalName || 'asset') + ext;
      archive.file(filePath, { name: dlName });
    }
    archive.finalize();
  } catch (e) {
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// multer错误处理
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: '文件大小不能超过200MB' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
});

module.exports = router;
