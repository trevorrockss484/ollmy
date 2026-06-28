<template>
  <div class="assets-page">
    <!-- 页头 + Tab -->
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
        <div>
          <h2><el-icon :size="22"><PictureFilled /></el-icon> AI资产管理</h2>
          <p class="sub">{{ tab === 'assets' ? '上传 · 预览 · 下载 · 管理AI资产' : tab === 'library' ? '文档管理 · 上传下载 · 分类查阅' : '按流程步骤查看 · 一键复制 · 在线编辑' }}</p>
        </div>
      </div>
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: tab === 'assets' }" @click="tab = 'assets'">
          🎨 AI资产 <span class="tab-n">{{ assets.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: tab === 'library' }" @click="tab = 'library'">
          📁 资料库 <span class="tab-n">{{ libItems.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: tab === 'prompts' }" @click="tab = 'prompts'">
          📝 AI提示词 <span class="tab-n">{{ prompts.length }}</span>
        </button>
      </div>
    </div>

    <!-- ==================== AI资产 Tab ==================== -->
    <template v-if="tab === 'assets'">
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
          <button v-for="t in typeTabs" :key="t.key" class="assets-pill" :class="{ active: activeType === t.key }" @click="activeType = t.key">
            <span class="assets-pill-icon">{{ t.icon }}</span>
            {{ t.label }}
            <span class="assets-pill-n">{{ countByType(t.key) }}</span>
          </button>
        </div>
        <div class="assets-search-box">
          <el-icon :size="15" class="assets-search-icon"><Search /></el-icon>
          <input v-model="searchText" class="assets-search-input" placeholder="搜索资产名称、标签..." />
          <span v-if="searchText" class="assets-search-clear" @click="searchText = ''">
            <el-icon :size="13"><Close /></el-icon>
          </span>
        </div>
      </div>

      <div v-if="!filteredList.length" class="empty-state">
        <div style="font-size:56px;margin-bottom:12px;"><el-icon :size="56"><PictureFilled /></el-icon></div>
        <p style="color:#9ca3af;">{{ assets.length ? '无匹配结果' : '暂无资产，点击上方按钮上传' }}</p>
      </div>

      <div v-else class="asset-grid">
        <div v-for="a in filteredList" :key="a.id" class="asset-card">
          <div class="card-img-wrap" @click="preview(a)">
            <img :src="assetUrl(a)" :alt="a.name" class="card-img" loading="lazy" referrerpolicy="no-referrer" />
            <div class="type-badge" :style="{ background: typeColor(a.type) }">{{ typeLabelShort(a.type) }}</div>
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

      <!-- 资产 Lightbox -->
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
              <img :src="assetUrl(previewAsset)" :alt="previewAsset.name" class="lightbox-img" referrerpolicy="no-referrer" />
            </div>
          </div>
        </transition>
      </teleport>

      <!-- 上传资产弹窗 -->
      <el-dialog v-model="uploadOpen" title="上传资产" width="620px" destroy-on-close>
        <div class="drop-zone" :class="{ dragover: dragOver }" @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="onDrop">
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

      <!-- 编辑资产弹窗 -->
      <el-dialog v-model="editOpen" title="编辑资产" width="520px" destroy-on-close>
        <el-form label-width="80px" size="default">
          <el-form-item label="名称"><el-input v-model="editForm.name" size="large" /></el-form-item>
          <el-form-item label="类型">
            <el-select v-model="editForm.type" size="large" style="width:100%;">
              <el-option v-for="t in assetTypes" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签"><el-input v-model="editForm.tagsStr" placeholder="逗号分隔" size="large" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="editOpen = false">取消</el-button>
          <el-button type="primary" @click="doUpdate"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
        </template>
      </el-dialog>
    </template>

    <!-- ==================== 资料库 Tab ==================== -->
    <template v-if="tab === 'library'">
      <div class="library-toolbar">
        <el-button type="primary" class="library-btn-upload" @click="libUploadOpen = true">
          <el-icon :size="16"><Plus /></el-icon>
          <span>上传文件</span>
        </el-button>
        <span class="library-count-badge">
          <span class="library-count-num">{{ libItems.length }}</span>
          <span class="library-count-label">项</span>
        </span>
        <div class="library-search-box">
          <el-icon :size="15" class="library-search-icon"><Search /></el-icon>
          <input v-model="libSearch" class="library-search-input" placeholder="搜索文件名或标签..." />
          <span v-if="libSearch" class="library-search-clear" @click="libSearch = ''">
            <el-icon :size="13"><Close /></el-icon>
          </span>
        </div>
      </div>

      <div v-if="!filteredLib.length" class="empty-state">
        <div style="font-size:56px;margin-bottom:12px;"><el-icon :size="56"><Folder /></el-icon></div>
        <p style="color:#9ca3af;">{{ libItems.length ? '无匹配结果' : '暂无资料，点击上传' }}</p>
      </div>

      <div v-else class="doc-list">
        <div v-for="d in filteredLib" :key="d.id" class="doc-card">
          <div class="doc-icon" :style="{ color: libIconColor(d.fileName) }">{{ libIcon(d.fileName) }}</div>
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
            <el-button size="small" round type="primary" @click="libPreview(d)" title="查看"><el-icon :size="14"><View /></el-icon> 查看</el-button>
            <a :href="api.library.downloadUrl(d.id)" class="doc-dl" title="下载">
              <el-button size="small" round><el-icon :size="14"><Download /></el-icon> 下载</el-button>
            </a>
            <el-button size="small" round @click="libOpenEdit(d)" title="编辑"><el-icon :size="14"><Edit /></el-icon></el-button>
            <el-button size="small" round type="danger" plain @click="libDoDelete(d)" title="删除"><el-icon :size="14"><Delete /></el-icon></el-button>
          </div>
        </div>
      </div>

      <!-- 资料库上传弹窗 -->
      <el-dialog v-model="libUploadOpen" title="上传文件" width="560px" destroy-on-close>
        <div class="drop-zone" :class="{ dragover: libDragOver }" @dragover.prevent="libDragOver = true" @dragleave="libDragOver = false" @drop.prevent="libOnDrop">
          <div class="drop-icon"><el-icon :size="40"><Upload /></el-icon></div>
          <p class="drop-text">拖拽文件到此处</p>
          <el-button size="small" @click.stop="libFileInput?.click()">或点击选择文件</el-button>
          <p class="drop-hint">支持 doc / docx / pdf / txt / xlsx / pptx / zip，最大100MB</p>
        </div>
        <input ref="libFileInput" type="file" multiple accept=".doc,.docx,.pdf,.txt,.xlsx,.xls,.pptx,.ppt,.zip,.rar,.7z" style="display:none" @change="libOnFileSelect" />
        <div v-if="libUploadFiles.length" class="file-list">
          <div v-for="(f, i) in libUploadFiles" :key="i" class="file-item">
            <span class="file-icon">{{ libIcon(f.name) }}</span>
            <span class="file-name">{{ f.name }}</span>
            <span class="file-size">{{ formatSize(f.size) }}</span>
            <el-button size="small" circle text @click="libUploadFiles.splice(i,1)" title="移除"><el-icon :size="14"><Close /></el-icon></el-button>
          </div>
        </div>
        <el-form label-width="80px" size="default" style="margin-top:16px;">
          <el-form-item label="文件名称"><el-input v-model="libUploadForm.name" placeholder="留空使用原文件名" size="large" /></el-form-item>
          <el-form-item label="标签"><el-input v-model="libUploadForm.tagsStr" placeholder="逗号分隔，如: 清风宗, 人物" size="large" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="libUploadOpen = false">取消</el-button>
          <el-button type="primary" @click="libDoUpload" :disabled="!libUploadFiles.length" :loading="libUploading">
            <el-icon :size="14"><Upload /></el-icon> 上传 ({{ libUploadFiles.length }})
          </el-button>
        </template>
      </el-dialog>

      <!-- 资料库预览灯箱 -->
      <teleport to="body">
        <transition name="fade">
          <div v-if="libPreviewItem" class="preview-overlay" @click="libClosePreview">
            <div class="preview-toolbar" @click.stop>
              <span class="pv-name">{{ libPreviewItem.name }}</span>
              <span class="pv-meta">{{ libPreviewItem.originalName }} · {{ formatSize(libPreviewItem.fileSize) }}</span>
              <div style="flex:1;" />
              <a :href="api.library.downloadUrl(libPreviewItem.id)">
                <el-button size="small" type="primary"><el-icon :size="14"><Download /></el-icon> 下载</el-button>
              </a>
              <el-button circle size="small" @click="libClosePreview"><el-icon :size="15"><Close /></el-icon></el-button>
            </div>
            <div class="preview-body" @click.stop>
              <iframe :src="'/api/library/' + libPreviewItem.id + '/preview'" class="preview-iframe" frameborder="0" sandbox="allow-same-origin" />
            </div>
          </div>
        </transition>
      </teleport>

      <!-- 资料库编辑弹窗 -->
      <el-dialog v-model="libEditOpen" title="编辑文件" width="480px" destroy-on-close>
        <el-form label-width="80px" size="default">
          <el-form-item label="名称"><el-input v-model="libEditForm.name" size="large" /></el-form-item>
          <el-form-item label="标签"><el-input v-model="libEditForm.tagsStr" placeholder="逗号分隔" size="large" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="libEditOpen = false">取消</el-button>
          <el-button type="primary" @click="libDoUpdate"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
        </template>
      </el-dialog>
    </template>

    <!-- ==================== AI提示词 Tab ==================== -->
    <template v-if="tab === 'prompts'">
      <div class="prompts-toolbar">
        <el-button type="primary" class="prompts-btn-add" @click="pmtOpenAdd">
          <el-icon :size="16"><Plus /></el-icon>
          <span>新增模板</span>
        </el-button>
        <span class="prompts-count-badge">
          <span class="prompts-count-num">{{ prompts.length }}</span>
          <span class="prompts-count-label">条</span>
        </span>
        <div class="prompts-step-pills">
          <button v-for="(st, i) in pmtSteps" :key="st.key"
            class="prompts-step-pill"
            :class="{ active: pmtActiveStep === st.key }"
            :style="{ '--step-color': st.color }"
            @click="pmtActiveStep = st.key">
            <span class="step-dot" :style="{ background: pmtActiveStep === st.key ? st.color : '#d1d5db' }">{{ i + 1 }}</span>
            {{ st.label }}
            <span class="step-n">{{ pmtCountByStep(st.key) }}</span>
          </button>
        </div>
      </div>

      <div v-if="!pmtFiltered.length" class="empty-state">
        <div style="font-size:56px;margin-bottom:12px;"><el-icon :size="56"><Document /></el-icon></div>
        <p style="color:#9ca3af;">暂无提示词模板</p>
        <el-button type="primary" round @click="pmtOpenAdd">创建第一个模板</el-button>
      </div>

      <div v-else class="pmt-card-list">
        <div v-for="p in pmtFiltered" :key="p.id"
          :class="['pmt-card', { expanded: pmtExpandedId === p.id }]"
          :style="{ '--step-color': pmtStepColor(pmtActiveStep) }">
          <div class="pmt-collapsed" @click="pmtToggleExpand(p.id)">
            <div class="pmt-accent" :style="{ background: pmtStepColor(pmtActiveStep) }"></div>
            <div class="pmt-body">
              <div class="pmt-header">
                <h3 class="pmt-title">{{ p.title }}</h3>
                <span v-if="p.tags && p.tags.length" class="pmt-tags">
                  <span v-for="t in p.tags" :key="t" class="pmt-tag">{{ t }}</span>
                </span>
              </div>
              <p class="pmt-preview">{{ pmtPreview(p.content) }}</p>
            </div>
            <div class="pmt-actions" @click.stop>
              <el-button size="small" round @click="pmtDoCopy(p)"><el-icon><DocumentCopy /></el-icon> 复制</el-button>
              <el-button size="small" round @click="pmtToggleExpand(p.id)">
                <el-icon><View /></el-icon> {{ pmtExpandedId === p.id ? '收起' : '展开' }}
              </el-button>
              <el-button size="small" round @click="pmtOpenEdit(p)"><el-icon><Edit /></el-icon> 编辑</el-button>
            </div>
          </div>
          <transition name="slide">
            <div v-if="pmtExpandedId === p.id" class="pmt-expanded">
              <div class="pmt-exp-toolbar">
                <span class="pmt-exp-title">{{ p.title }}</span>
                <el-button type="primary" round size="small" @click="pmtDoCopy(p)">
                  <el-icon><DocumentCopy /></el-icon> 一键复制全文
                </el-button>
              </div>
              <pre class="pmt-exp-content">{{ p.content }}</pre>
            </div>
          </transition>
        </div>
      </div>

      <!-- 提示词编辑弹窗 -->
      <el-dialog v-model="pmtDialogOpen" :title="pmtIsEditing ? '编辑模板' : '新增模板'" width="720px" destroy-on-close>
        <el-form label-width="80px" size="default">
          <el-form-item label="标题">
            <el-input v-model="pmtForm.title" placeholder="输入模板名称..." size="large" />
          </el-form-item>
          <el-form-item label="步骤分类">
            <el-select v-model="pmtForm.step" size="large" style="width:100%;">
              <el-option v-for="st in pmtSteps" :key="st.key" :label="st.label" :value="st.key" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
            <el-input v-model="pmtForm.tagsStr" placeholder="逗号分隔，如: 剧本, AI编剧" size="large" />
          </el-form-item>
          <el-form-item label="内容">
            <el-input v-model="pmtForm.content" type="textarea" :rows="18" placeholder="粘贴提示词内容..." />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button v-if="pmtIsEditing" type="danger" @click="pmtDoDelete" style="margin-right:auto;"><el-icon :size="14"><Delete /></el-icon> 删除</el-button>
          <el-button @click="pmtDialogOpen = false">取消</el-button>
          <el-button type="primary" @click="pmtDoSave"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
        </template>
      </el-dialog>
    </template>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, formatSize } from '../api'

// ===== Tab =====
const tab = ref('assets')

// 切换 tab 时关闭所有预览弹窗
watch(tab, () => {
  closePreview()
  libClosePreview()
})

// ===== AI资产 =====
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
const previewAsset = ref(null)

const uploadPreviews = computed(() =>
  uploadFiles.value.map(f => {
    if (!previewCache.has(f)) previewCache.set(f, URL.createObjectURL(f))
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

function openUpload() { uploadForm.name = ''; uploadForm.type = 'character'; uploadForm.tagsStr = ''; previewCache.forEach(url => URL.revokeObjectURL(url)); previewCache.clear(); uploadFiles.value = []; seenFiles.clear(); uploadOpen.value = true }
function triggerFileInput() { fileInput.value?.click() }
function addFiles(files) { for (const f of files) { const key = f.name + '|' + f.size + '|' + f.lastModified; if (!seenFiles.has(key)) { seenFiles.add(key); uploadFiles.value.push(f) } } }
function onDrop(e) { dragOver.value = false; addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))) }
function onFileSelect(e) { addFiles(Array.from(e.target.files || [])); e.target.value = '' }

async function doUpload() {
  if (!uploadFiles.value.length) return; uploading.value = true
  try {
    const fd = new FormData(); fd.append('name', uploadForm.name); fd.append('type', uploadForm.type)
    fd.append('tags', JSON.stringify(uploadForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean)))
    for (const f of uploadFiles.value) fd.append('files', f)
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/assets/upload', { method: 'POST', headers: { 'X-Auth-Token': token }, body: fd })
    const data = await res.json()
    if (data.success) { ElMessage.success(`已上传 ${data.data.length} 个资产`); uploadOpen.value = false; loadAssets() }
    else ElMessage.error(data.error || '上传失败')
  } catch (e) { ElMessage.error('上传失败: ' + e.message) }
  uploading.value = false
}

