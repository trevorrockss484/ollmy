const fs = require('fs');
const path = require('path');

const SOURCE = 'G:\\BaiduNetdiskDownload\\清风宗资料';
const DEST = path.join(__dirname, '..', 'uploads', 'library');
const DB_FILE = path.join(__dirname, '..', 'database', 'data', 'database.json');

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

// 读取数据库
let db;
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch { db = { library: [] }; }
if (!Array.isArray(db.library)) db.library = [];

const existingNames = new Set(db.library.map(d => d.originalName));
let imported = 0;

const files = fs.readdirSync(SOURCE).filter(f => {
  const ext = path.extname(f).toLowerCase();
  return ['.doc', '.docx', '.pdf', '.txt', '.xlsx', '.xls', '.pptx', '.ppt'].includes(ext);
});

for (const file of files) {
  const srcPath = path.join(SOURCE, file);
  const stat = fs.statSync(srcPath);
  if (!stat.isFile()) continue;

  // 跳过已存在的文件
  if (existingNames.has(file)) {
    console.log(`  ⏭️ 已存在，跳过: ${file}`);
    continue;
  }

  // 复制文件
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  const safeName = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  const destName = Date.now() + imported + '_' + safeName + ext;
  const destPath = path.join(DEST, destName);
  fs.copyFileSync(srcPath, destPath);

  // 写入数据库
  const doc = {
    id: Date.now() + imported,
    name: base,
    fileName: destName,
    originalName: file,
    fileSize: stat.size,
    tags: ['清风宗'],
    createdAt: new Date().toISOString()
  };
  db.library.push(doc);
  imported++;
  console.log(`  ✅ 导入: ${file} (${(stat.size/1024).toFixed(1)} KB)`);
}

// 保存数据库
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log(`\n🎉 完成！导入 ${imported} 个文件 → ${DB_FILE}`);
