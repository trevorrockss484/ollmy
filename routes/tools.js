const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const archiver = require('archiver');
const { spawnSync } = require('child_process');
const db = require('../database/db');
const Ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
Ffmpeg.setFfmpegPath(ffmpegPath);
Ffmpeg.setFfprobePath(ffmpegPath);

// 视频压缩进度存储（内存中）
const videoProgress = new Map(); // sessionId → { percent, fps, currentFps, time, eta } // ffmpeg 自带 ffprobe 功能

// 用 ffmpeg 命令行获取视频元数据（避免依赖 ffprobe）
function getVideoInfo(filePath) {
  try {
    const result = spawnSync(ffmpegPath, ['-i', filePath, '-f', 'null', '-'], { encoding: 'utf8' });
    const stderr = result.stderr || '';
    // 解析 Duration
    const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    let duration = 0;
    if (durMatch) {
      duration = parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseInt(durMatch[3]) + parseInt(durMatch[4]) / 100;
    }
    // 解析分辨率
    const resMatch = stderr.match(/(\d{2,5})x(\d{2,5})/);
    let width = 0, height = 0;
    if (resMatch) {
      width = parseInt(resMatch[1]);
      height = parseInt(resMatch[2]);
    }
    return { width, height, duration };
  } catch { return { width: 0, height: 0, duration: 0 }; }
}

// 临时目录（压缩中间文件）
const TEMP_DIR = path.join(__dirname, '..', 'uploads', 'temp', 'compress');
const VIDEO_TEMP_DIR = path.join(__dirname, '..', 'uploads', 'temp', 'video');
// 素材库持久目录
const SAVED_DIR = path.join(__dirname, '..', 'uploads', 'compress', 'saved');
const VIDEO_SAVED_DIR = path.join(__dirname, '..', 'uploads', 'video', 'library');
const VIDEO_COVER_DIR = path.join(__dirname, '..', 'uploads', 'video', 'covers');

[TEMP_DIR, VIDEO_TEMP_DIR, SAVED_DIR, VIDEO_SAVED_DIR, VIDEO_COVER_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// 修复 multer 中文文件名乱码：浏览器 FormData 的 filename 可能是 latin1 编码的 UTF-8 字节
function fixFilename(name) {
  // 如果已经有非 ASCII 可读字符（如中文），说明 multer 已正确解码，不需要修
  if (/[一-鿿぀-ゟ゠-ヿ가-힯]/.test(name)) return name;
  // 如果包含 0x80-0xFF 范围的 latin1 字符，说明是未解码的 UTF-8 字节
  if (/[-ÿ]/.test(name)) {
    try {
      const decoded = Buffer.from(name, 'latin1').toString('utf8');
      // 解码后包含中文即为成功
      if (/[一-鿿]/.test(decoded)) return decoded;
    } catch {}
  }
  return name;
}

// 清理超过30分钟的临时文件
function cleanTemp(dir) {
  const d = dir || TEMP_DIR;
  try {
    if (!fs.existsSync(d)) return;
    const now = Date.now();
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      try { if (now - fs.statSync(p).mtimeMs > 30 * 60 * 1000) fs.unlinkSync(p); } catch {}
    }
  } catch {}
}

// multer：临时存储上传文件
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP_DIR),
    filename: (req, file, cb) => {
      file.originalname = fixFilename(file.originalname);
      const ext = path.extname(file.originalname);
      const safe = path.basename(file.originalname, ext).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
      cb(null, 'upload_' + Date.now() + '_' + safe + ext);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.originalname = fixFilename(file.originalname);
    if (/\.(jpg|jpeg|png|gif|webp|bmp|tiff?|avif|jxl|svg|heif|heic)$/i.test(path.extname(file.originalname)))
      cb(null, true);
    else
      cb(new Error('仅支持图片格式: JPG, PNG, GIF, WebP, BMP, TIFF, AVIF, SVG, HEIC'));
  }
});

