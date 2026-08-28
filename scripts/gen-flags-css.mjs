// 生成裁剪版国旗 CSS —— 只包含全站实际用到的国家
// 国旗 SVG 复制到 public/flags/，由浏览器按需加载（避免 Vite 把 SVG 内联进 CSS 导致体积爆炸）
// 用法：node scripts/gen-flags-css.mjs
// 新增国家（countryTree.js / MonitorView）后重新运行即可
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')

const tree = read('src/data/countryTree.js')
const mon = read('src/views/MonitorView.vue')
const codes = new Set()

// countryTree.js: '中国':['+86','cn']
for (const m of tree.matchAll(/\[\s*'\+[\d\s-]+'\s*,\s*'([a-z]{2})'\s*\]/g)) codes.add(m[1])
// MonitorView.vue: iso2:'vn'
for (const m of mon.matchAll(/iso2:\s*'([a-z]{2})'/g)) codes.add(m[1])

const all = [...codes].sort()
  .filter(c => fs.existsSync(path.join(root, `node_modules/flag-icons/flags/4x3/${c}.svg`)))
const missing = [...codes].filter(c => !all.includes(c))

// 复制国旗到 public/flags/
const outDir = path.join(root, 'public/flags')
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
let svgBytes = 0
for (const c of all) {
  const svg = fs.readFileSync(path.join(root, `node_modules/flag-icons/flags/4x3/${c}.svg`))
  svgBytes += svg.length
  fs.writeFileSync(path.join(outDir, `${c}.svg`), svg)
}

let css = `/* 国旗样式 — 脚本生成（仅含全站实际用到的国家，替代 flag-icons 全量 CSS + SVG 内联）
 * 生成方式：node scripts/gen-flags-css.mjs
 * 新增国家后重新运行该脚本即可 */
.fib,.fi{background-size:contain;background-position:50%;background-repeat:no-repeat}
.fi{position:relative;display:inline-block;width:1.333333em;line-height:1em}
.fi:before{content:"\\00a0"}
`
for (const c of all) css += `.fi-${c}{background-image:url(/flags/${c}.svg)}\n`

fs.writeFileSync(path.join(root, 'src/styles/flags.css'), css)
console.log(`已生成：${all.length} 面国旗 → public/flags/（共 ${(svgBytes / 1024).toFixed(0)}KB SVG，按需加载）`)
console.log(`src/styles/flags.css：${(css.length / 1024).toFixed(1)}KB`)
if (missing.length) console.warn('flag-icons 中缺失（已跳过）:', missing.join(','))
