<template>
  <div class="assets-page">
    <!-- 页头 -->
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h2><el-icon :size="22"><PictureFilled /></el-icon> AI资产管理</h2>
          <p class="sub">上传 · 预览 · 下载 · 管理AI资产</p>
        </div>
      </div>
    </div>

    <!-- 操作 & 筛选栏 -->
    <div class="assets-toolbar">
      <el-button type="primary" class="assets-btn-upload" @click="openUpload">
        <el-icon :size="16"><Plus /></el-icon>
        <span>上传资产</span>
      </el-button>

      <span class="assets-count-badge">
        <span class="assets-count-num">{{ assets.length }}</span>
        <span class="assets-count-label">项</span>
      </span>

      <div class="assets-pills">
        <button
          v-for="t in typeTabs"
          :key="t.key"
          class="assets-pill"
          :class="{ active: activeType === t.key }"
          @click="activeType = t.key"
        >
          <span class="assets-pill-icon">{{ t.icon }}</span>
          {{ t.label }}
          <span class="assets-pill-n">{{ countByType(t.key) }}</span>
        </button>
      </div>

      <div class="assets-search-box">
        <el-icon :size="15" class="assets-search-icon"><Search /></el-icon>
        <input
          v-model="searchText"
          class="assets-search-input"
          placeholder="搜索资产名称、标签..."
        />
        <span v-if="searchText" class="assets-search-clear" @click="searchText = ''">
          <el-icon :size="13"><Close /></el-icon>
        </span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!filteredList.length" class="empty-state">
      <div style="font-size:56px;margin-bottom:12px;"><el-icon :size="56"><PictureFilled /></el-icon></div>
      <p style="color:#9ca3af;">{{ assets.length ? '无匹配结果' : '暂无资产，点击上方按钮上传' }}</p>
    </div>

    <!-- 卡片网格 -->
    <div v-else class="asset-grid">
      <div
        v-for="a in filteredList"
        :key="a.id"
        class="asset-card"
      >
        <div class="card-img-wrap" @click="preview(a)">
          <img :src="assetUrl(a)" :alt="a.name" class="card-img" loading="lazy" referrerpolicy="no-referrer" />
          <div class="type-badge" :style="{ background: typeColor(a.type) }">
            {{ typeLabelShort(a.type) }}
          </div>
        </div>
        <div class="card-info">
          <div class="card-name">{{ a.name }}</div>
          <div class="card-meta">
            <span>{{ formatSize(a.fileSize) }}</span>
            <span v-if="a.tags && a.tags.length" class="card-tags">{{ a.tags.slice(0,3).join(' · ') }}</span>
          </div>
        </div>
        <div class="card-footer">
          <el-button size="small" round @click="preview(a)" title="预览"><el-icon :size="15"><View /></el-icon></el-button>
          <a :href="api.assets.downloadUrl(a.id)" style="text-decoration:none;" title="下载">
            <el-button size="small" round><el-icon :size="15"><Download /></el-icon></el-button>
          </a>
          <el-button size="small" round @click="openEdit(a)" title="编辑"><el-icon :size="15"><Edit /></el-icon></el-button>
          <el-button size="small" round type="danger" plain @click="doDelete(a)" title="删除"><el-icon :size="15"><Delete /></el-icon></el-button>
        </div>
      </div>
    </div>

    <!-- ====== Lightbox 灯箱 ====== -->
    <teleport to="body">
      <transition name="lightbox">
        <div v-if="previewAsset" class="lightbox-overlay" @click="closePreview">
          <div class="lightbox-toolbar" @click.stop>
            <span class="lb-name">{{ previewAsset.name }}</span>
            <span class="lb-meta">{{ typeLabel(previewAsset.type) }} · {{ formatSize(previewAsset.fileSize) }}</span>
            <div style="flex:1;" />
            <a :href="api.assets.downloadUrl(previewAsset.id)">
              <el-button size="small" type="primary"><el-icon :size="14"><Download /></el-icon> 下载原图</el-button>
            </a>
            <el-button circle size="small" @click="closePreview"><el-icon :size="15"><Close /></el-icon></el-button>
          </div>
          <div class="lightbox-img-wrap" @click.stop>
            <img
              :src="assetUrl(previewAsset)"
              :alt="previewAsset.name"
              class="lightbox-img"
              referrerpolicy="no-referrer"
            />
          </div>
        </div>
      </transition>
    </teleport>

    <!-- ====== 上传对话框 ====== -->
    <el-dialog v-model="uploadOpen" title="上传资产" width="620px" destroy-on-close>
      <div
        class="drop-zone"
        :class="{ dragover: dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <div class="drop-icon"><el-icon :size="40"><Upload /></el-icon></div>
        <p class="drop-text">拖拽图片到此处</p>
        <el-button size="small" @click.stop="triggerFileInput">或点击选择文件</el-button>
        <p class="drop-hint">支持 JPG / PNG / GIF / WebP / TIFF，单文件最大 50MB</p>
      </div>
      <input ref="fileInput" type="file" multiple accept="image/*" style="display:none" @change="onFileSelect" />

      <div v-if="uploadFiles.length" class="file-list">
        <div v-for="(item, i) in uploadPreviews" :key="i" class="file-item">
          <img :src="item.url" class="file-thumb" />
          <div class="file-info">
            <span class="file-name">{{ item.file.name }}</span>
            <span class="file-size">{{ formatSize(item.file.size) }}</span>
          </div>
          <el-button size="small" circle text @click="removeFile(i)"><el-icon :size="14"><Close /></el-icon></el-button>
        </div>
      </div>

      <el-form label-width="80px" size="default" style="margin-top:16px;">
        <el-form-item label="资产名称">
          <el-input v-model="uploadForm.name" placeholder="例如：陈凡人物图" size="large" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="uploadForm.type" size="large" style="width:100%;">
            <el-option v-for="t in assetTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="uploadForm.tagsStr" placeholder="逗号分隔，如: 男主, 欧美" size="large" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="uploadOpen = false">取消</el-button>
        <el-button type="primary" @click="doUpload" :disabled="!uploadFiles.length" :loading="uploading">
          <el-icon :size="14"><Upload /></el-icon> 上传 ({{ uploadFiles.length }})
        </el-button>
      </template>
    </el-dialog>

    <!-- ====== 编辑对话框 ====== -->
    <el-dialog v-model="editOpen" title=" 编辑资产" width="520px" destroy-on-close>
      <el-form label-width="80px" size="default">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" size="large" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="editForm.type" size="large" style="width:100%;">
            <el-option v-for="t in assetTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="editForm.tagsStr" placeholder="逗号分隔" size="large" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editOpen = false">取消</el-button>
        <el-button type="primary" @click="doUpdate"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, formatSize } from '../api'

