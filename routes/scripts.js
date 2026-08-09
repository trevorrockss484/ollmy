const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const db = require('../database/db');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'scripts');
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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(doc|docx|pdf|txt)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 doc, docx, pdf, txt'));
    }
  }
});

// 列表
router.get('/', (req, res) => {
  try {
    res.json({ success: true, data: db.getShowScripts() });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 新增剧本/分镜
router.post('/', (req, res) => {
  try {
    const item = db.addShowScript(req.body);
    db.logOperation('scripts.add', { showName: item.showName, title: item.title }, req.user);
    res.json({ success: true, data: item });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 更新内容（auto-save）
router.put('/:id', (req, res) => {
  try {
    const item = db.updateShowScript(req.params.id, req.body);
    if (!item) return res.status(404).json({ success: false, error: '不存在' });
    db.logOperation('scripts.update', { showName: item.showName, title: item.title }, req.user);
    res.json({ success: true, data: item });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 删除
router.delete('/:id', (req, res) => {
  try {
    const item = db.getShowScript(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: '不存在' });
    // 清理上传的文件
    if (item.uploadedFile && item.uploadedFile.fileName) {
      const fp = path.join(UPLOAD_DIR, item.uploadedFile.fileName);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    db.deleteShowScript(req.params.id);
    db.logOperation('scripts.delete', { showName: item.showName }, req.user);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 上传文档并提取文本
router.post('/:id/upload', upload.single('file'), async (req, res) => {
  try {
    const item = db.getShowScript(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: '剧本不存在' });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: '请选择文件' });

    const ext = path.extname(file.originalname).toLowerCase();
    let content = '';

    if (ext === '.docx') {
      try {
        const result = await mammoth.extractRawText({ path: file.path });
        content = (result && result.value) ? result.value : '';
      } catch { content = ''; }
    } else if (ext === '.txt') {
      content = fs.readFileSync(file.path, 'utf-8');
    } else if (ext === '.pdf') {
      // PDF: save file ref but can't extract text easily
      content = '【PDF文件已上传，请手动编辑或下载查看】\n' + file.filename;
    }

    const updated = db.updateShowScript(req.params.id, {
      content: content,
      uploadedFile: {
        fileName: file.filename,
        originalName: file.originalname,
        fileSize: file.size
      }
    });

    res.json({ success: true, data: { ...updated, extracted: content } });
  } catch (e) {
    res.status(500).json({ success: false, error: '上传失败: ' + e.message });
  }
});

// 下载上传的文件
router.get('/:id/file', (req, res) => {
  try {
    const item = db.getShowScript(req.params.id);
    if (!item || !item.uploadedFile || !item.uploadedFile.fileName) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }
    const fp = path.join(UPLOAD_DIR, item.uploadedFile.fileName);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, error: '文件不存在' });
    res.download(fp, item.uploadedFile.originalName || 'document');
  } catch (e) {
    res.status(500).json({ success: false, error: '下载失败' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, error: '文件大小不能超过50MB' });
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) return res.status(400).json({ success: false, error: err.message });
  next();
});

module.exports = router;
