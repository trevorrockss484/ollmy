/**
 * 导入脚本 — 从 G:\Panry海外\海外全流程流程\ 扫描所有提示词文件写入数据库
 * 运行: node scripts/import-prompts.js
 */
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'G:\\Panry海外\\海外全流程流程';

// RRF纯文本提取
function rtfToPlain(raw) {
  let text = raw;
  // 先解码所有 \uXXXX 格式（后跟空格或?）
  text = text.replace(/\\uc0\\u(\d{4,5})\s*\??/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  text = text.replace(/\\u(\d{4,5})\s*\??/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  // 移除所有RTF控制词（\word 或 \word123 格式）
  text = text.replace(/\\\*?\\[a-z]+\d*/gi, '');
  text = text.replace(/\\[a-z]+\d*/gi, '');
  // 移除花括号
  text = text.replace(/[\{\}]/g, '');
  // 清理多余空白
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/\s{3,}/g, ' ');
  return text.trim();
}

function isRTF(filePath) {
  return path.extname(filePath).toLowerCase() === '.rtf';
}

// 目录名映射到步骤
function dirToStep(dirName) {
  const m = dirName.match(/^第[一二三四五六七八九十]+步/);
  if (m) {
    // 标准化步骤名
    const stepNum = m[0];
    const rest = dirName.replace(stepNum, '').trim().replace(/^[--\s]+/, '');
    const cleanRest = rest || '';
    return stepNum + (cleanRest ? '：' + cleanRest : '');
  }
  return dirName;
}

// 排序映射
const STEP_ORDER = {
  '第一步：剧本': 1,
  '第二步：人物 物品 场景的提取': 2,
  '第三步：生资产': 3,
  '第四步：分镜提示词': 4,
  '第五步：生分镜': 5,
};

function getStepOrder(step) {
  for (const [key, val] of Object.entries(STEP_ORDER)) {
    if (key.startsWith(step.split('：')[0])) return val;
  }
  return 99;
}

// 读取现有数据库
const DB_FILE = path.join(__dirname, '..', 'database', 'data', 'database.json');
let db;
try {
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  db = JSON.parse(raw);
} catch {
  db = { weeks: [], currentWeekId: null, dailyData: {}, vpsList: [], prompts: [] };
}

if (!Array.isArray(db.prompts)) db.prompts = [];

// 扫描目录
const dirs = fs.readdirSync(SOURCE_DIR).filter(d => {
  const stat = fs.statSync(path.join(SOURCE_DIR, d));
  return stat.isDirectory();
});

// 按步骤排序
dirs.sort((a, b) => getStepOrder(dirToStep(a)) - getStepOrder(dirToStep(b)));

let imported = 0;
const existingTitles = new Set(db.prompts.map(p => p.title));

for (const dir of dirs) {
  const stepName = dirToStep(dir);
  const dirPath = path.join(SOURCE_DIR, dir);

  // 递归读取所有文件
  function walkFiles(currentPath) {
    const entries = fs.readdirSync(currentPath);
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkFiles(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(entry).toLowerCase();
        if (['.txt', '.rtf', '.md'].includes(ext)) {
          let raw = fs.readFileSync(fullPath, 'utf-8');
          let content;
          if (isRTF(entry)) {
            content = rtfToPlain(raw);
          } else {
            content = raw.trim();
          }

          if (!content || content.length < 10) {
            console.log(`  ⚠️ 跳过空文件: ${entry}`);
            continue;
          }

          const title = path.basename(entry, ext);

          // 跳过已存在
          if (existingTitles.has(title)) {
            console.log(`  ⏭️ 已存在，跳过: ${title}`);
            continue;
          }

          const sortOrder = db.prompts.filter(p => p.step === stepName).length + 1;
          const prompt = {
            id: Date.now() + imported,
            title,
            step: stepName,
            sortOrder,
            content,
            tags: [stepName.split('：')[0]],
            createdAt: new Date().toISOString()
          };

          db.prompts.push(prompt);
          existingTitles.add(title);
          imported++;
          console.log(`  ✅ 导入: ${title} (${stepName})`);
        }
      }
    }
  }

  console.log(`📂 ${stepName}`);
  walkFiles(dirPath);
}

// 全局排序
db.prompts.sort((a, b) => {
  const sa = getStepOrder(a.step);
  const sb = getStepOrder(b.step);
  if (sa !== sb) return sa - sb;
  return (a.sortOrder || 0) - (b.sortOrder || 0);
});

// 写入
const json = JSON.stringify(db, null, 2);
fs.writeFileSync(DB_FILE, json, 'utf-8');
console.log(`\n🎉 导入完成！共 ${imported} 条提示词，数据库已更新: ${DB_FILE}`);