const assetTypes = [
  { value: 'character', label: '人物', color: '#a78bfa' },
  { value: 'scene', label: '场景', color: '#22d3ee' },
  { value: 'prop', label: '道具', color: '#fb923c' },
]

const typeTabs = [
  { key: '', label: '全部', icon: '' },
  { key: 'character', label: '人物', icon: '' },
  { key: 'scene', label: '场景', icon: '' },
  { key: 'prop', label: '道具', icon: '' },
]

function typeLabel(type) { return assetTypes.find(t => t.value === type)?.label || type }
function typeLabelShort(type) { return ({ character: '人物', scene: '场景', prop: '道具' })[type] || type }
function typeColor(type) { return assetTypes.find(t => t.value === type)?.color || '#6366f1' }

const assets = ref([])
const activeType = ref('')
const searchText = ref('')
const uploadOpen = ref(false)
const editOpen = ref(false)
const dragOver = ref(false)
const uploading = ref(false)
const uploadFiles = ref([])
const seenFiles = new Set()
const fileInput = ref(null)

const previewCache = new Map()

const uploadPreviews = computed(() =>
  uploadFiles.value.map(f => {
    if (!previewCache.has(f)) {
      previewCache.set(f, URL.createObjectURL(f))
    }
    return { file: f, url: previewCache.get(f) }
  })
)

function removeFile(i) {
  const f = uploadFiles.value[i]
  if (previewCache.has(f)) { URL.revokeObjectURL(previewCache.get(f)); previewCache.delete(f) }
  uploadFiles.value.splice(i, 1)
}
const uploadForm = reactive({ name: '', type: 'character', tagsStr: '' })
const editForm = reactive({ name: '', type: 'character', tagsStr: '' })
const editingId = ref(null)
const previewAsset = ref(null)

const filteredList = computed(() => {
  let list = assets.value
  if (activeType.value) list = list.filter(a => a.type === activeType.value)
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    list = list.filter(a => (a.name || '').toLowerCase().includes(kw) || (a.tags || []).some(t => t.toLowerCase().includes(kw)))
  }
  return list
})

function countByType(key) { return key ? assets.value.filter(a => a.type === key).length : assets.value.length }
function assetUrl(a) { return api.assets.getUrl(a.fileName) }

