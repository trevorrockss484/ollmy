<template>
  <div class="medialib-page">

    <!-- 顶栏 -->
    <div class="ml-topbar">
      <div class="ml-title">
        <h2><el-icon :size="22"><FolderOpened /></el-icon> 素材库</h2>
        <span class="ml-count">{{ filteredList.length }} / {{ list.length }} 项</span>
      </div>
      <div class="ml-actions">
        <el-input v-model="search" placeholder="搜索名称或分类..." clearable size="default" style="width:220px;" :prefix-icon="Search" />
        <el-select v-model="filterCat" placeholder="分类筛选" clearable size="default" style="width:140px;">
          <el-option v-for="c in allCategories" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="sortBy" size="default" style="width:120px;">
          <el-option label="最新优先" value="newest" />
          <el-option label="最旧优先" value="oldest" />
          <el-option label="名称 A-Z" value="name" />
          <el-option label="体积最大" value="size" />
        </el-select>
        <el-button type="primary" round @click="openUpload"><el-icon><Plus /></el-icon> 上传素材</el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!list.length" class="ml-empty">
      <div class="ml-empty-icon"><el-icon :size="56"><FolderOpened /></el-icon></div>
      <p>素材库还是空的</p>
      <p class="ml-empty-sub">点击「上传素材」直接上传，或在图片压缩页完成压缩后保存</p>
      <el-button type="primary" round @click="openUpload"><el-icon><Plus /></el-icon> 上传素材</el-button>
    </div>

    <div v-else-if="!filteredList.length" class="ml-empty">
      <p>没有匹配的素材</p>
    </div>

    <!-- 内容区（网格 + 分页固定） -->
    <div v-else class="ml-content">
      <div class="ml-grid">
        <div v-for="item in paginatedList" :key="item.id" class="ml-card" @click="openDetail(item)">
          <div class="ml-img">
            <img :src="item.previewUrl" loading="lazy" />
          </div>
          <div class="ml-body">
            <span class="ml-name" :title="item.name || item.originalName">{{ item.name || item.originalName }}</span>
            <span v-if="item.category" class="ml-cat">{{ item.category }}</span>
            <span class="ml-dims">{{ item.width }}×{{ item.height }}</span>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1 || pageSize !== 10" class="ml-page-bar">
      <div class="ml-page-left">
        <label>每页</label>
        <select v-model.number="pageSize" @change="page = 1">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="36">36</option>
          <option :value="60">60</option>
        </select>
        <span class="ml-page-total">共 {{ filteredList.length }} 项</span>
      </div>
      <div class="ml-page-right">
        <button :disabled="page === 1" @click="page = 1">首页</button>
        <button :disabled="page === 1" @click="page--">上一页</button>
        <span class="ml-page-num">{{ page }} / {{ totalPages }}</span>
        <button :disabled="page === totalPages" @click="page++">下一页</button>
        <button :disabled="page === totalPages" @click="page = totalPages">末页</button>
      </div>
    </div>
    </div>

    <!-- 详情/编辑弹窗 -->
    <el-dialog v-model="detailVisible" width="min(95vw, 700px)" destroy-on-close align-center :close-on-click-modal="false" class="detail-dialog-root">
      <template #header>
        <div class="dlg-header">
          <div class="dlg-header-icon"><el-icon :size="18"><InfoFilled /></el-icon></div>
          <div>
            <p class="dlg-header-title">素材详情</p>
            <p class="dlg-header-sub">查看信息、编辑名称或分类</p>
          </div>
        </div>
      </template>
      <div v-if="detailItem" class="detail-body">
        <!-- 大图预览 -->
        <div class="db-preview">
          <img :src="detailItem.previewUrl" />
        </div>

        <!-- 信息横条 -->
        <div class="db-info">
          <div class="dbi-item">
            <span class="dbi-value" :title="detailItem.originalName">{{ detailItem.originalName }}</span>
            <span class="dbi-label">原始文件</span>
          </div>
          <div class="dbi-item">
            <span class="dbi-value">{{ detailItem.width }} × {{ detailItem.height }}</span>
            <span class="dbi-label">尺寸</span>
          </div>
          <div class="dbi-item">
            <span class="dbi-value">{{ detailItem.format.toUpperCase() }}</span>
            <span class="dbi-label">格式</span>
          </div>
          <div class="dbi-item">
            <span class="dbi-value">{{ formatSize(detailItem.originalSize) }}</span>
            <span class="dbi-label">原始大小</span>
          </div>
          <div class="dbi-item">
            <span class="dbi-value dbi-green">{{ formatSize(detailItem.compressedSize) }}</span>
            <span class="dbi-label">当前大小</span>
          </div>
        </div>

        <!-- 编辑表单 -->
        <div class="db-form">
          <div class="dbf-field">
            <label>素材名称</label>
            <el-input v-model="editName" size="large" maxlength="60" clearable placeholder="输入名称" />
          </div>
          <div class="dbf-field">
            <label>分类标签</label>
            <el-select v-model="editCategory" placeholder="选择或输入分类" allow-create filterable clearable size="large" style="width:100%;">
              <el-option v-for="c in allCategories" :key="c" :label="c" :value="c" />
            </el-select>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="db-btns">
          <el-button type="primary" round size="large" @click="saveDetail"><el-icon><Check /></el-icon> 保存修改</el-button>
          <el-button round size="large" @click="downloadSaved(detailItem)"><el-icon><Download /></el-icon> 下载</el-button>
          <el-button round size="large" @click="shareImage(detailItem)"><el-icon><Link /></el-icon> 分享</el-button>
          <el-button round size="large" type="danger" plain @click="deleteDetail"><el-icon><Delete /></el-icon> 删除</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 上传弹窗 -->
    <el-dialog v-model="uploadVisible" width="min(95vw, 520px)" destroy-on-close align-center :close-on-click-modal="false" class="up-dialog-root">
      <template #header>
        <div class="dlg-header">
          <div class="dlg-header-icon up-icon-green"><el-icon :size="18"><UploadFilled /></el-icon></div>
          <div>
            <p class="dlg-header-title">上传素材</p>
            <p class="dlg-header-sub">图片将原样存储到素材库</p>
          </div>
        </div>
      </template>

      <div
        class="up-zone-new"
        :class="{ 'drag-in': upDrag }"
        @dragover.prevent="upDrag = true"
        @dragleave="upDrag = false"
        @drop.prevent="onUpDrop"
      >
        <template v-if="!upFiles.length">
          <div class="upz-icon"><el-icon :size="44"><UploadFilled /></el-icon></div>
          <p class="upz-title">拖拽图片到此处</p>
          <p class="upz-hint">支持 JPG · PNG · WebP · AVIF · TIFF · BMP · HEIC</p>
          <input ref="upFileInput" type="file" multiple accept="image/*" hidden @change="onUpFileSelect" />
          <el-button type="primary" size="large" round @click="upFileInput?.click()">
            <el-icon><FolderAdd /></el-icon> 选择图片
          </el-button>
          <p class="upz-limit">单文件 ≤ 50MB · 一次最多 50 张</p>
        </template>
        <template v-else>
          <div class="upz-with-files">
            <div class="upz-top">
              <div class="upz-badge">
                <span class="upz-num">{{ upFiles.length }}</span>
                <span class="upz-label">张图片</span>
              </div>
              <div class="upz-actions">
                <input ref="upFileInput" type="file" multiple accept="image/*" hidden @change="onUpFileSelect" />
                <el-button size="default" round @click="upFileInput?.click()">添加</el-button>
                <el-button size="default" round type="danger" plain @click="clearUpFiles">清空</el-button>
              </div>
            </div>
            <div class="upz-files">
              <div v-for="(f, i) in upPreviews" :key="i" class="upz-chip">
                <img :src="f.url" />
                <div class="upz-chip-info">
                  <span class="upz-chip-name">{{ f.file.name }}</span>
                  <span class="upz-chip-size">{{ formatSize(f.file.size) }}</span>
                </div>
                <button class="upz-chip-del" @click="upFiles.splice(i,1);upPcache.get(f.file)&&(URL.revokeObjectURL(upPcache.get(f.file)),upPcache.delete(f.file))">✕</button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="up-form">
        <div class="dlg-field">
          <label>素材名称</label>
          <el-input v-model="upName" placeholder="留空使用原文件名" size="large" maxlength="60" clearable />
        </div>
        <div class="dlg-field">
          <label>分类标签</label>
          <el-select v-model="upCategory" placeholder="选择或输入分类" allow-create filterable clearable size="large" style="width:100%;">
            <el-option v-for="c in allCategories" :key="c" :label="c" :value="c" />
          </el-select>
        </div>
      </div>

      <template #footer>
        <div class="dlg-footer">
          <el-button size="large" round @click="uploadVisible = false">取消</el-button>
          <el-button size="large" round type="primary" :loading="upLoading" :disabled="!upFiles.length" @click="doUpload">
            <el-icon v-if="!upLoading"><Check /></el-icon> 上传 {{ upFiles.length || '' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { formatSize } from '../api'

const list = ref([])
const search = ref('')
const filterCat = ref('')
const sortBy = ref('newest')
const page = ref(1)
const pageSize = ref(10)

const presetCategories = ['总裁桌', '会议桌', '员工桌', '休闲空间', '沙发', '茶几', '酒店家具', '家用家具']
const dynamicCategories = ref([])
const allCategories = computed(() => {
  const merged = new Set([...presetCategories, ...dynamicCategories.value])
  return [...merged].sort()
})

const filteredList = computed(() => {
  let arr = [...list.value]
  if (search.value) {
    const kw = search.value.toLowerCase()
    arr = arr.filter(item => (item.name || item.originalName || '').toLowerCase().includes(kw) || (item.category || '').toLowerCase().includes(kw))
  }
  if (filterCat.value) arr = arr.filter(item => item.category === filterCat.value)
  switch (sortBy.value) {
    case 'newest': arr.sort((a, b) => b.id - a.id); break
    case 'oldest': arr.sort((a, b) => a.id - b.id); break
    case 'name': arr.sort((a, b) => (a.name || a.originalName || '').localeCompare(b.name || b.originalName || '')); break
    case 'size': arr.sort((a, b) => b.compressedSize - a.compressedSize); break
  }
  return arr
})
const totalPages = computed(() => Math.ceil(filteredList.value.length / pageSize.value) || 1)
const paginatedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

// 详情弹窗
const detailVisible = ref(false)
const detailItem = ref(null)
const editName = ref('')
const editCategory = ref('')

function openDetail(item) {
  detailItem.value = item
  editName.value = item.name || item.originalName || ''
  editCategory.value = item.category || ''
  detailVisible.value = true
}

async function saveDetail() {
  if (!detailItem.value) return
  try {
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/saved/' + detailItem.value.id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ name: editName.value, category: editCategory.value })
    })
    const json = await res.json()
    if (json.success) { ElMessage.success('已更新'); detailVisible.value = false; await load() }
    else ElMessage.error(json.error || '更新失败')
  } catch { ElMessage.error('更新失败') }
}

