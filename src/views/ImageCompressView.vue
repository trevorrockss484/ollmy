<template>
  <div class="compress-page">

    <!-- 上传 + 设置 -->
    <div class="top-section">
      <div
        class="upload-card"
        :class="{ 'drag-in': dragOver, 'compact': selectedFiles.length }"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <template v-if="!selectedFiles.length">
          <div class="up-icon"><el-icon :size="44"><UploadFilled /></el-icon></div>
          <h2 class="up-heading">图片压缩</h2>
          <p class="up-desc">智能减小图片体积，本地处理更安全</p>
          <input ref="fileInputRef" type="file" multiple accept="image/*" hidden @change="onFileSelect" />
          <el-button type="primary" size="large" round @click="fileInputRef?.click()">
            <el-icon><FolderAdd /></el-icon> 选择图片
          </el-button>
          <p class="up-note">支持拖拽上传 · 单文件 ≤ 50MB · 一次最多 20 张</p>
        </template>

        <template v-else>
          <div class="up-compact">
            <div class="up-summary">
              <span class="badge">{{ selectedFiles.length }} 张</span>
              <span class="size">{{ formatSize(totalSelectedSize) }}</span>
            </div>
            <div class="up-actions">
              <input ref="fileInputRef" type="file" multiple accept="image/*" hidden @change="onFileSelect" />
              <el-button size="default" round @click="fileInputRef?.click()">添加</el-button>
              <el-button size="default" round type="danger" plain @click="clearAll">清空</el-button>
            </div>
          </div>
          <div class="up-files">
            <div v-for="(item, idx) in previews" :key="item.key" class="up-file-chip">
              <img :src="item.url" />
              <div class="up-file-info">
                <span class="name">{{ item.file.name }}</span>
                <span class="meta">{{ formatSize(item.file.size) }}</span>
              </div>
              <button class="del" @click="removeFile(idx)">✕</button>
            </div>
          </div>
        </template>
      </div>

      <div v-if="selectedFiles.length" class="settings-row">
        <div class="setting-col">
          <label>画质</label>
          <div class="q-presets">
            <button type="button" v-for="p in qualityPresets" :key="p.value" :class="{ on: quality === p.value }" @click="quality = p.value">{{ p.label }}</button>
          </div>
          <div class="q-range">
            <el-slider v-model="quality" :min="1" :max="100" :show-tooltip="false" size="small" style="flex:1" />
            <span class="q-num" :style="{ color: qualityColor }">{{ quality }}</span>
            <span class="q-label" :style="{ background: qualityColor }">{{ qualityLabel }}</span>
          </div>
        </div>

        <div class="setting-col">
          <label>输出格式</label>
          <div class="fmt-row">
            <label v-for="fmt in formats" :key="fmt.value" class="fmt-chip" :class="{ sel: outputFormat === fmt.value }">
              <input type="radio" :value="fmt.value" v-model="outputFormat" />
              <span class="fmt-chip-name">{{ fmt.name }}</span>
              <span class="fmt-chip-desc">{{ fmt.desc }}</span>
            </label>
          </div>
        </div>

        <div class="setting-col size-col">
          <label>尺寸限制 <i>可选</i></label>
          <div class="size-inputs">
            <span>宽</span>
            <el-input-number v-model="maxWidth" :min="100" :max="12000" :step="100" placeholder="不限" controls-position="right" size="default" />
            <span class="size-x">×</span>
            <span>高</span>
            <el-input-number v-model="maxHeight" :min="100" :max="12000" :step="100" placeholder="不限" controls-position="right" size="default" />
          </div>
        </div>

        <div class="setting-col action-col">
          <el-button type="primary" size="large" round :loading="compressing" :disabled="compressing" @click="doCompress">
            <el-icon v-if="!compressing"><Scissor /></el-icon>
            {{ compressing ? '压缩中...' : `开始压缩` }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 结果区 -->
    <div v-if="results.length" class="results-section">
      <div class="result-strip">
        <span class="strip-saved">节省 {{ data.totalRatio }}</span>
        <span class="strip-detail">{{ formatSize(data.totalOriginalSize) }} → {{ formatSize(data.totalCompressedSize) }}</span>
        <div class="strip-gap"></div>
        <el-button round @click="downloadAll"><el-icon><Download /></el-icon> 打包 ZIP</el-button>
      </div>

      <div class="result-table">
        <div class="rt-row rt-header">
          <span class="rt-col rt-col-name">文件名</span>
          <span class="rt-col rt-col-size">压缩前后</span>
          <span class="rt-col rt-col-ratio">压缩比</span>
          <span class="rt-col rt-col-act">操作</span>
        </div>
        <div v-for="(r, i) in results" :key="r.compressedName" class="rt-row">
          <span class="rt-col rt-col-name">
            <span class="rt-fname" :title="r.originalName">{{ r.originalName }}</span>
            <span class="rt-dims">{{ r.width }} × {{ r.height }} · {{ r.format.toUpperCase() }}</span>
          </span>
          <span class="rt-col rt-col-size">
            <span class="rt-old">{{ formatSize(r.originalSize) }}</span>
            <span class="rt-arrow">→</span>
            <span class="rt-new">{{ formatSize(r.compressedSize) }}</span>
          </span>
          <span class="rt-col rt-col-ratio">
            <span class="rt-ratio-badge" :class="ratioClass(r.ratio)">{{ r.ratio }}</span>
          </span>
          <span class="rt-col rt-col-act">
            <el-button size="small" round type="primary" @click="downloadOne(r)">
              <el-icon><Download /></el-icon> 下载
            </el-button>
            <el-button size="small" round @click="openCompare(i)">
              <el-icon><View /></el-icon> 对比
            </el-button>
            <el-button size="small" round @click="openSave(i)">
              <el-icon><FolderAdd /></el-icon> 保存
            </el-button>
          </span>
        </div>
      </div>
    </div>

    <!-- 对比弹窗 -->
    <el-dialog v-model="compareVisible" title="原图 vs 压缩后" width="min(95vw, 1100px)" align-center :close-on-click-modal="false" :lock-scroll="true" destroy-on-close class="cmp-dialog" @opened="onCompareDialogOpen">
      <div v-if="compareIdx !== null && results[compareIdx]" class="cmp-dialog-body">
        <p class="cmp-d-hint">鼠标在图片上左右拖动，对比原图与压缩效果。</p>
        <div class="cmp-d-wrap"
          @mousemove="(e) => onCompareHover(e, 0)"
          @mouseleave="compareHover[0] = false"
          @touchmove="(e) => onCompareHover(e.touches[0], 0)"
          @touchend="compareHover[0] = false">
          <img :src="compareOriginalUrl" class="cmp-d-img cmp-d-before" />
          <img :src="results[compareIdx].previewUrl" class="cmp-d-img cmp-d-after"
            :style="{ clipPath: 'inset(0 0 0 ' + (compareHover[0] ? comparePos[0] : 50) + '%)' }" />
          <div class="cmp-d-split" v-show="compareHover[0]" :style="{ left: comparePos[0] + '%' }">
            <span>◀▶</span>
          </div>
          <span class="cmp-d-tag l">原图 {{ formatSize(results[compareIdx].originalSize) }}</span>
          <span class="cmp-d-tag r">压缩后 {{ formatSize(results[compareIdx].compressedSize) }}</span>
          <span class="cmp-d-tip" v-if="!compareHover[0]">← 鼠标在此拖动对比 →</span>
        </div>
        <div class="cmp-d-info">
          <span class="cmp-d-name">{{ results[compareIdx].originalName }}</span>
          <span class="cmp-d-ratio" :class="ratioClass(results[compareIdx].ratio)">文件体积减少 {{ results[compareIdx].ratio }}</span>
          <span class="cmp-d-detail">{{ results[compareIdx].width }}×{{ results[compareIdx].height }} · {{ results[compareIdx].format.toUpperCase() }} · 原 {{ formatSize(results[compareIdx].originalSize) }} → 现 {{ formatSize(results[compareIdx].compressedSize) }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 保存弹窗 -->
    <el-dialog v-model="saveVisible" width="min(95vw, 600px)" destroy-on-close align-center :close-on-click-modal="false" class="save-dialog-root">
      <template #header>
        <div class="sd-header">
          <div class="sd-header-icon"><el-icon :size="20"><FolderAdd /></el-icon></div>
          <div>
            <p class="sd-header-title">存入素材库</p>
            <p class="sd-header-sub">设置名称和分类，方便在素材库中查找</p>
          </div>
        </div>
      </template>
      <div v-if="saveIdx !== null && results[saveIdx]" class="sd-body">
        <!-- 预览图 -->
        <div class="sd-preview-new">
          <img :src="results[saveIdx].previewUrl" />
          <div class="sd-preview-badge">{{ results[saveIdx].format.toUpperCase() }} · {{ formatSize(results[saveIdx].compressedSize) }}</div>
        </div>
        <!-- 信息条 -->
        <div class="sd-info-strip">
          <div class="sd-info-item">
            <span class="sd-info-label">原始文件</span>
            <span class="sd-info-val">{{ results[saveIdx].originalName }}</span>
          </div>
          <div class="sd-info-item">
            <span class="sd-info-label">尺寸</span>
            <span class="sd-info-val">{{ results[saveIdx].width }} × {{ results[saveIdx].height }}</span>
          </div>
          <div class="sd-info-item">
            <span class="sd-info-label">压缩效果</span>
            <span class="sd-info-val" style="color:#059669;">{{ formatSize(results[saveIdx].originalSize) }} → {{ formatSize(results[saveIdx].compressedSize) }}（{{ results[saveIdx].ratio }}）</span>
          </div>
        </div>
        <!-- 表单 -->
        <div class="sd-form">
          <div class="sd-field">
            <label>素材名称</label>
            <el-input v-model="saveName" :placeholder="results[saveIdx].originalName" size="large" maxlength="60" clearable />
          </div>
          <div class="sd-field">
            <label>分类标签</label>
            <el-select v-model="saveCategory" placeholder="选择或输入分类" allow-create filterable clearable size="large" style="width:100%;">
              <el-option v-for="c in presetCategories" :key="c" :label="c" :value="c" />
            </el-select>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="sd-footer">
          <el-button size="large" round @click="saveVisible = false">取消</el-button>
          <el-button size="large" round type="primary" @click="doSave">
            <el-icon><Check /></el-icon> 保存到素材库
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { formatSize, authUrl } from '../api'

const fileInputRef = ref(null)
const selectedFiles = ref([])
const previewCache = ref(new Map())
const dragOver = ref(false)
const quality = ref(65)
const maxWidth = ref(null)
const maxHeight = ref(null)
const outputFormat = ref('original')
const compressing = ref(false)
const results = ref([])
const data = ref({ totalOriginalSize: 0, totalCompressedSize: 0, totalRatio: '0%', sessionId: '' })
const compareHover = reactive({})
const comparePos = reactive({})

// 弹窗
const compareVisible = ref(false)
const compareIdx = ref(null)
const compareOriginalUrl = ref('')
const saveVisible = ref(false)
const saveIdx = ref(null)
const saveName = ref('')
const saveCategory = ref('')

const presetCategories = ['总裁桌', '会议桌', '员工桌', '休闲空间', '沙发', '茶几', '酒店家具', '家用家具']

let _kid = 0; function nk() { return ++_kid }

const previews = computed(() =>
  selectedFiles.value.map(f => ({ key: f._key || f.name + f.size, file: f, url: previewCache.value.get(f._key) || '' }))
)
const totalSelectedSize = computed(() => selectedFiles.value.reduce((s, f) => s + f.size, 0))

const qualityPresets = [
  { value: 92, label: '极致' }, { value: 80, label: '高品质' },
  { value: 65, label: '均衡' }, { value: 50, label: '高压缩' }, { value: 30, label: '极限' },
]
const formats = [
  { value: 'original', name: '原格式', desc: '默认' }, { value: 'webp', name: 'WebP', desc: '最小' },
  { value: 'jpeg', name: 'JPEG', desc: '兼容好' }, { value: 'png', name: 'PNG', desc: '无损' },
  { value: 'avif', name: 'AVIF', desc: '最新' },
]

const qualityLabel = computed(() => {
  const v = quality.value
  if (v >= 90) return '极佳'; if (v >= 75) return '良好'
  if (v >= 55) return '中等'; if (v >= 35) return '较低'
  return '最低'
})
const qualityColor = computed(() => {
  const v = quality.value
  if (v >= 90) return '#10b981'; if (v >= 75) return '#22c55e'
  if (v >= 55) return '#f59e0b'; if (v >= 35) return '#f97316'
  return '#ef4444'
})
function ratioClass(s) { const v = parseFloat(s); return v >= 70 ? 'tag-g' : v >= 30 ? 'tag-y' : 'tag-n' }

function onCompareHover(e, i) {
  compareHover[i] = true
  const r = e.currentTarget.getBoundingClientRect()
  comparePos[i] = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width * 100))).toFixed(1)
}

