const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 系统信息（无需认证）
router.get('/health', (req, res) => {
  try {
    const DATA_DIR = path.join(__dirname, '..', 'database');
    const BACKUP_DIR = path.join(__dirname, '..', 'backup');
    const LOG_DIR = path.join(__dirname, '..', 'logs');
    const dataFile = path.join(DATA_DIR, 'data.json');

    const info = {
      version: '3.0',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.round(process.uptime()),
      dataSize: fs.existsSync(dataFile) ? (fs.statSync(dataFile).size / 1024).toFixed(1) + ' KB' : 'N/A',
      backups: fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).length : 0,
      logFiles: fs.existsSync(LOG_DIR) ? fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.log')).length : 0,
      memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + ' MB',
    };
    res.json({ success: true, data: info });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 手动触发备份
router.post('/backup', (req, res) => {
  try {
    const db = require('../database/db');
    db.logOperation('system.backup', { trigger: 'manual' }, req.user);
    // 触发 server.js 中的备份逻辑
    const DATA_DIR = path.join(__dirname, '..', 'database');
    const BACKUP_DIR = path.join(__dirname, '..', 'backup');
    const DATA_FILE = path.join(DATA_DIR, 'data.json');
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
      const now = new Date();
      const stamp = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + '_manual_' + String(now.getHours()).padStart(2,'0') + '-' + String(now.getMinutes()).padStart(2,'0');
      const dest = path.join(BACKUP_DIR, 'data_' + stamp + '.json');
      fs.copyFileSync(DATA_FILE, dest);
      res.json({ success: true, data: { file: 'data_' + stamp + '.json' } });
    } else {
      res.json({ success: false, error: '数据文件不存在' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