// ===== POST /api/tools/compress —— 压缩（不存入素材库） =====
router.post('/compress', (req, res) => {
  upload.array('files', 20)(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ success: false, error: '文件大小不能超过50MB' });
      return res.status(400).json({ success: false, error: err.message });
    }
    try {
      cleanTemp();
      if (!req.files?.length) return res.status(400).json({ success: false, error: '请选择文件' });

      const quality = Math.min(100, Math.max(1, parseInt(req.body.quality) || 80));
      const maxW = req.body.maxWidth ? parseInt(req.body.maxWidth) : null;
      const maxH = req.body.maxHeight ? parseInt(req.body.maxHeight) : null;
      const outFmtRaw = req.body.outputFormat || 'original';
      if (!['original','webp','jpeg','png','avif'].includes(outFmtRaw)) return res.status(400).json({ success: false, error: '不支持的输出格式' });
      const outFmt = outFmtRaw;
      const sid = String(Date.now()) + '_' + Math.random().toString(36).substring(2, 8);

      const results = [];
      let totalOrig = 0, totalComp = 0;
      const nameCount = new Map(); // 同名文件去重

      for (const file of req.files) {
        totalOrig += file.size;

        let pipe = sharp(file.path);
        const meta = await pipe.metadata();
        const ow = meta.width || 0, oh = meta.height || 0;

        if (maxW || maxH) pipe = pipe.resize({ width: maxW || undefined, height: maxH || undefined, fit: 'inside', withoutEnlargement: true });

        let outExt, outPipe;
        switch (outFmt) {
          case 'jpeg': outExt = '.jpg'; outPipe = pipe.jpeg({ quality, mozjpeg: true }); break;
          case 'png': outExt = '.png'; outPipe = pipe.png({ quality, compressionLevel: Math.round(9 - quality / 11) }); break;
          case 'avif': outExt = '.avif'; outPipe = pipe.avif({ quality: Math.min(63, Math.round(quality * 0.63)) }); break;
          case 'original': outExt = path.extname(file.originalname) || '.jpg'; outPipe = pipe; break;
          default: outExt = '.webp'; outPipe = pipe.webp({ quality });
        }

        let safe = path.basename(file.originalname, path.extname(file.originalname)).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
        // 同名文件加序号防碰撞
        const cnt = (nameCount.get(safe + outExt) || 0) + 1;
        nameCount.set(safe + outExt, cnt);
        if (cnt > 1) safe += '_' + cnt;

        const cname = 'compressed_' + sid + '_' + safe + outExt;
        await outPipe.toFile(path.join(TEMP_DIR, cname));

        const csize = fs.statSync(path.join(TEMP_DIR, cname)).size;
        totalComp += csize;
        const outMeta = await sharp(path.join(TEMP_DIR, cname)).metadata();
        const ratio = file.size > 0 ? ((1 - csize / file.size) * 100).toFixed(1) : 0;

        results.push({
          originalName: file.originalname, originalSize: file.size,
          compressedSize: csize, compressedName: cname,
          width: outMeta.width || ow, height: outMeta.height || oh,
          format: outFmt === 'original' ? (meta.format || 'jpg') : outFmt,
          ratio: ratio + '%', quality,
          downloadUrl: '/api/tools/download/' + encodeURIComponent(cname),
          previewUrl: '/uploads/temp/compress/' + encodeURIComponent(cname),
        });
      }

      // 删上传临时文件
      for (const f of req.files) try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch {}

      const totalRatio = totalOrig > 0 ? ((1 - totalComp / totalOrig) * 100).toFixed(1) : 0;
      res.json({ success: true, data: { results, totalOriginalSize: totalOrig, totalCompressedSize: totalComp, totalRatio: totalRatio + '%', sessionId: sid } });
    } catch (e) {
      console.error('压缩失败:', e);
      if (req.files) for (const f of req.files) try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch {}
      res.status(500).json({ success: false, error: '压缩失败: ' + (e.message || '未知错误') });
    }
  });
});