function preview(a) { previewAsset.value = a }
function closePreview() { previewAsset.value = null }
function openEdit(a) { editingId.value = a.id; editForm.name = a.name || ''; editForm.type = a.type || 'character'; editForm.tagsStr = (a.tags || []).join(', '); editOpen.value = true }
async function doUpdate() {
  const res = await api.assets.update(editingId.value, { name: editForm.name, type: editForm.type, tags: editForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean) })
  if (res.success) { ElMessage.success('已更新'); editOpen.value = false; if (previewAsset.value?.id === editingId.value) previewAsset.value = { ...previewAsset.value, ...res.data }; loadAssets() }
  else ElMessage.error('更新失败')
}
async function doDelete(a) {
  try { await ElMessageBox.confirm(`确定删除「${a.name}」？`, '确认删除', { type: 'warning', confirmButtonText: '删除' }) } catch { return }
  const res = await api.assets.delete(a.id)
  if (res.success) { ElMessage.success('已删除'); if (previewAsset.value?.id === a.id) closePreview(); loadAssets() }
  else ElMessage.error('删除失败')
}
function onKeyDown(e) { if (e.key === 'Escape' && previewAsset.value) closePreview() }
async function loadAssets() { const res = await api.assets.list(); if (res.success) assets.value = res.data }

