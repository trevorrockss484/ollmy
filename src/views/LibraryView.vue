<template>
  <div class="library-page">
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h2><el-icon :size="22"><Folder /></el-icon> 资料库</h2>
          <p class="sub">文档管理 · 上传下载 · 分类查阅</p>
        </div>
      </div>
    </div>

    <!-- 操作 & 搜索栏 -->
    <div class="library-toolbar">
      <el-button type="primary" class="library-btn-upload" @click="openUpload">
        <el-icon :size="16"><Plus /></el-icon>
        <span>上传文件</span>
      </el-button>

      <span class="library-count-badge">
        <span class="library-count-num">{{ items.length }}</span>
        <span class="library-count-label">项</span>
      </span>

      <div class="library-search-box">
        <el-icon :size="15" class="library-search-icon"><Search /></el-icon>
        <input
          v-model="searchText"
          class="library-search-input"
          placeholder="搜索文件名或标签..."
        />
        <span v-if="searchText" class="library-search-clear" @click="searchText = ''">
          <el-icon :size="13"><Close /></el-icon>
        </span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!filteredList.length" class="empty-state">
      <div style="font-size:56px;margin-bottom:12px;"><el-icon :size="56"><Folder /></el-icon></div>
      <p style="color:#9ca3af;">{{ items.length ? '无匹配结果' : '暂无资料，点击上传' }}</p>
    </div>

    <!-- 文件列表 -->
    <div v-else class="doc-list">
      <div v-for="d in filteredList" :key="d.id" class="doc-card">
        <div class="doc-icon" :style="{ color: iconColor(d.fileName) }">
          {{ iconFor(d.fileName) }}
        </div>
        <div class="doc-body">
          <div class="doc-name">{{ d.name }}</div>
          <div class="doc-meta">
            <span>{{ formatSize(d.fileSize) }}</span>
            <span v-if="d.tags && d.tags.length">
              <span v-for="t in d.tags" :key="t" class="doc-tag">{{ t }}</span>
            </span>
          </div>
        </div>
        <div class="doc-actions">
          <el-button size="small" round type="primary" @click="preview(d)" title="查看"><el-icon :size="14"><View /></el-icon> 查看</el-button>
          <a :href="api.library.downloadUrl(d.id)" class="doc-dl" title="下载">
            <el-button size="small" round><el-icon :size="14"><Download /></el-icon> 下载</el-button>
          </a>
          <el-button size="small" round @click="openEdit(d)" title="编辑"><el-icon :size="14"><Edit /></el-icon></el-button>
          <el-button size="small" round type="danger" plain @click="doDelete(d)" title="删除"><el-icon :size="14"><Delete /></el-icon></el-button>
        </div>
      </div>
    </div>

    <!-- 上传弹窗 -->
    <el-dialog v-model="uploadOpen" title="上传文件" width="560px" destroy-on-close>
      <div class="drop-zone" :class="{ dragover: dragOver }"
           @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="onDrop">
        <div class="drop-icon"><el-icon :size="40"><Upload /></el-icon></div>
        <p class="drop-text">拖拽文件到此处</p>
        <el-button size="small" @click.stop="fileInput?.click()">或点击选择文件</el-button>
        <p class="drop-hint">支持 doc / docx / pdf / txt / xlsx / pptx / zip，最大100MB</p>
      </div>
      <input ref="fileInput" type="file" multiple accept=".doc,.docx,.pdf,.txt,.xlsx,.xls,.pptx,.ppt,.zip,.rar,.7z" style="display:none" @change="onFileSelect" />

      <div v-if="uploadFiles.length" class="file-list">
        <div v-for="(f, i) in uploadFiles" :key="i" class="file-item">
          <span class="file-icon">{{ iconFor(f.name) }}</span>
          <span class="file-name">{{ f.name }}</span>
          <span class="file-size">{{ formatSize(f.size) }}</span>
          <el-button size="small" circle text @click="uploadFiles.splice(i,1)" title="移除"><el-icon :size="14"><Close /></el-icon></el-button>
        </div>
      </div>

      <el-form label-width="80px" size="default" style="margin-top:16px;">
        <el-form-item label="文件名称">
          <el-input v-model="uploadForm.name" placeholder="留空使用原文件名" size="large" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="uploadForm.tagsStr" placeholder="逗号分隔，如: 清风宗, 人物" size="large" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="uploadOpen = false">取消</el-button>
        <el-button type="primary" @click="doUpload" :disabled="!uploadFiles.length" :loading="uploading">
          <el-icon :size="14"><Upload /></el-icon> 上传 ({{ uploadFiles.length }})
        </el-button>
      </template>
    </el-dialog>

    <!-- 预览灯箱 -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="previewItem" class="preview-overlay" @click="closePreview">
          <div class="preview-toolbar" @click.stop>
            <span class="pv-name">{{ previewItem.name }}</span>
            <span class="pv-meta">{{ previewItem.originalName }} · {{ formatSize(previewItem.fileSize) }}</span>
            <div style="flex:1;" />
            <a :href="api.library.downloadUrl(previewItem.id)">
              <el-button size="small" type="primary"><el-icon :size="14"><Download /></el-icon> 下载</el-button>
            </a>
            <el-button circle size="small" @click="closePreview"><el-icon :size="15"><Close /></el-icon></el-button>
          </div>
          <div class="preview-body" @click.stop>
            <iframe
              v-if="previewItem"
              :src="'/api/library/' + previewItem.id + '/preview'"
              class="preview-iframe"
              frameborder="0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </transition>
    </teleport>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editOpen" title=" 编辑文件" width="480px" destroy-on-close>
      <el-form label-width="80px" size="default">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" size="large" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, formatSize } from '../api'