// ===== POST /api/tools/save —— 将压缩结果存入素材库 =====
router.post('/save', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ success: false, error: '无有效数据' });

    const saved = [];
    for (const item of items) {
      if (!item.compressedName || item.compressedName.includes('..') || item.compressedName.includes('/') || item.compressedName.includes('\\')) continue;
      const srcPath = path.join(TEMP_DIR, item.compressedName);
      const userLabel = (item.name || item.originalName || '素材').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\.[^.]+$/, '');
      const ext = path.extname(item.compressedName) || '.webp';
      const dstName = Date.now() + '_' + userLabel + ext;
      const dstPath = path.join(SAVED_DIR, dstName);

      // 将临时压缩文件复制到持久目录
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dstPath);
      } else {
        console.warn('源文件不存在:', srcPath);
        continue;
      }

      const record = db.addCompressed({
        originalName: item.originalName || '',
        compressedName: dstName,
        originalSize: item.originalSize || 0,
        compressedSize: item.compressedSize || 0,
        width: item.width || 0,
        height: item.height || 0,
        format: item.format || 'webp',
        quality: item.quality || 80,
        name: item.name || '',
        category: item.category || '',
        type: 'image',
      });
      saved.push(record);
    }

    if (!saved.length) return res.status(400).json({ success: false, error: '没有有效文件可保存（临时文件可能已过期）' });
    res.json({ success: true, data: saved });
  } catch (e) {
    console.error('保存失败:', e);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

// ===== POST /api/tools/upload-raw —— 直接上传素材（不压缩） =====
router.post('/upload-raw', (req, res) => {
  const rawUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, SAVED_DIR),
      filename: (req, file, cb) => {
        file.originalname = fixFilename(file.originalname);
        const ext = path.extname(file.originalname);
        const safe = path.basename(file.originalname, ext).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
        // 加随机后缀防止批量上传时同一毫秒内文件名碰撞
        cb(null, Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + safe + ext);
      }
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      file.originalname = fixFilename(file.originalname);
      if (/\.(jpg|jpeg|png|gif|webp|bmp|tiff?|avif|heif|heic)$/i.test(path.extname(file.originalname)))
        cb(null, true);
      else cb(new Error('仅支持图片格式'));
    }
  });
  rawUpload.array('files', 50)(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, error: '文件大小不能超过50MB' });
        if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, error: '一次最多上传50张图片' });
        if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ success: false, error: '一次最多上传50张图片' });
        return res.status(400).json({ success: false, error: err.message });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    try {
      if (!req.files?.length) return res.status(400).json({ success: false, error: '请选择文件' });
      const baseName = req.body.name || '';
      const category = req.body.category || '';
      const saved = [];
      let idx = 0;
      for (const file of req.files) {
        const meta = await sharp(file.path).metadata();
        idx++;
        // 多文件自动用原文件名+序号
        const autoName = req.files.length > 1
          ? (baseName || path.basename(file.originalname, path.extname(file.originalname))) + ' ' + idx
          : (baseName || path.basename(file.originalname, path.extname(file.originalname)));
        const record = db.addCompressed({
          originalName: file.originalname,
          compressedName: file.filename,
          originalSize: file.size,
          compressedSize: file.size,
          width: meta.width || 0,
          height: meta.height || 0,
          format: meta.format || 'jpg',
          quality: 100,
          name: autoName,
          category,
          type: 'image',
        });
        saved.push(record);
      }
      res.json({ success: true, data: saved });
    } catch (e) {
      console.error('上传素材失败:', e);
      res.status(500).json({ success: false, error: '上传失败' });
    }
  });
});