async function deleteDetail() {
  try { await ElMessageBox.confirm('确定删除此素材？', '确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }) } catch { return }
  try {
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/saved/' + detailItem.value.id, { method: 'DELETE', headers: { 'X-Auth-Token': token } })
    const json = await res.json()
    if (json.success) { ElMessage.success('已删除'); detailVisible.value = false; await load() }
    else ElMessage.error(json.error || '删除失败')
  } catch { ElMessage.error('删除失败') }
}

function downloadSaved(item) { window.open(item.downloadUrl, '_blank') }
async function shareImage(item) {
  const url = window.location.origin + '/share/image/' + item.id
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('分享链接已复制，粘贴到微信即可预览')
  } catch {
    const ta = document.createElement('textarea'); ta.value = url
    document.body.appendChild(ta); ta.select(); document.execCommand('copy')
    document.body.removeChild(ta); ElMessage.success('分享链接已复制')
  }
}

// 上传弹窗
const uploadVisible = ref(false)
const upFiles = ref([])
const upPcache = new Map()
const upDrag = ref(false)
const upName = ref('')
const upCategory = ref('')
const upLoading = ref(false)
const upFileInput = ref(null)

const upPreviews = computed(() =>
  upFiles.value.map(f => {
    if (!upPcache.has(f)) upPcache.set(f, URL.createObjectURL(f))
    return { file: f, url: upPcache.get(f) }
  })
)

function clearUpFiles() { for (const u of upPcache.values()) URL.revokeObjectURL(u); upPcache.clear(); upFiles.value = [] }
function openUpload() { upName.value = ''; upCategory.value = ''; clearUpFiles(); uploadVisible.value = true }
function onUpDrop(e) { upDrag.value = false; for (const f of e.dataTransfer.files) { if (f.type.startsWith('image/')) upFiles.value.push(f) } }
function onUpFileSelect(e) { for (const f of Array.from(e.target.files || [])) upFiles.value.push(f); e.target.value = '' }

async function doUpload() {
  if (!upFiles.value.length) return
  upLoading.value = true
  try {
    const fd = new FormData()
    for (const f of upFiles.value) fd.append('files', f)
    fd.append('name', upName.value)
    fd.append('category', upCategory.value)
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/upload-raw', { method: 'POST', headers: { 'X-Auth-Token': token }, body: fd })
    const json = await res.json()
    if (json.success) {
      ElMessage.success(`已上传 ${json.data.length} 个素材`)
      uploadVisible.value = false
      await load()
    } else ElMessage.error(json.error || '上传失败')
  } catch (e) { ElMessage.error('上传失败: ' + (e.message || '网络错误')) }
  finally { upLoading.value = false }
}

async function load() {
  try {
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/saved', { headers: { 'X-Auth-Token': token } })
    const json = await res.json()
    if (json.success) {
      list.value = json.data
      const dynamic = new Set()
      json.data.forEach(d => { if (d.category && !presetCategories.includes(d.category)) dynamic.add(d.category) })
      dynamicCategories.value = [...dynamic]
    }
  } catch { console.warn('素材库加载失败') }
}

onMounted(() => load())
onUnmounted(() => { for (const u of upPcache.values()) URL.revokeObjectURL(u); upPcache.clear() })
watch([search, filterCat, sortBy], () => { page.value = 1 })
</script>

<style scoped>
.medialib-page { max-width: 1280px; margin: 0 auto; }

.ml-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.ml-title { display: flex; align-items: center; gap: 12px; }
.ml-title h2 { font-size: 20px; font-weight: 800; color: #111827; margin: 0; display: flex; align-items: center; gap: 8px; }
.ml-count { font-size: 13px; color: #9ca3af; font-weight: 500; }
.ml-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.ml-empty { text-align: center; padding: 80px 20px; color: #9ca3af; font-size: 15px; line-height: 1.8; }
.ml-empty-icon { color: #d1d5db; margin-bottom: 12px; display: flex; justify-content: center; }
.ml-empty-sub { font-size: 13px; margin-bottom: 20px; }

/* 内容区 */
.ml-content { flex: 1; display: flex; flex-direction: column; }
.ml-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(5, 1fr); gap: 16px;
  align-content: start;
}

/* 卡片 */
.ml-card {
  background: #fff; border: none; border-radius: 14px;
  overflow: hidden; cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 0 0 1px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.06);
  will-change: transform;
}
.ml-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 0 1px rgba(99,102,241,.12), 0 6px 20px rgba(99,102,241,.12);
}
.ml-img {
  width: 100%; aspect-ratio: 1; background: #f3f4f6;
  overflow: hidden;
}
.ml-img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s ease; }
.ml-card:hover .ml-img img { transform: scale(1.06); }
.ml-body { padding: 12px 14px; }
.ml-name { display: block; font-size: 13px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
.ml-cat {
  display: inline-block; font-size: 11px; font-weight: 600; color: #6366f1;
  background: rgba(99,102,241,.08);
  padding: 2px 8px; border-radius: 4px; margin-bottom: 2px;
}
.ml-dims { display: block; font-size: 12px; color: #9ca3af; }

/* ===== 通用弹窗部件 ===== */
.dlg-header { display: flex; align-items: center; gap: 12px; }
.dlg-header-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.up-icon-green { background: linear-gradient(135deg, #10b981, #34d399); }
.dlg-header-title { font-size: 17px; font-weight: 800; color: #111827; margin: 0; line-height: 1.2; }
.dlg-header-sub { font-size: 12px; color: #9ca3af; margin: 2px 0 0; }
.dlg-field label { display: block; font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; }
.dlg-footer { display: flex; justify-content: flex-end; gap: 10px; }

/* ===== 详情弹窗 ===== */
.detail-body { display: flex; flex-direction: column; gap: 18px; }
.db-preview {
  width: 100%; background: #f3f4f6; border-radius: 14px;
  overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.db-preview img { width: 100%; max-height: 55vh; object-fit: contain; }

.db-info {
  display: flex; flex-wrap: wrap;
  background: #f9fafb; border-radius: 12px; padding: 4px 0;
}
.dbi-item {
  flex: 1; min-width: 80px; padding: 12px 18px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  border-right: 1px solid #f3f4f6;
}
.dbi-item:last-child { border-right: none; }
.dbi-value { font-size: 14px; font-weight: 700; color: #1f2937; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dbi-green { color: #10b981 !important; }
.dbi-label { font-size: 11px; color: #9ca3af; font-weight: 500; }

.db-form { display: flex; gap: 16px; flex-wrap: wrap; }
.dbf-field { flex: 1; min-width: 200px; }
.dbf-field label { display: block; font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 8px; }

.db-btns { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 4px; }

/* ===== 上传弹窗 ===== */
.up-zone-new {
  border: 2px dashed #d1d5db; border-radius: 16px;
  padding: 44px 24px; text-align: center; transition: all 0.2s; background: #fafafa;
  margin-bottom: 20px;
}
.up-zone-new.drag-in { border-color: #6366f1; background: #eef2ff; }
.upz-icon { color: #6366f1; margin-bottom: 14px; }
.drag-in .upz-icon { transform: scale(1.1); transition: transform 0.2s; }
.upz-title { font-size: 17px; font-weight: 700; color: #374151; margin: 0 0 4px; }
.upz-hint { font-size: 13px; color: #9ca3af; margin: 0 0 18px; }
.upz-limit { font-size: 12px; color: #d1d5db; margin: 14px 0 0; }

.upz-with-files { text-align: left; }
.upz-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.upz-badge { display: flex; align-items: baseline; gap: 6px; }
.upz-num { font-size: 22px; font-weight: 800; color: #6366f1; }
.upz-label { font-size: 14px; color: #374151; font-weight: 600; }
.upz-actions { display: flex; gap: 8px; }
.upz-files { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.upz-files::-webkit-scrollbar { height: 4px; }
.upz-files::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
.upz-chip {
  display: flex; align-items: center; gap: 10px; padding: 8px 14px 8px 8px;
  border-radius: 12px; background: #fff; border: 1px solid #e5e7eb;
  min-width: 220px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,.03);
}
.upz-chip img { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.upz-chip-info { flex: 1; min-width: 0; }
.upz-chip-name { display: block; font-size: 12px; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upz-chip-size { font-size: 11px; color: #9ca3af; }
.upz-chip-del {
  width: 24px; height: 24px; border-radius: 50%; border: none; background: #e5e7eb;
  color: #6b7280; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.upz-chip-del:hover { background: #fecaca; color: #dc2626; }

.up-form { display: flex; flex-direction: column; gap: 16px; }

.ml-page-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-top: 20px; padding: 12px 16px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  flex-wrap: wrap;
}
.ml-page-left { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; }
.ml-page-left label { color: #9ca3af; font-weight: 500; }
.ml-page-left select {
  padding: 4px 8px; border-radius: 6px; border: 1px solid #e5e7eb;
  background: #f9fafb; font-size: 13px; color: #374151; cursor: pointer;
  outline: none;
}
.ml-page-left select:focus { border-color: #6366f1; }
.ml-page-total { margin-left: 8px; }
.ml-page-right { display: flex; align-items: center; gap: 6px; }
.ml-page-right button {
  padding: 5px 14px; border-radius: 6px; border: 1px solid #e5e7eb;
  background: #fff; font-size: 13px; font-weight: 600; color: #374151;
  cursor: pointer; transition: all 0.15s;
}
.ml-page-right button:hover:not(:disabled) { border-color: #6366f1; color: #6366f1; }
.ml-page-right button:disabled { opacity: .35; cursor: default; }
.ml-page-num { font-size: 14px; font-weight: 700; color: #6366f1; padding: 0 6px; }
</style>