function openUpload() {
  uploadForm.name = ''; uploadForm.type = 'character'; uploadForm.tagsStr = ''
  previewCache.forEach(url => URL.revokeObjectURL(url))
  previewCache.clear()
  uploadFiles.value = []; seenFiles.clear(); uploadOpen.value = true
}
function triggerFileInput() { fileInput.value?.click() }

function addFiles(files) {
  for (const f of files) {
    const key = f.name + '|' + f.size + '|' + f.lastModified
    if (!seenFiles.has(key)) {
      seenFiles.add(key)
      uploadFiles.value.push(f)
    }
  }
}
function onDrop(e) {
  dragOver.value = false
  addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')))
}
function onFileSelect(e) {
  addFiles(Array.from(e.target.files || []))
  e.target.value = ''
}

async function doUpload() {
  if (!uploadFiles.value.length) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('name', uploadForm.name); fd.append('type', uploadForm.type)
    fd.append('tags', JSON.stringify(uploadForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean)))
    for (const f of uploadFiles.value) fd.append('files', f)
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/assets/upload', { method: 'POST', headers: { 'X-Auth-Token': token }, body: fd })
    const data = await res.json()
    if (data.success) { ElMessage.success(`已上传 ${data.data.length} 个资产`); uploadOpen.value = false; load() }
    else { ElMessage.error(data.error || '上传失败') }
  } catch (e) { ElMessage.error('上传失败: ' + e.message) }
  uploading.value = false
}

function preview(a) { previewAsset.value = a }
function closePreview() { previewAsset.value = null }

function openEdit(a) {
  editingId.value = a.id
  editForm.name = a.name || ''; editForm.type = a.type || 'character'
  editForm.tagsStr = (a.tags || []).join(', '); editOpen.value = true
}

async function doUpdate() {
  const res = await api.assets.update(editingId.value, {
    name: editForm.name, type: editForm.type,
    tags: editForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean),
  })
  if (res.success) { ElMessage.success('已更新'); editOpen.value = false; if (previewAsset.value?.id === editingId.value) previewAsset.value = { ...previewAsset.value, ...res.data }; load() }
  else { ElMessage.error('更新失败') }
}

async function doDelete(a) {
  try { await ElMessageBox.confirm(`确定删除「${a.name}」？`, '确认删除', { type: 'warning', confirmButtonText: '删除' }) } catch { return }
  const res = await api.assets.delete(a.id)
  if (res.success) { ElMessage.success('已删除'); if (previewAsset.value?.id === a.id) closePreview(); load() }
  else { ElMessage.error('删除失败') }
}

function onKeyDown(e) { if (e.key === 'Escape' && previewAsset.value) closePreview() }

async function load() { const res = await api.assets.list(); if (res.success) assets.value = res.data }

onMounted(() => { load(); document.addEventListener("keydown", onKeyDown) })
onUnmounted(() => { document.removeEventListener("keydown", onKeyDown) })
</script>

<style scoped>
.assets-page { animation: fadeIn .3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
.page-header { margin-bottom:24px; }
.page-header h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }

/* ===== 工具栏 ===== */
.assets-toolbar {
  display:flex; align-items:center; gap:12px;
  margin-bottom:24px; flex-wrap:wrap;
  padding:14px 18px;
  background:#fff; border-radius:14px;
  border:1px solid #e5e7eb;
  box-shadow:0 1px 3px rgba(0,0,0,.03);
}

/* 上传按钮 */
.assets-btn-upload {
  display:inline-flex !important; align-items:center; gap:6px;
  font-weight:700 !important; border-radius:10px !important;
  padding:9px 18px !important; font-size:14px !important;
  transition:all 0.2s !important;
}
.assets-btn-upload:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.25); }