// ===== GET /api/tools/saved —— 素材库列表 =====
router.get('/saved', (req, res) => {
  try {
    // 只返回图片素材，排除视频（视频素材库独立）
    const list = db.getCompressed()
      .filter(r => r.type !== 'video')
      .map(r => ({
        ...r,
        downloadUrl: '/api/tools/download-saved/' + encodeURIComponent(r.compressedName) + (r.name ? '?dl=' + encodeURIComponent(r.name) : ''),
        previewUrl: '/uploads/compress/saved/' + encodeURIComponent(r.compressedName),
      }));
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取素材库失败' });
  }
});

// ===== DELETE /api/tools/saved/:id —— 删除素材 =====
router.delete('/saved/:id', (req, res) => {
  try {
    const item = db.deleteCompressed(Number(req.params.id));
    if (!item) return res.status(404).json({ success: false, error: '素材不存在' });
    // 删物理文件
    const fp = path.join(SAVED_DIR, item.compressedName);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

// ===== PUT /api/tools/saved/:id —— 更新素材名称/分类 =====
router.put('/saved/:id', express.json(), (req, res) => {
  try {
    const { name, category } = req.body || {};
    const updated = db.updateCompressed(Number(req.params.id), { name, category });
    if (!updated) return res.status(404).json({ success: false, error: '素材不存在' });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

// ===== GET /api/tools/download/:filename —— 下载临时压缩文件 =====
router.get('/download/:filename', (req, res) => {
  try {
    const fn = req.params.filename;
    if (!fn.startsWith('compressed_') || fn.includes('..')) return res.status(403).json({ success: false, error: '禁止访问' });
    const fp = path.join(TEMP_DIR, fn);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, error: '文件不存在或已过期' });
    res.download(fp, fn.replace(/^compressed_[^_]+_/, ''));
  } catch (e) { res.status(500).json({ success: false, error: '下载失败' }); }
});

// ===== GET /api/tools/download-saved/:filename —— 下载素材库文件 =====
router.get('/download-saved/:filename', (req, res) => {
  try {
    const fn = req.params.filename;
    if (fn.includes('..')) return res.status(403).json({ success: false, error: '禁止访问' });
    const fp = path.join(SAVED_DIR, fn);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, error: '文件不存在' });
    const dbName = req.query.dl || '';
    const ext = path.extname(fn);
    const dlName = dbName ? decodeURIComponent(dbName).replace(/[<>:"/\\|?*]/g, '_') + ext : fn.replace(/^\d+_/, '');
    res.download(fp, dlName);
  } catch (e) { res.status(500).json({ success: false, error: '下载失败' }); }
});

// ===== GET /api/tools/download-all/:sessionId —— 批量下载ZIP =====
router.get('/download-all/:sessionId', (req, res) => {
  try {
    const sid = req.params.sessionId;
    if (!/^[a-zA-Z0-9_-]+$/.test(sid)) return res.status(403).json({ success: false, error: '无效ID' });
    if (!fs.existsSync(TEMP_DIR)) return res.status(404).json({ success: false, error: '目录空' });

    const prefix = 'compressed_' + sid + '_';
    const files = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith(prefix));
    if (!files.length) return res.status(404).json({ success: false, error: '文件不存在或已过期' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="compressed_images.zip"');

    const archive = archiver('zip', { zlib: { level: 1 } });
    archive.on('error', (e) => { console.error('zip error:', e); if (!res.headersSent) res.status(500).end(); });
    archive.pipe(res);
    for (const f of files) archive.file(path.join(TEMP_DIR, f), { name: f.replace(/^compressed_[^_]+_/, '') });
    archive.finalize();
  } catch (e) {
    console.error('打包失败:', e);
    res.status(500).json({ success: false, error: '打包失败' });
  }
});

// ===== GET /api/tools/video-progress/:sessionId —— 视频压缩进度 =====
router.get('/video-progress/:sessionId', (req, res) => {
  const p = videoProgress.get(req.params.sessionId);
  if (!p) return res.json({ success: true, data: { status: 'not_found' } });
  res.json({ success: true, data: p });
});

// ===== POST /api/tools/compress-video —— 视频压缩 =====
router.post('/compress-video', (req, res) => {
  const videoUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, VIDEO_TEMP_DIR),
      filename: (req, file, cb) => {
        file.originalname = fixFilename(file.originalname);
        const ext = path.extname(file.originalname);
        const safe = path.basename(file.originalname, ext).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
        cb(null, 'video_' + Date.now() + '_' + safe + ext);
      }
    }),
    limits: { fileSize: 1024 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      file.originalname = fixFilename(file.originalname);
      if (/\.(mp4|mov|avi|mkv|webm|flv|wmv|m4v|mpeg|mpg)$/i.test(path.extname(file.originalname)))
        cb(null, true);
      else cb(new Error('仅支持视频格式: MP4, MOV, AVI, MKV, WebM, FLV, WMV'));
    }
  });
  videoUpload.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ success: false, error: '文件大小不能超过1GB' });
      return res.status(400).json({ success: false, error: err.message });
    }
    try {
      cleanTemp(VIDEO_TEMP_DIR);
      if (!req.file) return res.status(400).json({ success: false, error: '请选择文件' });

      const crf = Math.min(40, Math.max(18, parseInt(req.body.quality) || 23));
      const maxW = req.body.maxWidth ? parseInt(req.body.maxWidth) : null;
      const codec = req.body.codec || 'h264';
      const audioBitrate = req.body.audioBitrate || '128k';
      const sid = req.body.sid || (String(Date.now()) + '_' + Math.random().toString(36).substring(2, 8));
      const origExt = path.extname(req.file.originalname);
      const outName = 'compressed_' + sid + '_' + path.basename(req.file.originalname, origExt).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') + '.mp4';
      const outPath = path.join(VIDEO_TEMP_DIR, outName);

      // 获取原始视频信息
      const info = getVideoInfo(req.file.path);
      const oWidth = info.width || 0;
      const oHeight = info.height || 0;
      const duration = info.duration || 0;

      // 开始压缩
      const result = await new Promise((resolve, reject) => {
        let pipe = Ffmpeg(req.file.path);
        const filters = [];
        if (maxW && oWidth > maxW) {
          const ratio = maxW / oWidth;
          const newH = Math.round(oHeight * ratio / 2) * 2;
          filters.push(`scale=${maxW}:${newH}`);
        }
        if (filters.length) pipe = pipe.videoFilters(filters);

        switch (codec) {
          case 'hevc': pipe = pipe.videoCodec('libx265').addOption('-crf', String(crf)).addOption('-tag:v', 'hvc1'); break;
          case 'vp9': pipe = pipe.videoCodec('libvpx-vp9').addOption('-crf', String(crf)).addOption('-b:v', '0'); break;
          default: pipe = pipe.videoCodec('libx264').addOption('-crf', String(crf)).addOption('-preset', 'fast'); break;
        }

        pipe = pipe.audioCodec('aac').audioBitrate(audioBitrate).addOption('-movflags', '+faststart').addOption('-threads', '0');

        // 初始化进度
        const startTime = Date.now();
        videoProgress.set(sid, { status: 'processing', percent: 0, fps: 0, eta: '计算中...' });

        pipe.on('progress', (p) => {
          let pct = 0;
          // ffmpeg 的 timemark 解析已处理时长
          if (duration > 0 && p.timemark) {
            const parts = p.timemark.split(':').map(Number);
            const processed = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
            pct = Math.min(99, Math.round(processed / duration * 100));
          }
          // 有时 progress 自带 percent
          if (!pct && typeof p.percent === 'number' && p.percent > 0) {
            pct = Math.min(99, Math.round(p.percent));
          }

          let etaStr = '计算中...';
          if (pct > 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const totalEstimated = elapsed / (pct / 100);
            const remaining = Math.round(totalEstimated - elapsed);
            if (remaining > 0) {
              const m = Math.floor(remaining / 60);
              const s = remaining % 60;
              etaStr = m > 0 ? m + '分' + s + '秒' : s + '秒';
            }
          }

          videoProgress.set(sid, {
            status: 'processing',
            percent: pct,
            fps: Math.round(p.currentFps) || 0,
            eta: etaStr,
          });
        });

        pipe.on('end', () => {
          videoProgress.set(sid, { status: 'finalizing', percent: 99, fps: 0, time: '', eta: '处理中...' });
          try {
            let csize = fs.statSync(outPath).size;
            let finalName = outName;
            // 压缩后反而更大 → 用原文件
            if (csize >= req.file.size) {
              try { fs.unlinkSync(outPath); } catch {}
              const origExt = path.extname(req.file.originalname);
              finalName = 'original_' + sid + '_' + path.basename(req.file.originalname, origExt).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') + origExt;
              fs.copyFileSync(req.file.path, path.join(VIDEO_TEMP_DIR, finalName));
              csize = req.file.size;
            }
            const ratioVal = req.file.size > 0 ? ((1 - csize / req.file.size) * 100).toFixed(1) : 0;
            const wasOptimized = csize < req.file.size;
            resolve({
              results: [{
                originalName: req.file.originalname,
                originalSize: req.file.size,
                compressedSize: csize,
                compressedName: finalName,
                width: maxW && oWidth > maxW ? maxW : oWidth,
                height: maxW && oWidth > maxW ? Math.round(oHeight * (maxW / oWidth) / 2) * 2 : oHeight,
                format: path.extname(finalName).replace('.', ''),
                codec,
                ratio: ratioVal + '%',
                duration: Math.round(duration),
                wasOptimized,
                downloadUrl: '/api/tools/download-video/' + encodeURIComponent(finalName),
                previewUrl: '',
              }],
              totalOriginalSize: req.file.size,
              totalCompressedSize: csize,
              totalRatio: ratioVal + '%',
              sessionId: sid,
            });
          } catch (e) { reject(e); }
        });
        pipe.on('error', reject);
        pipe.save(outPath);
      });

      // 删上传临时文件
      try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
      // 也清理视频临时目录
      cleanTemp(VIDEO_TEMP_DIR);
      // 清理进度
      videoProgress.set(sid, { status: 'done', percent: 100, fps: 0, time: '', eta: '' });
      setTimeout(() => videoProgress.delete(sid), 60000); // 1分钟后清

      res.json({ success: true, data: result });
    } catch (e) {
      console.error('视频压缩失败:', e);
      if (req.file) try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
      videoProgress.set(sid, { status: 'error', percent: 0, fps: 0, time: '', eta: e.message || '未知错误' });
      res.status(500).json({ success: false, error: '压缩失败: ' + (e.message || '未知错误') });
    }
  });
});