// ===== 资料库 =====
const libItems = ref([])
const libSearch = ref('')
const libUploadOpen = ref(false)
const libEditOpen = ref(false)
const libDragOver = ref(false)
const libUploading = ref(false)
const libUploadFiles = ref([])
const libFileInput = ref(null)
const libUploadForm = reactive({ name: '', tagsStr: '' })
const libEditForm = reactive({ name: '', tagsStr: '' })
const libEditingId = ref(null)
const libPreviewItem = ref(null)

function libIcon(name) {
  const ext = (name || '').toLowerCase().split('.').pop()
  const m = { doc: 'DOC', docx: 'DOC', pdf: 'PDF', txt: 'TXT', xls: 'XLS', xlsx: 'XLS', ppt: 'PPT', pptx: 'PPT', zip: 'ZIP', rar: 'RAR', '7z': '7Z' }
  return m[ext] || 'FILE'
}
function libIconColor(name) {
  const ext = (name || '').toLowerCase().split('.').pop()
  const m = { doc: '#2b579a', docx: '#2b579a', pdf: '#e74c3c', txt: '#6b7280', xls: '#217346', xlsx: '#217346', ppt: '#d24726', pptx: '#d24726', zip: '#7c3aed', rar: '#7c3aed', '7z': '#7c3aed' }
  return m[ext] || '#6b7280'
}
const filteredLib = computed(() => {
  if (!libSearch.value) return libItems.value
  const kw = libSearch.value.toLowerCase()
  return libItems.value.filter(d => (d.name || '').toLowerCase().includes(kw) || (d.tags || []).some(t => t.toLowerCase().includes(kw)))
})
function libPreview(d) { libPreviewItem.value = d }
function libClosePreview() { libPreviewItem.value = null }
function libOnDrop(e) { libDragOver.value = false; for (const f of Array.from(e.dataTransfer.files)) libUploadFiles.value.push(f) }
function libOnFileSelect(e) { for (const f of Array.from(e.target.files || [])) libUploadFiles.value.push(f); e.target.value = '' }
function libOpenEdit(d) { libEditingId.value = d.id; libEditForm.name = d.name || ''; libEditForm.tagsStr = (d.tags || []).join(', '); libEditOpen.value = true }