// 文件
function addFiles(files) {
  const seen = new Set(selectedFiles.value.map(f => f.name + '|' + f.size + '|' + f.lastModified))
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue
    const id = f.name + '|' + f.size + '|' + f.lastModified
    if (seen.has(id)) continue
    seen.add(id); f._key = nk()
    previewCache.value.set(f._key, URL.createObjectURL(f))
    selectedFiles.value.push(f)
  }
}
function removeFile(i) {
  const f = selectedFiles.value[i]
  if (f?._key) { const u = previewCache.value.get(f._key); if (u) URL.revokeObjectURL(u); previewCache.value.delete(f._key) }
  selectedFiles.value.splice(i, 1)
}
function clearAll() { for (const u of previewCache.value.values()) URL.revokeObjectURL(u); previewCache.value.clear(); selectedFiles.value = []; results.value = []; data.value = { totalOriginalSize: 0, totalCompressedSize: 0, totalRatio: '0%', sessionId: '' } }
function onDrop(e) { dragOver.value = false; if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }
function onFileSelect(e) { if (e.target.files.length) addFiles(e.target.files); e.target.value = '' }

// 压缩
async function doCompress() {
  if (!selectedFiles.value.length) return
  compressing.value = true; results.value = []
  const msg = ElMessage({ message: `正在压缩 ${selectedFiles.value.length} 张图片...`, type: 'info', duration: 0 })
  try {
    // 快照原图 URL，防止后续文件列表变动导致对比断裂
    const origUrls = previews.value.map(p => p.url)

    const fd = new FormData()
    for (const f of selectedFiles.value) fd.append('files', f)
    fd.append('quality', String(quality.value))
    if (maxWidth.value) fd.append('maxWidth', String(maxWidth.value))
    if (maxHeight.value) fd.append('maxHeight', String(maxHeight.value))
    fd.append('outputFormat', outputFormat.value)
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/compress', { method: 'POST', headers: { 'X-Auth-Token': token }, body: fd })
    const json = await res.json(); msg.close()
    if (json.success) {
      data.value = json.data
      results.value = json.data.results.map((r, i) => ({
        ...r,
        previewUrl: '/uploads/temp/compress/' + encodeURIComponent(r.compressedName),
        _originalPreviewUrl: origUrls[i] || '',
      }))
      ElMessage.success(`压缩完成！节省 ${json.data.totalRatio}`)
    } else ElMessage.error(json.error || '压缩失败')
  } catch (e) { msg.close(); ElMessage.error('压缩失败') }
  finally { compressing.value = false }
}