// ===== GET /api/tools/download-video/:filename —— 下载压缩视频 =====
router.get('/download-video/:filename', (req, res) => {
  try {
    const fn = req.params.filename;
    if (!(fn.startsWith('compressed_') || fn.startsWith('original_')) || fn.includes('..')) return res.status(403).json({ success: false, error: '禁止访问' });
    const fp = path.join(VIDEO_TEMP_DIR, fn);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, error: '文件不存在或已过期' });
    const dlName = fn.replace(/^compressed_[^_]+_/, '');
    res.download(fp, dlName);
  } catch (e) { res.status(500).json({ success: false, error: '下载失败' }); }
});

// ===== 视频素材库 API =====

// POST /api/tools/save-video — 保存压缩后的视频到素材库
router.post('/save-video', (req, res) => {
  try {
    const item = req.body;
    if (!item.compressedName) return res.status(400).json({ success: false, error: '无效数据' });
    // 路径穿越防护：拒绝 .. / \ 并使用 basename 取纯文件名
    if (item.compressedName.includes('..') || item.compressedName.includes('/') || item.compressedName.includes('\\')) {
      return res.status(403).json({ success: false, error: '禁止访问' });
    }
    const safeName = path.basename(item.compressedName);
    const srcPath = path.join(VIDEO_TEMP_DIR, safeName);
    // 确保解析后仍在 VIDEO_TEMP_DIR 内
    if (!path.resolve(srcPath).startsWith(path.resolve(VIDEO_TEMP_DIR))) {
      return res.status(403).json({ success: false, error: '禁止访问' });
    }
    const userLabel = (item.name || item.originalName || '视频素材').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\.[^.]+$/, '');
    const ext = path.extname(safeName) || '.mp4';
    const dstName = Date.now() + '_' + userLabel + ext;
    const dstPath = path.join(VIDEO_SAVED_DIR, dstName);
    if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, dstPath);
    else return res.status(400).json({ success: false, error: '源文件不存在' });

    const record = db.addCompressed({
      originalName: item.originalName || '',
      compressedName: dstName,
      originalSize: item.originalSize || 0,
      compressedSize: item.compressedSize || 0,
      width: item.width || 0,
      height: item.height || 0,
      format: item.format || 'mp4',
      quality: item.quality || 80,
      name: item.name || '',
      category: item.category || '',
      duration: item.duration || 0,
      codec: item.codec || '',
      type: 'video',
      purpose: item.purpose || 'normal',
    });
    res.json({ success: true, data: [record] });
  } catch (e) { res.status(500).json({ success: false, error: '保存失败' }); }
});