async function libDoUpload() {
  if (!libUploadFiles.value.length) return; libUploading.value = true
  try {
    const fd = new FormData(); fd.append('name', libUploadForm.name)
    fd.append('tags', JSON.stringify(libUploadForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean)))
    for (const f of libUploadFiles.value) fd.append('files', f)
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/library/upload', { method: 'POST', headers: { 'X-Auth-Token': token }, body: fd })
    const data = await res.json()
    if (data.success) { ElMessage.success(`已上传 ${data.data.length} 个文件`); libUploadOpen.value = false; loadLib() }
    else ElMessage.error(data.error || '上传失败')
  } catch (e) { ElMessage.error('上传失败: ' + e.message) }
  libUploading.value = false
}
async function libDoUpdate() {
  const res = await api.library.update(libEditingId.value, { name: libEditForm.name, tags: libEditForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean) })
  if (res.success) { ElMessage.success('已更新'); libEditOpen.value = false; loadLib() }
  else ElMessage.error('更新失败')
}
async function libDoDelete(d) {
  try { await ElMessageBox.confirm(`确定删除「${d.name}」？`, '确认删除', { type: 'warning', confirmButtonText: '删除' }) } catch { return }
  try { const res = await api.library.delete(d.id); if (res.success) { ElMessage.success('已删除'); loadLib() } else ElMessage.error('删除失败') } catch { ElMessage.error('删除失败') }
}
async function loadLib() { const res = await api.library.list(); if (res.success) libItems.value = res.data }

