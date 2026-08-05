<template>
  <div class="vlib-page">

    <!-- 顶栏 + Tab -->
    <div class="vl-topbar">
      <div class="vl-title">
        <h2><el-icon :size="24"><VideoCameraFilled /></el-icon> 视频素材库</h2>
        <div class="vl-tabs">
          <button class="vl-tab active">
            🏭 工厂展厅视频
            <span class="vl-tab-n">{{ list.length }}</span>
          </button>
        </div>
      </div>
      <div class="vl-actions">
        <el-input v-model="search" placeholder="搜索名称或分类..." clearable size="default" style="width:200px;" :prefix-icon="Search" />
        <el-select v-model="sortBy" size="default" style="width:120px;">
          <el-option label="最新优先" value="newest" /><el-option label="最旧优先" value="oldest" />
          <el-option label="名称 A-Z" value="name" /><el-option label="体积最大" value="size" />
        </el-select>
        <el-button type="primary" round size="large" @click="openUpload"><el-icon><Plus /></el-icon> 上传视频</el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!filteredList.length && !search" class="vl-empty">
      <el-icon :size="64" color="#d1d5db"><VideoCameraFilled /></el-icon>
      <p style="font-size:16px;font-weight:600;color:#6b7280;margin:16px 0 6px;">
        还没有视频素材
      </p>
      <p style="font-size:14px;color:#9ca3af;margin-bottom:20px;">
        上传展厅、产线等视频素材
      </p>
      <el-button type="primary" size="large" round @click="openUpload"><el-icon><Plus /></el-icon> 上传视频</el-button>
    </div>

    <div v-else-if="!filteredList.length" class="vl-empty"><p>没有匹配的素材</p></div>

    <!-- 卡片网格 -->
    <div v-else class="vl-grid">
      <div v-for="item in filteredList" :key="item.id" class="vl-card" @click="openDetail(item)">
        <div class="vl-card-img" :class="item.coverUrl ? 'portrait' : 'landscape'">
          <img v-if="item.coverUrl" :src="item.coverUrl" loading="lazy" />
          <template v-else>
            <video :src="item.previewUrl" preload="metadata" muted class="vl-card-thumb-video" />
            <div class="vl-card-play-icon"><el-icon :size="42"><VideoPlay /></el-icon></div>
          </template>
          <span class="vl-img-dur">{{ formatDuration(item.duration) }}</span>
        </div>
        <div class="vl-card-body">
          <span class="vl-card-name" :title="item.name || item.originalName">{{ item.name || item.originalName }}</span>
          <span v-if="item.category" class="vl-card-cat">{{ item.category }}</span>
          <div class="vl-card-line">
            <span>{{ item.width }}×{{ item.height }}</span>
            <span class="sep">·</span>
            <span>{{ (item.format || 'mp4').toUpperCase() }}</span>
            <span class="sep">·</span>
            <span class="vl-card-size">{{ formatSize(item.compressedSize || item.originalSize) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" width="min(96vw, 1100px)" destroy-on-close align-center :close-on-click-modal="false">
      <template #header>
        <div class="dlg-hd">
          <div class="dlg-hd-icon"><el-icon :size="20"><VideoCameraFilled /></el-icon></div>
          <div>
            <p class="dlg-hd-title">视频详情</p>
            <p class="dlg-hd-sub">预览、编辑信息或下载</p>
          </div>
        </div>
      </template>
      <div v-if="detailItem" class="detail-body">
        <div class="db-video-bar">
          <div class="db-player">
            <video :src="detailItem.previewUrl" controls autoplay preload="auto" class="db-video" />
          </div>

        </div>

        <div class="db-info">
          <div class="dbi-item">
            <span class="dbi-value">{{ detailItem.width }} × {{ detailItem.height }}</span>
            <span class="dbi-label">分辨率</span>
          </div>
          <div class="dbi-item">
            <span class="dbi-value">{{ formatDuration(detailItem.duration) }}</span>
            <span class="dbi-label">时长</span>
          </div>
          <div class="dbi-item">
            <span class="dbi-value">{{ (detailItem.format || 'mp4').toUpperCase() }}</span>
            <span class="dbi-label">格式</span>
          </div>
          <div class="dbi-item">
            <span class="dbi-value">{{ formatSize(detailItem.compressedSize || detailItem.originalSize) }}</span>
            <span class="dbi-label">体积</span>
          </div>
          <div class="dbi-item dbi-name">
            <span class="dbi-value" :title="detailItem.originalName">{{ detailItem.originalName }}</span>
            <span class="dbi-label">原文件</span>
          </div>
        </div>

        <div class="db-form">
          <div class="dbf-field">
            <label>素材名称</label>
            <el-input v-model="editName" size="large" maxlength="60" clearable placeholder="素材名称" />
          </div>
          <div class="dbf-field">
            <label>分类</label>
            <el-select v-model="editCategory" placeholder="选择或输入分类" allow-create filterable clearable size="large" style="width:100%;">
              <el-option v-for="c in allCategories" :key="c" :label="c" :value="c" />
            </el-select>
          </div>
        </div>

        <div class="db-btns">
          <el-button type="primary" round size="large" @click="saveDetail"><el-icon><Check /></el-icon> 保存修改</el-button>
          <el-button round size="large" @click="downloadSaved(detailItem)"><el-icon><Download /></el-icon> 下载视频</el-button>
          <el-button round size="large" @click="shareVideo(detailItem)"><el-icon><Link /></el-icon> 分享</el-button>
          <el-button round size="large" type="danger" plain @click="deleteDetail"><el-icon><Delete /></el-icon> 删除</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 上传弹窗 -->
    <el-dialog v-model="uploadVisible" width="min(95vw, 640px)" destroy-on-close align-center :close-on-click-modal="false">
      <template #header>
        <div class="dlg-hd">
          <div class="dlg-hd-icon up-green"><el-icon :size="20"><UploadFilled /></el-icon></div>
          <div>
            <p class="dlg-hd-title">上传视频</p>
            <p class="dlg-hd-sub">一次可上传多个视频，≤ 1GB/个</p>
          </div>
        </div>
      </template>

      <div class="up-zone" :class="{ 'drag-in': upDrag }"
        @dragover.prevent="upDrag = true" @dragleave="upDrag = false" @drop.prevent="onUpDrop">
        <template v-if="!upFiles.length">
          <el-icon :size="48" color="#6366f1"><VideoCameraFilled /></el-icon>
          <p class="up-zone-title">选择视频文件</p>
          <p class="up-zone-hint">MP4 · MOV · AVI · MKV · WebM · 单文件 ≤ 1GB · 一次最多 20 个</p>
          <input ref="upFileInput" type="file" accept="video/*" multiple hidden @change="onUpFileSelect" />
          <el-button type="primary" size="large" round @click="upFileInput?.click()"><el-icon><FolderAdd /></el-icon> 选择视频</el-button>
        </template>
        <template v-else>
          <div class="up-file-head">
            <span class="up-file-name">{{ upFiles.length }} 个视频</span>
            <span class="up-file-size">{{ formatSize(totalUpSize) }}</span>
            <el-button size="small" round type="danger" plain @click="clearUpFiles">清空</el-button>
          </div>
          <div class="up-file-chips">
            <div v-for="(f, i) in upFiles" :key="i" class="up-file-chip">
              <span class="up-chip-name" :title="f.name">{{ f.name }}</span>
              <span class="up-chip-sz">{{ formatSize(f.size) }}</span>
              <button class="up-chip-close" @click="upFiles.splice(i,1); removeUpPreview(i)">✕</button>
            </div>
          </div>
        </template>
      </div>

      <div class="up-form">
        <div class="dbf-field">
          <label>素材名称</label>
          <el-input v-model="upName" placeholder="留空使用原文件名" size="large" maxlength="60" clearable />
        </div>
        <div class="dbf-field">
          <label>分类</label>
          <el-select v-model="upCategory" placeholder="选择或输入分类" allow-create filterable clearable size="large" style="width:100%;">
            <el-option v-for="c in allCategories" :key="c" :label="c" :value="c" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <div class="dlg-footer">
          <el-button size="large" round @click="uploadVisible = false">取消</el-button>
          <el-button size="large" round type="primary" :loading="upLoading" :disabled="!upFiles.length" @click="doUpload">
            <el-icon v-if="!upLoading"><Check /></el-icon> 上传至 工厂展厅 ({{ upFiles.length }})
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatSize, authUrl } from '../api'
import { Search } from '@element-plus/icons-vue'

const list = ref([])
const search = ref('')
const sortBy = ref('newest')
const presetCategories = ['工厂展厅', '产品实拍', '生产线', '安装视频', '宣传片', '社交媒体', '原始素材']
const dynamicCategories = ref([])
const allCategories = computed(() => [...new Set([...presetCategories, ...dynamicCategories.value])].sort())

function formatDuration(sec) {
  if (!sec) return '--'
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60)
  return m + ':' + String(s).padStart(2, '0')
}

