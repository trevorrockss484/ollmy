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

// 中文数字转阿拉伯（支持 一~九十九 / 一百 / 一百二十 等常见写法）
function chineseNumToInt(s) {
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 }
  if (s === '十') return 10
  if (/^十(\d)$/.test(s)) return 10 + map[RegExp.$1]
  if (/^(\d)十$/.test(s)) return map[RegExp.$1] * 10
  if (/^(\d)十(\d)$/.test(s)) return map[RegExp.$1] * 10 + map[RegExp.$2]
  let total = 0
  for (const ch of s) { if (map[ch] !== undefined) total = total * 10 + map[ch] }
  return total || 1
}

// 按「第N集 / 第一集 / 第N章 / Episode N」行首标题拆分成集
// 无集标记或仅 1 个标记时，整文件作为第 1 集
function splitEpisodes(text) {
  const re = /^[ \t]*(第\s*([0-9一二三四五六七八九十百千]+)\s*[集章回]|(?:Episode|EP)\s*(\d+))/gim
  const starts = []
  let m
  while ((m = re.exec(text)) !== null) {
    const num = m[2] !== undefined ? chineseNumToInt(m[2]) : parseInt(m[4], 10)
    starts.push({ index: m.index, num })
  }
  if (starts.length <= 1) {
    return [{ episode: 1, content: text.trim() }]
  }
  const eps = []
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].index
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length
    let content = text.slice(start, end).trim()
    // 第一集标题前若有内容（书名/序言），并入第一集
    if (i === 0 && start > 0) content = text.slice(0, start).trim() + '\n\n' + content
    eps.push({ episode: starts[i].num, content })
  }
  return eps
}

// 列表
router.get('/', (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin'
    const userId = isAdmin ? null : (req.user ? req.user.username : null)
    res.json({ success: true, data: db.getShowScripts(userId) });
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 新增剧本/分镜
router.post('/', (req, res) => {
  try {
    const item = db.addShowScript({ ...req.body, userId: req.user ? req.user.username : 'admin' });
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

// 整部剧上传：自动按集拆分，为每集建记录
router.post('/upload-show', upload.single('file'), async (req, res) => {
  try {
    const { showName, showNameEn, type } = req.body
    if (!showName) return res.status(400).json({ success: false, error: '缺少剧名' })
    const file = req.file
    if (!file) return res.status(400).json({ success: false, error: '请选择文件' })

    const ext = path.extname(file.originalname).toLowerCase()
    let content = ''
    if (ext === '.docx') {
      try { const r = await mammoth.extractRawText({ path: file.path }); content = (r && r.value) ? r.value : '' } catch { content = '' }
    } else if (ext === '.txt') {
      content = fs.readFileSync(file.path, 'utf-8')
    } else if (ext === '.pdf') {
      content = '【PDF文件已上传，请手动编辑或下载查看】\n' + file.filename
    }

    const typeVal = type === 'storyboard' ? 'storyboard' : 'script'
    const eps = splitEpisodes(content)
    const userId = req.user ? req.user.username : 'admin'
    const created = eps.map(ep => db.addShowScript({
      showName,
      showNameEn: showNameEn || '',
      type: typeVal,
      episode: ep.episode,
      done: false,
      title: typeVal === 'script' ? '剧本' : '分镜',
      content: ep.content,
      uploadedFile: { fileName: file.filename, originalName: file.originalname, fileSize: file.size },
      userId
    }))
    db.logOperation('scripts.uploadShow', { showName, type: typeVal, count: created.length }, req.user)
    res.json({ success: true, data: { count: created.length, episodes: eps.map(e => e.episode) } })
  } catch (e) {
    res.status(500).json({ success: false, error: '上传失败: ' + e.message })
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