// POST /api/tools/upload-video-media — 批量上传视频到素材库
router.post('/upload-video-media', (req, res) => {
  const vidUp = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, VIDEO_SAVED_DIR),
      filename: (req, file, cb) => {
        file.originalname = fixFilename(file.originalname);
        const ext = path.extname(file.originalname);
        const safe = path.basename(file.originalname, ext).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
        cb(null, Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + safe + ext);
      }
    }),
    limits: { fileSize: 1024 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      file.originalname = fixFilename(file.originalname);
      if (/\.(mp4|mov|avi|mkv|webm|flv|wmv|m4v)$/i.test(path.extname(file.originalname)))
        cb(null, true);
      else cb(new Error('仅支持视频格式'));
    }
  });
  vidUp.array('files', 20)(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    try {
      if (!req.files?.length) return res.status(400).json({ success: false, error: '请选择视频文件' });
      const name = req.body.name || '';
      const category = req.body.category || '';
      const purpose = req.body.purpose || 'tiktok';
      const saved = [];
      let idx = 0;
      for (const file of req.files) {
        const info = getVideoInfo(file.path);
        idx++;
        const autoName = req.files.length > 1
          ? (name || path.basename(file.originalname, path.extname(file.originalname))) + ' ' + idx
          : (name || path.basename(file.originalname, path.extname(file.originalname)));
        const record = db.addCompressed({
          originalName: file.originalname, compressedName: file.filename,
          originalSize: file.size, compressedSize: file.size,
          width: info.width || 0, height: info.height || 0,
          format: path.extname(file.originalname).replace('.', ''),
          quality: 100, name: autoName, category, purpose,
          duration: Math.round(info.duration || 0), codec: '', type: 'video',
        });
        saved.push(record);
      }
      res.json({ success: true, data: saved });
    } catch (e) { res.status(500).json({ success: false, error: '上传失败' }); }
  });
});