const items = ref([])
const searchText = ref('')
const uploadOpen = ref(false)
const editOpen = ref(false)
const dragOver = ref(false)
const uploading = ref(false)
const uploadFiles = ref([])
const fileInput = ref(null)
const uploadForm = reactive({ name: '', tagsStr: '' })
const editForm = reactive({ name: '', tagsStr: '' })
const editingId = ref(null)
const previewItem = ref(null)
function preview(d) { previewItem.value = d }
function closePreview() { previewItem.value = null }

function iconFor(name) {
  const ext = (name || '').toLowerCase().split('.').pop()
  const m = { doc: 'DOC', docx: 'DOC', pdf: 'PDF', txt: 'TXT', xls: 'XLS', xlsx: 'XLS', ppt: 'PPT', pptx: 'PPT', zip: 'ZIP', rar: 'RAR', '7z': '7Z' }
  return m[ext] || 'FILE'
}

function iconColor(name) {
  const ext = (name || '').toLowerCase().split('.').pop()
  const m = { doc: '#2b579a', docx: '#2b579a', pdf: '#e74c3c', txt: '#6b7280', xls: '#217346', xlsx: '#217346', ppt: '#d24726', pptx: '#d24726', zip: '#7c3aed', rar: '#7c3aed', '7z': '#7c3aed' }
  return m[ext] || '#6b7280'
}

const filteredList = computed(() => {
  if (!searchText.value) return items.value
  const kw = searchText.value.toLowerCase()
  return items.value.filter(d =>
    (d.name || '').toLowerCase().includes(kw) ||
    (d.tags || []).some(t => t.toLowerCase().includes(kw))
  )
})

function openUpload() {
  uploadForm.name = ''; uploadForm.tagsStr = ''
  uploadFiles.value = []; uploadOpen.value = true
}

function onDrop(e) {
  dragOver.value = false
  for (const f of Array.from(e.dataTransfer.files)) uploadFiles.value.push(f)
}
function onFileSelect(e) {
  for (const f of Array.from(e.target.files || [])) uploadFiles.value.push(f)
  e.target.value = ''
}

async function doUpload() {
  if (!uploadFiles.value.length) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('name', uploadForm.name)
    fd.append('tags', JSON.stringify(uploadForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean)))
    for (const f of uploadFiles.value) fd.append('files', f)
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/library/upload', { method: 'POST', headers: { 'X-Auth-Token': token }, body: fd })
    const data = await res.json()
    if (data.success) { ElMessage.success(`已上传 ${data.data.length} 个文件`); uploadOpen.value = false; load() }
    else { ElMessage.error(data.error || '上传失败') }
  } catch (e) { ElMessage.error('上传失败: ' + e.message) }
  uploading.value = false
}

function openEdit(d) {
  editingId.value = d.id
  editForm.name = d.name || ''; editForm.tagsStr = (d.tags || []).join(', '); editOpen.value = true
}

async function doUpdate() {
  const res = await api.library.update(editingId.value, {
    name: editForm.name,
    tags: editForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean),
  })
  if (res.success) { ElMessage.success('已更新'); editOpen.value = false; load() }
  else { ElMessage.error('更新失败') }
}

async function doDelete(d) {
  try { await ElMessageBox.confirm(`确定删除「${d.name}」？`, '确认删除', { type: 'warning', confirmButtonText: '删除' }) } catch { return }
  const res = await api.library.delete(d.id)
  if (res.success) { ElMessage.success('已删除'); load() }
  else { ElMessage.error(res.error || '删除失败') }
}

async function load() { const res = await api.library.list(); if (res.success) items.value = res.data }
onMounted(load)
</script>