// 对比弹窗
function openCompare(i) {
  compareIdx.value = i
  compareOriginalUrl.value = results.value[i]._originalPreviewUrl || ''
  compareHover[0] = false
  compareVisible.value = true
}
function onCompareDialogOpen() { nextTick(() => { compareHover[0] = false }) }

// 保存弹窗
function openSave(i) {
  saveIdx.value = i
  const r = results.value[i]
  saveName.value = r.originalName.replace(/\.[^.]+$/, '')
  saveCategory.value = ''
  saveVisible.value = true
}
async function doSave() {
  if (saveIdx.value === null) return
  const token = localStorage.getItem('pan_token') || ''
  const item = { ...results.value[saveIdx.value], name: saveName.value, category: saveCategory.value }
  try {
    const res = await fetch('/api/tools/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ items: [item] })
    })
    const json = await res.json()
    if (json.success) { ElMessage.success('已保存到素材库'); saveVisible.value = false }
    else ElMessage.error(json.error || '保存失败')
  } catch (e) { ElMessage.error('保存失败') }
}

function downloadOne(r) {
  const a = document.createElement('a'); a.href = authUrl(r.downloadUrl)
  a.download = r.originalName.replace(/\.[^.]+$/, '') + '_压缩.' + (r.format || 'webp')
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
function downloadAll() { window.open(authUrl('/api/tools/download-all/' + encodeURIComponent(data.value.sessionId)), '_blank') }

onUnmounted(() => { for (const u of previewCache.value.values()) URL.revokeObjectURL(u); previewCache.value.clear() })
</script>

<style scoped>
.compress-page { max-width: 1160px; margin: 0 auto; }

/* 上传 + 设置 */
.top-section { margin-bottom: 24px; }

.upload-card {
  background: #fff; border: 2px dashed #d1d5db; border-radius: 18px;
  padding: 56px 40px; text-align: center;
  transition: border-color 0.2s, background 0.2s;
}
.upload-card.drag-in { border-color: #6366f1; background: #eef2ff; }
.upload-card.compact { border-style: solid; border-color: #e5e7eb; padding: 22px 28px; text-align: left; }

.up-icon { color: #6366f1; margin-bottom: 16px; }
.drag-in .up-icon { transform: scale(1.12); transition: transform 0.2s; }
.up-heading { font-size: 26px; font-weight: 800; color: #111827; margin: 0 0 8px; }
.up-desc { font-size: 16px; color: #6b7280; margin: 0 0 24px; }
.up-note { font-size: 13px; color: #d1d5db; margin: 16px 0 0; }

.up-compact { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.up-summary { display: flex; align-items: baseline; gap: 10px; }
.badge { font-size: 20px; font-weight: 800; color: #6366f1; }
.size { font-size: 15px; color: #6b7280; font-weight: 600; }
.up-actions { display: flex; gap: 8px; }

.up-files { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; }
.up-files::-webkit-scrollbar { height: 4px; }
.up-files::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }

.up-file-chip {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px 8px 8px; border-radius: 12px;
  background: #f9fafb; border: 1px solid #e5e7eb; min-width: 230px; flex-shrink: 0;
}
.up-file-chip img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.up-file-info { flex: 1; min-width: 0; }
.up-file-info .name { display: block; font-size: 13px; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.up-file-info .meta { font-size: 12px; color: #9ca3af; margin-top: 1px; }
.up-file-chip .del {
  width: 24px; height: 24px; border-radius: 50%; border: none;
  background: #e5e7eb; color: #6b7280; cursor: pointer;
  font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.up-file-chip .del:hover { background: #fecaca; color: #dc2626; }

.settings-row {
  display: flex; align-items: flex-end; gap: 30px; flex-wrap: wrap;
  margin-top: 18px; padding: 24px 28px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.setting-col label { display: block; font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 10px; }
.setting-col label i { font-weight: 400; color: #9ca3af; font-style: normal; font-size: 12px; }

.q-presets { display: flex; gap: 4px; margin-bottom: 12px; }
.q-presets button {
  padding: 7px 16px; border-radius: 8px; border: 1.5px solid #e5e7eb;
  background: #fff; font-size: 13px; font-weight: 700; color: #6b7280; cursor: pointer;
}
.q-presets button:hover { border-color: #a5b4fc; color: #6366f1; }
.q-presets button.on { border-color: #6366f1; background: #eef2ff; color: #6366f1; }
.q-range { display: flex; align-items: center; gap: 12px; width: 260px; }
.q-num { font-size: 24px; font-weight: 800; min-width: 36px; text-align: center; }
.q-label { font-size: 12px; font-weight: 600; color: #fff; padding: 2px 10px; border-radius: 8px; margin-left: 8px; }

.fmt-row { display: flex; gap: 6px; }
.fmt-chip {
  padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e5e7eb;
  background: #fff; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.fmt-chip:hover { border-color: #a5b4fc; }
.fmt-chip.sel { border-color: #6366f1; background: #eef2ff; }
.fmt-chip input { display: none; }
.fmt-chip-name { font-size: 14px; font-weight: 700; color: #1f2937; }
.fmt-chip-desc { font-size: 11px; color: #9ca3af; }

.size-inputs { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #374151; }
.size-x { color: #d1d5db; margin: 0 4px; font-size: 16px; }
.action-col { margin-left: auto; }

/* 结果 */
.results-section { margin-bottom: 28px; }

.result-strip {
  display: flex; align-items: center; gap: 16px;
  background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px;
  padding: 18px 24px; margin-bottom: 16px;
}
.strip-saved { font-size: 24px; font-weight: 800; color: #059669; }
.strip-detail { font-size: 15px; color: #374151; font-weight: 500; }
.strip-gap { flex: 1; }

.result-table {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;
}
.rt-row {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 20px; border-bottom: 1px solid #f3f4f6;
}
.rt-row:last-child { border-bottom: none; }
.rt-header { background: #f9fafb; font-size: 13px; font-weight: 700; color: #6b7280; padding: 12px 20px; border-bottom: 1px solid #e5e7eb; }
.rt-col-name { flex: 2; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rt-col-size { flex: 1.5; display: flex; align-items: center; gap: 6px; font-size: 14px; }
.rt-col-ratio { flex: 0 0 80px; text-align: center; }
.rt-col-act { flex: 0 0 auto; display: flex; gap: 6px; }

.rt-fname { font-size: 14px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rt-dims { font-size: 12px; color: #9ca3af; }
.rt-old { color: #9ca3af; text-decoration: line-through; }
.rt-arrow { color: #d1d5db; margin: 0 2px; }
.rt-new { color: #10b981; font-weight: 700; }
.rt-ratio-badge { font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 6px; }

/* 对比弹窗 */
.cmp-d-hint {
  text-align: center; font-size: 14px; color: #9ca3af; margin: 0 0 12px;
}
.cmp-d-wrap {
  position: relative; width: 100%; aspect-ratio: 16/10;
  background: #111; cursor: col-resize; overflow: hidden;
  border-radius: 14px;
}
.cmp-d-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.cmp-d-after { z-index: 2; }
.cmp-d-split {
  position: absolute; top: 0; bottom: 0; width: 3px; background: #fff;
  z-index: 3; pointer-events: none; box-shadow: 0 0 14px rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
}
.cmp-d-split span {
  background: #fff; color: #6366f1; padding: 6px 12px; border-radius: 16px;
  font-size: 14px; font-weight: 700; box-shadow: 0 2px 12px rgba(0,0,0,.2);
}
.cmp-d-tag {
  position: absolute; top: 14px; z-index: 4;
  font-size: 13px; font-weight: 700; color: #fff;
  background: rgba(0,0,0,.6); backdrop-filter: blur(6px);
  padding: 4px 14px; border-radius: 8px;
}
.cmp-d-tag.l { left: 14px; }
.cmp-d-tag.r { right: 14px; }
.cmp-d-tip {
  position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
  z-index: 4; font-size: 15px; color: #fff;
  background: rgba(0,0,0,.5); backdrop-filter: blur(6px);
  padding: 5px 18px; border-radius: 16px; white-space: nowrap;
}
.cmp-d-info {
  margin-top: 14px; display: flex; flex-direction: column; gap: 4px;
}
.cmp-d-name { font-size: 16px; font-weight: 600; color: #111827; }
.cmp-d-ratio { font-size: 14px; font-weight: 700; padding: 3px 10px; border-radius: 6px; display: inline-block; width: fit-content; }
.cmp-d-detail { font-size: 13px; color: #6b7280; }

/* ===== 保存弹窗 ===== */
.sd-header { display: flex; align-items: center; gap: 12px; }
.sd-header-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: #fff; }
.sd-header-title { font-size: 17px; font-weight: 800; color: #111827; margin: 0; line-height: 1.2; }
.sd-header-sub { font-size: 12px; color: #9ca3af; margin: 2px 0 0; }

.sd-body { display: flex; flex-direction: column; gap: 20px; }

.sd-preview-new {
  position: relative; width: 100%; height: 220px; background: #f3f4f6;
  border-radius: 14px; overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.sd-preview-new img { width: 100%; height: 100%; object-fit: contain; }
.sd-preview-badge {
  position: absolute; bottom: 10px; right: 10px;
  font-size: 11px; font-weight: 700; color: #fff;
  background: rgba(0,0,0,.55); backdrop-filter: blur(6px);
  padding: 4px 10px; border-radius: 8px;
}

.sd-info-strip {
  display: flex; gap: 16px; flex-wrap: wrap;
  background: #f9fafb; border-radius: 12px; padding: 14px 18px;
}
.sd-info-item { display: flex; flex-direction: column; gap: 2px; min-width: 100px; }
.sd-info-label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.sd-info-val { font-size: 13px; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.sd-form { display: flex; flex-direction: column; gap: 16px; }
.sd-field label { display: block; font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; }

.cat-quick { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 8px; }
.cat-quick-btn {
  padding: 5px 14px; border-radius: 16px; border: 1px solid #e5e7eb;
  background: #fff; font-size: 12px; font-weight: 600; color: #6b7280;
  cursor: pointer; transition: all 0.15s;
}
.cat-quick-btn:hover { border-color: #a5b4fc; color: #6366f1; }
.cat-quick-btn.on { border-color: #6366f1; background: #eef2ff; color: #6366f1; }

.sd-footer { display: flex; justify-content: flex-end; gap: 10px; }

.tag-g { color: #059669; background: #d1fae5; }
.tag-y { color: #b45309; background: #fef3c7; }
.tag-n { color: #6b7280; background: #f3f4f6; }
</style>