// GET /api/tools/saved-videos — 视频素材库列表
router.get('/saved-videos', (req, res) => {
  try {
    const list = db.getCompressed()
      .filter(r => r.type === 'video')
      .map(r => ({
        ...r,
        downloadUrl: '/api/tools/download-video-saved/' + encodeURIComponent(r.compressedName) + (r.name ? '?dl=' + encodeURIComponent(r.name) : ''),
        previewUrl: '/uploads/video/library/' + encodeURIComponent(r.compressedName),
        coverUrl: r.coverName ? '/uploads/video/covers/' + encodeURIComponent(r.coverName) : '',
        coverDownloadUrl: r.coverName ? '/api/tools/download/cover/' + encodeURIComponent(r.coverName) : '',
      }));
    res.json({ success: true, data: list });
  } catch (e) { res.status(500).json({ success: false, error: '获取失败' }); }
});

// PUT /api/tools/saved-video/:id — 更新视频素材名称/分类
router.put('/saved-video/:id', (req, res) => {
  try {
    const { name, category } = req.body || {};
    const updated = db.updateCompressed(Number(req.params.id), { name, category });
    if (!updated) return res.status(404).json({ success: false, error: '素材不存在' });
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, error: '更新失败' }); }
});

// DELETE /api/tools/saved-video/:id — 删除视频素材
router.delete('/saved-video/:id', (req, res) => {
  try {
    const item = db.deleteCompressed(Number(req.params.id));
    if (!item) return res.status(404).json({ success: false, error: '素材不存在' });
    const fp = path.join(VIDEO_SAVED_DIR, item.compressedName);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: '删除失败' }); }
});