<style scoped>
.library-page { animation: fadeIn .3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
.page-header { margin-bottom:24px; }
.page-header h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }

/* ===== 工具栏 ===== */
.library-toolbar {
  display:flex; align-items:center; gap:12px;
  margin-bottom:24px; flex-wrap:wrap;
  padding:14px 18px;
  background:#fff; border-radius:14px;
  border:1px solid #e5e7eb;
  box-shadow:0 1px 3px rgba(0,0,0,.03);
}

.library-btn-upload {
  display:inline-flex !important; align-items:center; gap:6px;
  font-weight:700 !important; border-radius:10px !important;
  padding:9px 18px !important; font-size:14px !important;
  transition:all 0.2s !important;
}
.library-btn-upload:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.25); }

.library-count-badge {
  display:inline-flex; align-items:baseline; gap:2px;
  padding:6px 12px; border-radius:8px;
  background:#f3f4f6; border:1px solid #e5e7eb;
}
.library-count-num { font-size:16px; font-weight:800; color:#6366f1; }
.library-count-label { font-size:11px; color:#9ca3af; font-weight:600; }

.library-search-box {
  position:relative; display:flex; align-items:center;
  flex:1; min-width:180px; max-width:300px;
}
.library-search-icon {
  position:absolute; left:11px; color:#9ca3af; pointer-events:none;
}
.library-search-input {
  width:100%; height:38px; padding:0 32px 0 34px;
  border:1.5px solid #e5e7eb; border-radius:10px;
  background:#f9fafb; font-size:13px; color:#374151;
  outline:none; transition:all 0.2s;
}
.library-search-input:focus { border-color:#6366f1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.08); }
.library-search-input::placeholder { color:#9ca3af; }
.library-search-clear {
  position:absolute; right:8px; cursor:pointer;
  color:#9ca3af; padding:2px; border-radius:4px;
}
.library-search-clear:hover { color:#6b7280; background:#e5e7eb; }

.empty-state { text-align:center; padding:60px 20px; }

.doc-list { display:flex; flex-direction:column; gap:8px; }

.doc-card {
  display:flex; align-items:center; gap:14px;
  background:#fff; border:1px solid #e5e7eb; border-radius:12px;
  padding:16px 20px;
  transition:all 0.2s;
  box-shadow:0 1px 3px rgba(0,0,0,.04);
}
.doc-card:hover { border-color:#c7d2fe; box-shadow:0 4px 12px rgba(0,0,0,.06); }

.doc-icon { font-size:11px; font-weight:800; flex-shrink:0; width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; letter-spacing:.5px; }

.doc-body { flex:1; min-width:0; }
.doc-name { font-size:15px; font-weight:700; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.doc-meta { display:flex; align-items:center; gap:8px; margin-top:4px; font-size:12px; color:#9ca3af; }
.doc-tag { display:inline-block; padding:1px 6px; border-radius:3px; background:#eef2ff; color:#6366f1; font-weight:600; font-size:10px; margin-left:4px; }

.doc-actions { display:flex; gap:6px; flex-shrink:0; }
.doc-dl { text-decoration:none; }
.doc-actions .el-button { transition:all 0.15s; }
.doc-actions .el-button:hover { transform:scale(1.05); }

/* 上传 */
.drop-zone { border:2px dashed #d1d5db; border-radius:14px; padding:32px 20px; text-align:center; transition:all 0.2s; background:#f9fafb; }
.drop-zone:hover, .drop-zone.dragover { border-color:#6366f1; background:#eef2ff; }
.drop-icon { font-size:40px; margin-bottom:8px; }
.drop-text { font-size:14px; color:#9ca3af; margin:0 0 8px; }
.drop-hint { font-size:11px; color:#b0b0b0; margin:8px 0 0; }

.file-list { margin-top:12px; max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; }
.file-item { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; background:#f9fafb; font-size:13px; }
.file-icon { font-size:20px; }
.file-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#374151; }
.file-size { font-size:11px; color:#9ca3af; }

/* 预览灯箱 */
.preview-overlay {
  position:fixed; inset:0; z-index:9999;
  background:rgba(0,0,0,.6);
  display:flex; flex-direction:column;
}
.preview-toolbar {
  display:flex; align-items:center; gap:12px;
  padding:10px 20px; background:#fff;
  border-bottom:1px solid #e5e7eb; flex-shrink:0;
}
.pv-name { font-size:15px; font-weight:800; color:#1f2937; }
.pv-meta { font-size:11px; color:#9ca3af; }
.preview-body { flex:1; background:#e5e7eb; overflow:hidden; }
.preview-iframe { width:100%; height:100%; border:none; background:#fff; }

.fade-enter-active, .fade-leave-active { transition:opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity:0; }
</style>