// ===== AI提示词 =====
const pmtSteps = [
  { key: '第一步：剧本', label: '剧本生成', color: '#a78bfa' },
  { key: '第二步：人物 物品 场景的提取', label: '元素提取', color: '#60a5fa' },
  { key: '第三步：生资产', label: '资产生成', color: '#22d3ee' },
  { key: '第四步：分镜提示词', label: '分镜提示词', color: '#fb923c' },
  { key: '第五步：生分镜', label: '分镜生成', color: '#f472b6' },
]
const prompts = ref([])
const pmtActiveStep = ref(pmtSteps[0].key)
const pmtExpandedId = ref(null)
const pmtDialogOpen = ref(false)
const pmtIsEditing = ref(false)
const pmtEditingId = ref(null)
const pmtForm = reactive({ title: '', step: pmtSteps[0].key, tagsStr: '', content: '' })

const pmtFiltered = computed(() => prompts.value.filter(p => p.step === pmtActiveStep.value))
function pmtCountByStep(key) { return prompts.value.filter(p => p.step === key).length }
function pmtStepColor(key) { return pmtSteps.find(s => s.key === key)?.color || '#6366f1' }
function pmtPreview(content) {
  if (!content) return '(空内容)'
  return content.replace(/\n/g, ' ').substring(0, 120) + (content.length > 120 ? '…' : '')
}
function pmtToggleExpand(id) { pmtExpandedId.value = pmtExpandedId.value === id ? null : id }