// GET /api/tools/download-video-saved/:filename — 下载视频素材
router.get('/download-video-saved/:filename', (req, res) => {
  try {
    const fn = req.params.filename;
    if (fn.includes('..')) return res.status(403).json({ success: false, error: '禁止访问' });
    const fp = path.join(VIDEO_SAVED_DIR, fn);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, error: '不存在' });
    // 有 dbName 就用自定义名称，否则用文件名
    const dbName = req.query.dl || '';
    const ext = path.extname(fn);
    const dlName = dbName ? decodeURIComponent(dbName).replace(/[<>:"/\\|?*]/g, '_') + ext : fn.replace(/^\d+_/, '');
    res.download(fp, dlName);
  } catch (e) { res.status(500).json({ success: false, error: '下载失败' }); }
});

// GET /api/tools/download/cover/:filename — 下载封面图
router.get('/download/cover/:filename', (req, res) => {
  try {
    const fn = req.params.filename;
    if (fn.includes('..')) return res.status(403).json({ success: false, error: '禁止访问' });
    const fp = path.join(VIDEO_COVER_DIR, fn);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, error: '不存在' });
    const dlName = 'cover_' + fn.replace(/^\d+_/, '');
    res.download(fp, dlName);
  } catch (e) { res.status(500).json({ success: false, error: '下载失败' }); }
});

// ===== 话术库 API =====
router.get('/scripts', (req, res) => {
  try {
    const list = db.getScripts();
    res.json({ success: true, data: list });
  } catch (e) { res.status(500).json({ success: false, error: '获取失败' }); }
});
router.post('/scripts/add', (req, res) => {
  try {
    const { title, content, contentCn, category, tags } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ success: false, error: '标题不能为空' });
    if (!content?.trim() && !contentCn?.trim()) return res.status(400).json({ success: false, error: '至少填写英文或中文内容' });
    const record = db.addScript({ title: title.trim(), content: (content || '').trim(), contentCn: (contentCn || '').trim(), category: category || '开场白', tags: tags || [] });
    res.json({ success: true, data: record });
  } catch (e) { res.status(500).json({ success: false, error: '保存失败' }); }
});
router.put('/scripts/:id', (req, res) => {
  try {
    const { title, content, contentCn, category, tags } = req.body || {};
    const updated = db.updateScript(Number(req.params.id), { title, content, contentCn, category, tags });
    if (!updated) return res.status(404).json({ success: false, error: '话术不存在' });
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, error: '更新失败' }); }
});
router.delete('/scripts/:id', (req, res) => {
  try {
    const item = db.deleteScript(Number(req.params.id));
    if (!item) return res.status(404).json({ success: false, error: '话术不存在' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: '删除失败' }); }
});
router.post('/scripts/:id/usage', (req, res) => {
  try {
    const item = db.incScriptUsage(Number(req.params.id));
    if (!item) return res.status(404).json({ success: false, error: '话术不存在' });
    res.json({ success: true, data: item });
  } catch (e) { res.status(500).json({ success: false, error: '更新失败' }); }
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