/* 数量徽标 */
.assets-count-badge {
  display:inline-flex; align-items:baseline; gap:2px;
  padding:6px 12px; border-radius:8px;
  background:#f3f4f6; border:1px solid #e5e7eb;
}
.assets-count-num { font-size:16px; font-weight:800; color:#6366f1; }
.assets-count-label { font-size:11px; color:#9ca3af; font-weight:600; }

/* 类型 pills */
.assets-pills { display:flex; gap:6px; flex:1; }
.assets-pill {
  display:inline-flex; align-items:center; gap:4px;
  padding:7px 14px; border-radius:20px;
  border:1.5px solid #e5e7eb; background:#fff;
  font-size:12px; font-weight:600; color:#6b7280;
  cursor:pointer; transition:all 0.2s;
  white-space:nowrap;
}
.assets-pill:hover { border-color:#c7d2fe; color:#6366f1; background:#eef2ff; }
.assets-pill.active { border-color:#6366f1; background:#6366f1; color:#fff; }
.assets-pill-icon { font-size:14px; }
.assets-pill-n {
  display:inline-flex; align-items:center; justify-content:center;
  min-width:18px; height:18px; padding:0 5px;
  border-radius:9px; background:#e5e7eb; color:#6b7280;
  font-size:10px; font-weight:700;
}
.assets-pill.active .assets-pill-n { background:rgba(255,255,255,.25); color:#fff; }

/* 搜索框 */
.assets-search-box {
  position:relative; display:flex; align-items:center;
  min-width:180px; max-width:240px;
}
.assets-search-icon {
  position:absolute; left:11px; color:#9ca3af; pointer-events:none;
}
.assets-search-input {
  width:100%; height:38px; padding:0 32px 0 34px;
  border:1.5px solid #e5e7eb; border-radius:10px;
  background:#f9fafb; font-size:13px; color:#374151;
  outline:none; transition:all 0.2s;
}
.assets-search-input:focus { border-color:#6366f1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.08); }
.assets-search-input::placeholder { color:#9ca3af; }
.assets-search-clear {
  position:absolute; right:8px; cursor:pointer;
  color:#9ca3af; padding:2px; border-radius:4px;
}
.assets-search-clear:hover { color:#6b7280; background:#e5e7eb; }

.empty-state { text-align:center; padding:60px 20px; }

.asset-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px; }

.asset-card {
  background:#fff; border-radius:14px; border:1px solid #e5e7eb;
  overflow:hidden; transition:all 0.2s;
  box-shadow:0 1px 3px rgba(0,0,0,.04);
}
.asset-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.08); border-color:#c7d2fe; }

.card-img-wrap {
  position:relative; width:100%; aspect-ratio:1;
  overflow:hidden; background:#f3f4f6; cursor:pointer;
}
.card-img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s; }
.asset-card:hover .card-img { transform:scale(1.05); }

.type-badge {
  position:absolute; top:8px; right:8px;
  padding:3px 10px; border-radius:6px;
  font-size:10px; font-weight:700; color:#fff;
  backdrop-filter:blur(4px);
}

.card-info { padding:12px 14px 4px; }
.card-name { font-size:14px; font-weight:700; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.card-meta { font-size:11px; color:#9ca3af; margin-top:3px; display:flex; gap:8px; align-items:center; }
.card-tags { color:#6366f1; font-size:10px; font-weight:600; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.card-footer {
  display:flex; gap:4px; padding:8px 10px 12px; justify-content:center;
}
.card-footer .el-button { transition:all 0.15s; }
.card-footer .el-button:hover { transform:scale(1.1); }

/* Lightbox */
.lightbox-overlay { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.92); display:flex; flex-direction:column; }
.lightbox-toolbar { display:flex; align-items:center; gap:12px; padding:12px 20px; background:rgba(0,0,0,.6); border-bottom:1px solid rgba(255,255,255,.08); flex-shrink:0; }
.lb-name { font-size:16px; font-weight:800; color:#fff; }
.lb-meta { font-size:11px; color:#9ca3af; }
.lightbox-img-wrap { flex:1; display:flex; align-items:center; justify-content:center; padding:20px; overflow:auto; }
.lightbox-img { max-width:95%; max-height:85vh; object-fit:contain; border-radius:4px; box-shadow:0 16px 64px rgba(0,0,0,.5); }
.lightbox-enter-active, .lightbox-leave-active { transition:opacity 0.2s ease; }
.lightbox-enter-from, .lightbox-leave-to { opacity:0; }

/* 上传 */
.drop-zone { border:2px dashed #d1d5db; border-radius:14px; padding:32px 20px; text-align:center; transition:all 0.2s; background:#f9fafb; }
.drop-zone:hover, .drop-zone.dragover { border-color:#6366f1; background:#eef2ff; }
.drop-icon { font-size:40px; margin-bottom:8px; }
.drop-text { font-size:14px; color:#9ca3af; margin:0 0 8px; }
.drop-hint { font-size:11px; color:#b0b0b0; margin:8px 0 0; }

.file-list { margin-top:12px; max-height:260px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; }
.file-item {
  display:flex; align-items:center; gap:12px;
  padding:8px 12px; border-radius:10px;
  background:#f9fafb; border:1px solid #e5e7eb;
}
.file-thumb {
  width:56px; height:56px; border-radius:8px;
  object-fit:cover; flex-shrink:0;
  background:#e5e7eb;
}
.file-info { flex:1; min-width:0; }
.file-name { font-size:13px; color:#374151; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; }
.file-size { font-size:11px; color:#9ca3af; display:block; margin-top:2px; }
</style>