async function pmtDoCopy(p) {
  try { await navigator.clipboard.writeText(p.content || ''); ElMessage.success('已复制到剪贴板') }
  catch {
    const ta = document.createElement('textarea'); ta.value = p.content || ''
    document.body.appendChild(ta); ta.select(); document.execCommand('copy')
    document.body.removeChild(ta); ElMessage.success('已复制到剪贴板')
  }
}
function pmtOpenAdd() {
  pmtIsEditing.value = false; pmtEditingId.value = null
  pmtForm.title = ''; pmtForm.step = pmtActiveStep.value; pmtForm.tagsStr = ''; pmtForm.content = ''
  pmtDialogOpen.value = true
}
function pmtOpenEdit(p) {
  pmtIsEditing.value = true; pmtEditingId.value = p.id
  pmtForm.title = p.title || ''; pmtForm.step = p.step || pmtSteps[0].key
  pmtForm.tagsStr = (p.tags || []).join(', '); pmtForm.content = p.content || ''
  pmtDialogOpen.value = true
}
async function pmtDoSave() {
  if (!pmtForm.title.trim()) { ElMessage.warning('请输入标题'); return }
  const data = { title: pmtForm.title.trim(), step: pmtForm.step, content: pmtForm.content, tags: pmtForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean) }
  if (pmtIsEditing.value) {
    const res = await api.prompts.update(pmtEditingId.value, data)
    if (res.success) { ElMessage.success('已更新'); pmtDialogOpen.value = false; loadPrompts() }
    else ElMessage.error('更新失败')
  } else {
    const res = await api.prompts.add(data)
    if (res.success) { ElMessage.success('已创建'); pmtDialogOpen.value = false; pmtActiveStep.value = data.step; loadPrompts() }
    else ElMessage.error('创建失败')
  }
}
async function pmtDoDelete() {
  try { await ElMessageBox.confirm('确定删除此模板？', '确认删除', { type: 'warning' }) } catch { return }
  try { const res = await api.prompts.delete(pmtEditingId.value); if (res.success) { ElMessage.success('已删除'); pmtDialogOpen.value = false; loadPrompts() } else ElMessage.error('删除失败') } catch { ElMessage.error('删除失败') }
}
async function loadPrompts() { const res = await api.prompts.list(); if (res.success) prompts.value = res.data }

onMounted(() => { loadAssets(); loadLib(); loadPrompts(); document.addEventListener("keydown", onKeyDown) })
onUnmounted(() => { document.removeEventListener("keydown", onKeyDown) })
</script>

<style scoped>
.assets-page { animation: fadeIn .3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }

/* ===== 页头 + Tab ===== */
.page-header { margin-bottom:24px; }
.page-header h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }

