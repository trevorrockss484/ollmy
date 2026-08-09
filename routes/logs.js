const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

function listLogFiles() {
  if (!fs.existsSync(LOG_DIR)) return [];
  return fs.readdirSync(LOG_DIR)
    .filter(f => f.endsWith('.log'))
    .sort()
    .reverse();
}

// 获取日志文件列表
router.get('/files', (req, res) => {
  try {
    const files = listLogFiles().map(f => ({ name: f, label: f.replace('.log','') }));
    res.json({ success: true, data: files });
  } catch (e) {
    res.status(500).json({ success: false, error: '读取日志文件失败' });
  }
});

// 读取指定日期的日志内容（最近100条）
router.get('/read/:file', (req, res) => {
  try {
    const file = path.join(LOG_DIR, req.params.file);
    if (!fs.existsSync(file)) return res.json({ success: true, data: [] });
    const raw = fs.readFileSync(file, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const entries = lines
      .map(l => { try { return JSON.parse(l) } catch { return null } })
      .filter(Boolean)
      .reverse()
      .slice(0, 100);
    res.json({ success: true, data: entries });
  } catch (e) {
    res.status(500).json({ success: false, error: '读取日志失败' });
  }
});

module.exports = router;