const filteredList = computed(() => {
  let arr = list.value.filter(v => v.purpose !== 'tiktok')
  if (search.value) {
    const kw = search.value.toLowerCase()
    arr = arr.filter(item => (item.name || item.originalName || '').toLowerCase().includes(kw))
  }
  switch (sortBy.value) {
    case 'newest': arr.sort((a, b) => b.id - a.id); break
    case 'oldest': arr.sort((a, b) => a.id - b.id); break
    case 'name': arr.sort((a, b) => (a.name || a.originalName || '').localeCompare(b.name || b.originalName || '')); break
    case 'size': arr.sort((a, b) => (b.compressedSize || b.originalSize) - (a.compressedSize || a.originalSize)); break
  }
  return arr
})

const detailVisible = ref(false)
const detailItem = ref(null)
const editName = ref('')
const editCategory = ref('')
function openDetail(item) { detailItem.value = item; editName.value = item.name || item.originalName || ''; editCategory.value = item.category || ''; detailVisible.value = true }
async function saveDetail() {
  if (!detailItem.value) return
  try {
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/saved-video/' + detailItem.value.id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ name: editName.value, category: editCategory.value })
    })
    const json = await res.json()
    if (json.success) { ElMessage.success('已更新'); detailVisible.value = false; await load() }
    else ElMessage.error(json.error || '更新失败')
  } catch { ElMessage.error('更新失败') }
}
async function deleteDetail() {
  if (!detailItem.value) return
  try { await ElMessageBox.confirm('确定删除？', '确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }) } catch { return }
  try {
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/saved-video/' + detailItem.value.id, { method: 'DELETE', headers: { 'X-Auth-Token': token } })
    const json = await res.json()
    if (json.success) { ElMessage.success('已删除'); detailVisible.value = false; await load() }
    else ElMessage.error(json.error || '删除失败')
  } catch { ElMessage.error('删除失败') }
}
function downloadSaved(item) {
  const a = document.createElement('a'); a.href = authUrl(item.downloadUrl)
  a.download = (item.name || item.originalName || 'video').replace(/[<>:"/\\|?*]/g,'_')
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
async function shareVideo(item) {
  const url = window.location.origin + '/share/video/' + item.id
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('分享链接已复制，粘贴到微信即可预览')
  } catch {
    const ta = document.createElement('textarea'); ta.value = url
    document.body.appendChild(ta); ta.select(); document.execCommand('copy')
    document.body.removeChild(ta); ElMessage.success('分享链接已复制')
  }
}
function downloadCover(item) {
  const a = document.createElement('a'); a.href = authUrl(item.coverDownloadUrl)
  a.download = 'cover_' + (item.name || item.originalName || 'cover').replace(/[<>:"/\\|?*]/g,'_') + '.jpg'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

// 上传
const uploadVisible = ref(false)
const upFiles = ref([])
const upPreviews = ref([])
const upDrag = ref(false)
const upName = ref('')
const upCategory = ref('')
const upLoading = ref(false)
const upFileInput = ref(null)

const totalUpSize = computed(() => upFiles.value.reduce((s, f) => s + f.size, 0))

function openUpload() {
  upName.value = ''; upCategory.value = ''
  upFiles.value = []; upPreviews.value = []
  uploadVisible.value = true
}
function onUpDrop(e) { upDrag.value = false; addUpFiles(e.dataTransfer.files) }
function onUpFileSelect(e) { addUpFiles(e.target.files); e.target.value = '' }
function addUpFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith('video/')) continue
    if (f.size > 1024 * 1024 * 1024) { ElMessage.warning(f.name + ' 超过1GB，已跳过'); continue }
    upFiles.value.push(f)
  }
}
function removeUpPreview(i) { }
function clearUpFiles() { upFiles.value = []; upPreviews.value = [] }

async function doUpload() {
  if (!upFiles.value.length) return
  upLoading.value = true
  try {
    const fd = new FormData()
    for (const f of upFiles.value) fd.append('files', f)
    fd.append('name', upName.value); fd.append('category', upCategory.value)
    fd.append('purpose', 'normal')
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/upload-video-media', { method: 'POST', headers: { 'X-Auth-Token': token }, body: fd })
    const json = await res.json()
    if (json.success) { ElMessage.success(`已上传 ${json.data.length} 个视频`); uploadVisible.value = false; await load() }
    else ElMessage.error(json.error || '上传失败')
  } catch (e) { ElMessage.error('上传失败') }
  finally { upLoading.value = false }
}

async function load() {
  try {
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/saved-videos', { headers: { 'X-Auth-Token': token } })
    const json = await res.json()
    if (json.success) {
      list.value = json.data
      const dynamic = new Set()
      json.data.forEach(d => { if (d.category && !presetCategories.includes(d.category)) dynamic.add(d.category) })
      dynamicCategories.value = [...dynamic]
    }
  } catch {}
}
onMounted(() => load())
onUnmounted(() => {})
watch([search, sortBy], () => {})
</script>

<style scoped>
.vlib-page { max-width: 1400px; margin: 0 auto; }

/* 顶栏 */
.vl-topbar { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.vl-title { display: flex; flex-direction: column; gap: 14px; }
.vl-title h2 { font-size: 22px; font-weight: 800; color: #111827; margin: 0; display: flex; align-items: center; gap: 10px; }

/* Tab */
.vl-tabs { display: flex; gap: 6px; }
.vl-tab {
  padding: 10px 20px; border-radius: 12px; border: 1.5px solid #e5e7eb;
  background: #fff; font-size: 14px; font-weight: 700; color: #6b7280;
  cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 8px;
}
.vl-tab:hover { border-color: #a5b4fc; color: #6366f1; }
.vl-tab.active { border-color: #6366f1; background: #eef2ff; color: #6366f1; }
.vl-tab-n { font-size: 12px; font-weight: 800; padding: 1px 8px; border-radius: 10px; background: #f3f4f6; color: #6b7280; }
.vl-tab.active .vl-tab-n { background: #c7d2fe; color: #4338ca; }

.vl-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; align-self: flex-end; }

.vl-empty { text-align: center; padding: 100px 20px; }

/* 卡片 */
.vl-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr); gap: 16px;
}
.vl-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
  overflow: hidden; cursor: pointer; border: none; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 0 0 1px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.06); will-change: transform; content-visibility: auto;
}
.vl-card:hover { transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(99,102,241,.12), 0 6px 20px rgba(99,102,241,.12); }

.vl-card-img { width: 100%; background: #0a0a0a; position: relative; overflow: hidden; }
.vl-card-img.portrait { aspect-ratio: 3/4; }
.vl-card-img.landscape { aspect-ratio: 16/9; }

.vl-card-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.vl-card:hover .vl-card-img img { transform: scale(1.05); transition: transform 0.3s ease; }
.vl-card-thumb-video { width: 100%; height: 100%; object-fit: cover; display: block; opacity: .6; }
.vl-card:hover .vl-card-thumb-video { opacity: .9; }
.vl-card-play-icon { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.8); z-index: 2; }
.vl-card:hover .vl-card-play-icon { transform: scale(1.15); color: #fff; }
.vl-img-dur {
  position: absolute; bottom: 6px; right: 8px; z-index: 3;
  font-size: 12px; font-weight: 700; color: #fff;
  background: rgba(0,0,0,.65); backdrop-filter: blur(8px); padding: 3px 9px; border-radius: 6px;
}

.vl-card-body { padding: 12px 14px; }
.vl-card-name { display: block; font-size: 14px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
.vl-card-cat { display: inline-block; font-size: 11px; font-weight: 600; color: #6366f1; background: rgba(99,102,241,.08); padding: 2px 8px; border-radius: 4px; margin-bottom: 2px; }
.vl-card-line { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #6b7280; margin-top: 3px; }
.vl-card-line .sep { margin: 0 3px; color: #d1d5db; font-size: 10px; }
.vl-card-size { font-weight: 700; color: #374151; margin-left: auto; }

/* 弹窗头部 */
.dlg-hd { display: flex; align-items: center; gap: 14px; }
.dlg-hd-icon { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.up-green { background: linear-gradient(135deg, #10b981, #34d399); }
.dlg-hd-title { font-size: 18px; font-weight: 800; color: #111827; margin: 0; line-height: 1.2; }
.dlg-hd-sub { font-size: 13px; color: #9ca3af; margin: 2px 0 0; }
.dlg-footer { display: flex; justify-content: flex-end; gap: 10px; }

/* 详情 */
.detail-body { display: flex; flex-direction: column; gap: 18px; }

.db-video-bar { display: flex; gap: 16px; align-items: flex-start; }
.db-player { flex: 1; min-width: 0; background: #000; border-radius: 16px; overflow: hidden; }
.db-video { width: 100%; aspect-ratio: 16/9; object-fit: contain; display: block; background: #000; }

.db-cover-card { flex-shrink: 0; width: 160px; display: flex; flex-direction: column; gap: 8px; }
.db-cover-label { font-size: 13px; font-weight: 700; color: #374151; }
.db-cover-img-wrap { width: 100%; aspect-ratio: 3/4; background: #f3f4f6; border-radius: 12px; overflow: hidden; }
.db-cover-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
.db-cover-empty {
  width: 100%; aspect-ratio: 3/4; background: #f9fafb;
  border-radius: 12px; border: 2px dashed #e5e7eb;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: #9ca3af; font-size: 12px;
}
.db-cover-dl { width: 100%; }

.db-info { display: flex; flex-wrap: wrap; background: #f9fafb; border-radius: 12px; padding: 4px 0; }
.dbi-item { flex: 1; min-width: 80px; padding: 12px 18px; display: flex; flex-direction: column; align-items: center; gap: 2px; border-right: 1px solid #f3f4f6; }
.dbi-item:last-child { border-right: none; }
.dbi-name { min-width: 140px; }
.dbi-value { font-size: 14px; font-weight: 700; color: #1f2937; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dbi-label { font-size: 11px; color: #9ca3af; font-weight: 500; }

.db-form { display: flex; gap: 16px; flex-wrap: wrap; }
.dbf-field { flex: 1; min-width: 200px; }
.dbf-field label { display: block; font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 8px; }
.db-btns { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 4px; }

/* 上传 */
.up-zone {
  border: 2px dashed #d1d5db; border-radius: 18px;
  padding: 40px 24px; text-align: center; transition: all 0.2s; background: #fafafa;
}
.up-zone.drag-in { border-color: #6366f1; background: #eef2ff; }
.up-zone-title { font-size: 17px; font-weight: 700; color: #374151; margin: 12px 0 4px; }
.up-zone-hint { font-size: 14px; color: #9ca3af; margin: 0 0 18px; }
.up-file-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.up-file-name { font-size: 15px; font-weight: 700; color: #111827; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.up-file-size { font-size: 14px; color: #6b7280; font-weight: 600; }
.up-file-chips { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }
.up-file-chip {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  background: #f9fafb; border: 1px solid #e5e7eb;
}
.up-chip-name { flex: 1; font-size: 13px; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.up-chip-sz { font-size: 12px; color: #9ca3af; flex-shrink: 0; }
.up-chip-close {
  width: 22px; height: 22px; border-radius: 50%; border: none; background: #e5e7eb;
  color: #6b7280; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.up-chip-close:hover { background: #fecaca; color: #dc2626; }

.up-form { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 18px; }
</style>