.tab-bar { display: flex; gap: 6px; margin-top: 16px; }
.tab-btn {
  padding: 10px 20px; border-radius: 12px; border: 1.5px solid #e5e7eb;
  background: #fff; font-size: 14px; font-weight: 700; color: #6b7280; cursor: pointer;
  transition: all 0.15s; display: flex; align-items: center; gap: 6px;
}
.tab-btn:hover { border-color: #a5b4fc; color: #6366f1; }
.tab-btn.active { border-color: #6366f1; background: #eef2ff; color: #6366f1; }
.tab-n { font-size: 12px; font-weight: 800; padding: 1px 8px; border-radius: 10px; background: #f3f4f6; color: #6b7280; }
.tab-btn.active .tab-n { background: #c7d2fe; color: #4338ca; }

/* ===== AI资产 工具栏 ===== */
.assets-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:24px; flex-wrap:wrap; padding:14px 18px; background:#fff; border-radius:14px; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,.03); }
.assets-btn-upload { display:inline-flex !important; align-items:center; gap:6px; font-weight:700 !important; border-radius:10px !important; padding:9px 18px !important; font-size:14px !important; transition:all 0.2s !important; }
.assets-btn-upload:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.25); }
.assets-count-badge { display:inline-flex; align-items:baseline; gap:2px; padding:6px 12px; border-radius:8px; background:#f3f4f6; border:1px solid #e5e7eb; }
.assets-count-num { font-size:16px; font-weight:800; color:#6366f1; }
.assets-count-label { font-size:11px; color:#9ca3af; font-weight:600; }
.assets-pills { display:flex; gap:4px; flex:1; flex-wrap:wrap; }
.assets-pill { padding:6px 14px; border-radius:20px; border:1px solid #e5e7eb; background:transparent; font-size:13px; font-weight:600; color:#6b7280; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:4px; }
.assets-pill:hover { border-color:#a5b4fc; color:#6366f1; }
.assets-pill.active { background:#eef2ff; border-color:#6366f1; color:#6366f1; }
.assets-pill-n { font-size:11px; opacity:.7; }
.assets-search-box { position:relative; display:flex; align-items:center; min-width:180px; max-width:220px; }
.assets-search-icon { position:absolute; left:11px; color:#9ca3af; pointer-events:none; }
.assets-search-input { width:100%; height:38px; padding:0 32px 0 34px; border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; font-size:13px; color:#374151; outline:none; transition:all 0.2s; }
.assets-search-input:focus { border-color:#6366f1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.08); }
.assets-search-input::placeholder { color:#9ca3af; }
.assets-search-clear { position:absolute; right:8px; cursor:pointer; color:#9ca3af; padding:2px; border-radius:4px; }
.assets-search-clear:hover { color:#6b7280; background:#e5e7eb; }

.empty-state { text-align:center; padding:60px 20px; }

/* 资产卡片网格 */
.asset-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:16px; }
.asset-card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; transition:all 0.2s; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.asset-card:hover { border-color:#c7d2fe; box-shadow:0 4px 12px rgba(0,0,0,.06); }
.card-img-wrap { position:relative; width:100%; aspect-ratio:1; background:#f3f4f6; overflow:hidden; cursor:pointer; }
.card-img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s; }
.asset-card:hover .card-img { transform:scale(1.05); }
.type-badge { position:absolute; top:8px; right:8px; padding:3px 8px; border-radius:6px; font-size:10px; font-weight:700; color:#fff; }
.card-info { padding:12px 14px 6px; }
.card-name { font-size:14px; font-weight:600; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.card-meta { font-size:12px; color:#9ca3af; margin-top:4px; }
.card-tags { color:#6366f1; font-weight:500; }
.card-footer { padding:6px 14px 12px; display:flex; gap:6px; }

/* Lightbox */
.lightbox-overlay { position:fixed; inset:0; z-index:10001; background:rgba(0,0,0,.85); display:flex; flex-direction:column; overflow:hidden; }
.lightbox-toolbar { display:flex; align-items:center; gap:12px; padding:10px 20px; background:rgba(0,0,0,.6); flex-shrink:0; }
.lb-name { font-size:15px; font-weight:800; color:#fff; }
.lb-meta { font-size:11px; color:#a0a3b1; }
.lightbox-img-wrap { flex:1; min-height:0; display:flex; align-items:center; justify-content:center; padding:20px; overflow:hidden; }
.lightbox-img { max-width:100%; max-height:100%; object-fit:scale-down; border-radius:6px; }
.lightbox-enter-active, .lightbox-leave-active { transition:opacity .2s; }
.lightbox-enter-from, .lightbox-leave-to { opacity:0; }

/* 上传弹窗 */
.drop-zone { border:2px dashed #d1d5db; border-radius:14px; padding:32px 20px; text-align:center; transition:all 0.2s; background:#f9fafb; }
.drop-zone:hover, .drop-zone.dragover { border-color:#6366f1; background:#eef2ff; }
.drop-icon { font-size:40px; margin-bottom:8px; }
.drop-text { font-size:14px; color:#9ca3af; margin:0 0 8px; }
.drop-hint { font-size:11px; color:#b0b0b0; margin:8px 0 0; }
.file-list { margin-top:12px; max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; }
.file-item { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; background:#f9fafb; font-size:13px; }
.file-thumb { width:40px; height:40px; border-radius:6px; object-fit:cover; }
.file-info { flex:1; min-width:0; }
.file-name { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#374151; }
.file-size { font-size:11px; color:#9ca3af; }
.file-icon { font-size:20px; }

/* ===== 资料库 ===== */
.library-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:24px; flex-wrap:wrap; padding:14px 18px; background:#fff; border-radius:14px; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,.03); }
.library-btn-upload { display:inline-flex !important; align-items:center; gap:6px; font-weight:700 !important; border-radius:10px !important; padding:9px 18px !important; font-size:14px !important; transition:all 0.2s !important; }
.library-btn-upload:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.25); }
.library-count-badge { display:inline-flex; align-items:baseline; gap:2px; padding:6px 12px; border-radius:8px; background:#f3f4f6; border:1px solid #e5e7eb; }
.library-count-num { font-size:16px; font-weight:800; color:#6366f1; }
.library-count-label { font-size:11px; color:#9ca3af; font-weight:600; }
.library-search-box { position:relative; display:flex; align-items:center; flex:1; min-width:180px; max-width:300px; }
.library-search-icon { position:absolute; left:11px; color:#9ca3af; pointer-events:none; }
.library-search-input { width:100%; height:38px; padding:0 32px 0 34px; border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; font-size:13px; color:#374151; outline:none; transition:all 0.2s; }
.library-search-input:focus { border-color:#6366f1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.08); }
.library-search-input::placeholder { color:#9ca3af; }
.library-search-clear { position:absolute; right:8px; cursor:pointer; color:#9ca3af; padding:2px; border-radius:4px; }
.library-search-clear:hover { color:#6b7280; background:#e5e7eb; }

.doc-list { display:flex; flex-direction:column; gap:8px; }
.doc-card { display:flex; align-items:center; gap:14px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px 20px; transition:all 0.2s; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.doc-card:hover { border-color:#c7d2fe; box-shadow:0 4px 12px rgba(0,0,0,.06); }
.doc-icon { font-size:11px; font-weight:800; flex-shrink:0; width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; letter-spacing:.5px; }
.doc-body { flex:1; min-width:0; }
.doc-name { font-size:15px; font-weight:700; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.doc-meta { display:flex; align-items:center; gap:8px; margin-top:4px; font-size:12px; color:#9ca3af; }
.doc-tag { display:inline-block; padding:1px 6px; border-radius:3px; background:#eef2ff; color:#6366f1; font-weight:600; font-size:10px; margin-left:4px; }
.doc-actions { display:flex; gap:6px; flex-shrink:0; }
.doc-dl { text-decoration:none; }

/* 预览灯箱 */
.preview-overlay { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.6); display:flex; flex-direction:column; }
.preview-toolbar { display:flex; align-items:center; gap:12px; padding:10px 20px; background:#fff; border-bottom:1px solid #e5e7eb; flex-shrink:0; }
.pv-name { font-size:15px; font-weight:800; color:#1f2937; }
.pv-meta { font-size:11px; color:#9ca3af; }
.preview-body { flex:1; background:#e5e7eb; overflow:hidden; }
.preview-iframe { width:100%; height:100%; border:none; background:#fff; }
.fade-enter-active, .fade-leave-active { transition:opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity:0; }

/* ===== AI提示词 ===== */
.prompts-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:24px; flex-wrap:wrap; padding:14px 18px; background:#fff; border-radius:14px; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,.03); }
.prompts-btn-add { display:inline-flex !important; align-items:center; gap:6px; font-weight:700 !important; border-radius:10px !important; padding:9px 18px !important; font-size:14px !important; transition:all 0.2s !important; }
.prompts-btn-add:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.25); }
.prompts-count-badge { display:inline-flex; align-items:baseline; gap:2px; padding:6px 12px; border-radius:8px; background:#f3f4f6; border:1px solid #e5e7eb; }
.prompts-count-num { font-size:16px; font-weight:800; color:#6366f1; }
.prompts-count-label { font-size:11px; color:#9ca3af; font-weight:600; }

.prompts-step-pills { display:flex; gap:6px; flex-wrap:wrap; flex:1; }
.prompts-step-pill { display:inline-flex; align-items:center; gap:5px; padding:7px 14px; border-radius:20px; border:1.5px solid #e5e7eb; background:#fff; font-size:12px; font-weight:600; color:#6b7280; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
.prompts-step-pill:hover { border-color:var(--step-color); color:var(--step-color); background:#f8faff; }
.prompts-step-pill.active { border-color:var(--step-color); background:var(--step-color); color:#fff; }
.step-dot { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; font-size:10px; font-weight:800; color:#fff; }
.prompts-step-pill.active .step-dot { background:rgba(255,255,255,.3); }
.step-n { display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; padding:0 5px; border-radius:9px; background:#e5e7eb; color:#6b7280; font-size:10px; font-weight:700; }
.prompts-step-pill.active .step-n { background:rgba(255,255,255,.25); color:#fff; }

.pmt-card-list { display:flex; flex-direction:column; gap:12px; }
.pmt-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; transition:all 0.2s; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.pmt-card:hover { border-color:#c7d2fe; box-shadow:0 4px 16px rgba(0,0,0,.06); }
.pmt-card.expanded { border-color:var(--step-color); box-shadow:0 0 0 2px color-mix(in srgb, var(--step-color) 20%, transparent); }
.pmt-collapsed { display:flex; align-items:stretch; cursor:pointer; }
.pmt-accent { width:4px; flex-shrink:0; border-radius:2px 0 0 2px; }
.pmt-body { flex:1; padding:16px 20px; min-width:0; }
.pmt-header { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px; }
.pmt-title { font-size:15px; font-weight:700; color:#1f2937; margin:0; }
.pmt-tags { display:flex; gap:6px; flex-wrap:wrap; }
.pmt-tag { font-size:10px; padding:2px 8px; border-radius:4px; background:#eef2ff; color:#6366f1; font-weight:600; }
.pmt-preview { font-size:12px; color:#9ca3af; line-height:1.5; margin:0; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.pmt-actions { display:flex; align-items:center; gap:6px; padding:16px 16px 16px 8px; flex-shrink:0; }
.pmt-actions .el-button { transition:all 0.15s; }
.pmt-actions .el-button:hover { transform:scale(1.05); }
.pmt-expanded { border-top:1px solid #e5e7eb; background:#fafafa; }
.pmt-exp-toolbar { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; background:#eef2ff; border-bottom:1px solid #e0e7ff; }
.pmt-exp-title { font-size:14px; font-weight:700; color:#374151; }
.pmt-exp-content { margin:0; padding:20px 24px; font-size:13px; line-height:1.7; color:#374151; font-family:'Courier New','PingFang SC',monospace; white-space:pre-wrap; word-wrap:break-word; max-height:600px; overflow-y:auto; background:#fff; }

.slide-enter-active, .slide-leave-active { transition:all 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity:0; max-height:0; }
.slide-enter-to, .slide-leave-from { max-height:800px; }
</style>
