<template>
  <div class="prompts-page">
    <!-- 页头 -->
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h2><el-icon :size="22"><Document /></el-icon> AI提示词模板</h2>
          <p class="sub">按流程步骤查看 · 一键复制 · 在线编辑</p>
        </div>
      </div>
    </div>

    <!-- 操作 & 步骤Tab -->
    <div class="prompts-toolbar">
      <el-button type="primary" class="prompts-btn-add" @click="openAdd">
        <el-icon :size="16"><Plus /></el-icon>
        <span>新增模板</span>
      </el-button>

      <span class="prompts-count-badge">
        <span class="prompts-count-num">{{ prompts.length }}</span>
        <span class="prompts-count-label">条</span>
      </span>

      <div class="prompts-step-pills">
        <button
          v-for="(st, i) in steps"
          :key="st.key"
          class="prompts-step-pill"
          :class="{ active: activeStep === st.key }"
          :style="{ '--step-color': st.color }"
          @click="activeStep = st.key"
        >
          <span class="step-dot" :style="{ background: activeStep === st.key ? st.color : '#d1d5db' }">{{ i + 1 }}</span>
          {{ st.label }}
          <span class="step-n">{{ countByStep(st.key) }}</span>
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-body">
      <transition name="fade" mode="out-in">
        <div v-if="!filteredList.length" class="empty-state" key="empty">
          <div style="font-size:56px;margin-bottom:12px;"><el-icon :size="56"><Document /></el-icon></div>
          <p style="color:#9ca3af;">暂无提示词模板</p>
          <el-button type="primary" round @click="openAdd">创建第一个模板</el-button>
        </div>

        <div v-else class="card-list" key="list">
          <div
            v-for="p in filteredList"
            :key="p.id"
            :class="['prompt-card', { expanded: expandedId === p.id }]"
            :style="{ '--step-color': stepColor(activeStep) }"
          >
            <!-- 折叠视图 -->
            <div class="card-collapsed" @click="toggleExpand(p.id)">
              <div class="card-accent" :style="{ background: stepColor(activeStep) }"></div>
              <div class="card-body">
                <div class="card-header">
                  <h3 class="card-title">{{ p.title }}</h3>
                  <span v-if="p.tags && p.tags.length" class="card-tags">
                    <span v-for="t in p.tags" :key="t" class="card-tag">{{ t }}</span>
                  </span>
                </div>
                <p class="card-preview">{{ previewContent(p.content) }}</p>
              </div>
              <div class="card-actions" @click.stop>
                <el-button size="small" round @click="doCopy(p)" title="复制">
                  <el-icon><DocumentCopy /></el-icon> 复制
                </el-button>
                <el-button size="small" round @click="toggleExpand(p.id)" title="展开">
                  <el-icon><View /></el-icon> {{ expandedId === p.id ? '收起' : '展开' }}
                </el-button>
                <el-button size="small" round @click="openEdit(p)" title="编辑">
                  <el-icon><Edit /></el-icon> 编辑
                </el-button>
              </div>
            </div>

            <!-- 展开视图 -->
            <transition name="slide">
              <div v-if="expandedId === p.id" class="card-expanded">
                <div class="expanded-toolbar">
                  <span class="expanded-title">{{ p.title }}</span>
                  <el-button type="primary" round size="small" @click="doCopy(p)">
                    <el-icon><DocumentCopy /></el-icon> 一键复制全文
                  </el-button>
                </div>
                <pre class="expanded-content">{{ p.content }}</pre>
              </div>
            </transition>
          </div>
        </div>
      </transition>
    </div>

    <!-- 编辑/新增弹窗 -->
    <el-dialog
      v-model="dialogOpen"
      :title="isEditing ? ' 编辑模板' : ' 新增模板'"
      width="720px"
      destroy-on-close
    >
      <el-form label-width="80px" size="default">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="输入模板名称..." size="large" />
        </el-form-item>
        <el-form-item label="步骤分类">
          <el-select v-model="form.step" size="large" style="width:100%;">
            <el-option v-for="st in steps" :key="st.key" :label="st.label" :value="st.key" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.tagsStr" placeholder="逗号分隔，如: 剧本, AI编剧" size="large" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="18"
            placeholder="粘贴提示词内容..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button v-if="isEditing" type="danger" @click="doDelete" style="margin-right:auto;">
          <el-icon :size="14"><Delete /></el-icon> 删除
        </el-button>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" @click="doSave"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api'

const steps = [
  { key: '第一步：剧本', label: '剧本生成', color: '#a78bfa' },
  { key: '第二步：人物 物品 场景的提取', label: '元素提取', color: '#60a5fa' },
  { key: '第三步：生资产', label: '资产生成', color: '#22d3ee' },
  { key: '第四步：分镜提示词', label: '分镜提示词', color: '#fb923c' },
  { key: '第五步：生分镜', label: '分镜生成', color: '#f472b6' },
]

const prompts = ref([])
const activeStep = ref(steps[0].key)
const expandedId = ref(null)
const dialogOpen = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const form = reactive({ title: '', step: steps[0].key, tagsStr: '', content: '' })

const filteredList = computed(() => prompts.value.filter(p => p.step === activeStep.value))

function stepColor(key) {
  return steps.find(s => s.key === key)?.color || '#6366f1'
}

function countByStep(key) {
  return prompts.value.filter(p => p.step === key).length
}

function previewContent(content) {
  if (!content) return '(空内容)'
  return content.replace(/\n/g, ' ').substring(0, 120) + (content.length > 120 ? '…' : '')
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

async function doCopy(p) {
  try {
    await navigator.clipboard.writeText(p.content || '')
    ElMessage.success('已复制到剪贴板')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = p.content || ''
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    ElMessage.success('已复制到剪贴板')
  }
}

function openAdd() {
  isEditing.value = false
  editingId.value = null
  form.title = ''
  form.step = activeStep.value
  form.tagsStr = ''
  form.content = ''
  dialogOpen.value = true
}

function openEdit(p) {
  isEditing.value = true
  editingId.value = p.id
  form.title = p.title || ''
  form.step = p.step || steps[0].key
  form.tagsStr = (p.tags || []).join(', ')
  form.content = p.content || ''
  dialogOpen.value = true
}

async function doSave() {
  if (!form.title.trim()) { ElMessage.warning('请输入标题'); return }
  const data = {
    title: form.title.trim(),
    step: form.step,
    content: form.content,
    tags: form.tagsStr.split(',').map(t => t.trim()).filter(Boolean),
  }
  if (isEditing.value) {
    const res = await api.prompts.update(editingId.value, data)
    if (res.success) { ElMessage.success('已更新'); dialogOpen.value = false; load() }
    else { ElMessage.error('更新失败') }
  } else {
    const res = await api.prompts.add(data)
    if (res.success) { ElMessage.success('已创建'); dialogOpen.value = false; activeStep.value = data.step; load() }
    else { ElMessage.error('创建失败') }
  }
}

async function doDelete() {
  try {
    await ElMessageBox.confirm('确定删除此模板？', '确认删除', { type: 'warning' })
  } catch { return }
  await api.prompts.delete(editingId.value)
  ElMessage.success('已删除')
  dialogOpen.value = false
  load()
}

async function load() {
  const res = await api.prompts.list()
  if (res.success) prompts.value = res.data
}

onMounted(load)
</script>

<style scoped>
.prompts-page { animation: fadeIn .3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
.page-header { margin-bottom:24px; }
.page-header h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }

/* ====== 工具栏 ====== */
.prompts-toolbar {
  display:flex; align-items:center; gap:12px;
  margin-bottom:24px; flex-wrap:wrap;
  padding:14px 18px;
  background:#fff; border-radius:14px;
  border:1px solid #e5e7eb;
  box-shadow:0 1px 3px rgba(0,0,0,.03);
}

.prompts-btn-add {
  display:inline-flex !important; align-items:center; gap:6px;
  font-weight:700 !important; border-radius:10px !important;
  padding:9px 18px !important; font-size:14px !important;
  transition:all 0.2s !important;
}
.prompts-btn-add:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.25); }

.prompts-count-badge {
  display:inline-flex; align-items:baseline; gap:2px;
  padding:6px 12px; border-radius:8px;
  background:#f3f4f6; border:1px solid #e5e7eb;
}
.prompts-count-num { font-size:16px; font-weight:800; color:#6366f1; }
.prompts-count-label { font-size:11px; color:#9ca3af; font-weight:600; }

/* 步骤 pills */
.prompts-step-pills { display:flex; gap:6px; flex-wrap:wrap; flex:1; }
.prompts-step-pill {
  display:inline-flex; align-items:center; gap:5px;
  padding:7px 14px; border-radius:20px;
  border:1.5px solid #e5e7eb; background:#fff;
  font-size:12px; font-weight:600; color:#6b7280;
  cursor:pointer; transition:all 0.2s;
  white-space:nowrap;
}
.prompts-step-pill:hover { border-color:var(--step-color); color:var(--step-color); background:#f8faff; }
.prompts-step-pill.active { border-color:var(--step-color); background:var(--step-color); color:#fff; }
.step-dot {
  display:inline-flex; align-items:center; justify-content:center;
  width:18px; height:18px; border-radius:50%;
  font-size:10px; font-weight:800; color:#fff;
}
.prompts-step-pill.active .step-dot { background:rgba(255,255,255,.3); }
.step-n {
  display:inline-flex; align-items:center; justify-content:center;
  min-width:18px; height:18px; padding:0 5px;
  border-radius:9px; background:#e5e7eb; color:#6b7280;
  font-size:10px; font-weight:700;
}
.prompts-step-pill.active .step-n { background:rgba(255,255,255,.25); color:#fff; }

/* ====== 主区域 ====== */
.main-body { min-height:300px; }

.empty-state { text-align:center; padding:80px 20px; }

/* ====== 卡片列表 ====== */
.card-list { display:flex; flex-direction:column; gap:12px; }

.prompt-card {
  background:#fff; border:1px solid #e5e7eb; border-radius:12px;
  overflow:hidden; transition:all 0.2s;
  box-shadow:0 1px 3px rgba(0,0,0,.04);
}
.prompt-card:hover { border-color:#c7d2fe; box-shadow:0 4px 16px rgba(0,0,0,.06); }
.prompt-card.expanded {
  border-color:var(--step-color);
  box-shadow:0 0 0 2px color-mix(in srgb, var(--step-color) 20%, transparent);
}

.card-collapsed { display:flex; align-items:stretch; cursor:pointer; }
.card-accent { width:4px; flex-shrink:0; border-radius:2px 0 0 2px; }
.card-body { flex:1; padding:16px 20px; min-width:0; }
.card-header { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px; }
.card-title { font-size:15px; font-weight:700; color:#1f2937; margin:0; }
.card-tags { display:flex; gap:6px; flex-wrap:wrap; }
.card-tag {
  font-size:10px; padding:2px 8px; border-radius:4px;
  background:#eef2ff; color:#6366f1; font-weight:600;
}
.card-preview {
  font-size:12px; color:#9ca3af; line-height:1.5; margin:0;
  overflow:hidden; text-overflow:ellipsis;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
}
.card-actions {
  display:flex; align-items:center; gap:6px;
  padding:16px 16px 16px 8px; flex-shrink:0;
}
.card-actions .el-button { transition:all 0.15s; }
.card-actions .el-button:hover { transform:scale(1.05); }

/* 展开内容 */
.card-expanded {
  border-top:1px solid #e5e7eb; background:#fafafa;
}
.expanded-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 20px; background:#eef2ff; border-bottom:1px solid #e0e7ff;
}
.expanded-title { font-size:14px; font-weight:700; color:#374151; }
.expanded-content {
  margin:0; padding:20px 24px;
  font-size:13px; line-height:1.7; color:#374151;
  font-family:'Courier New', 'PingFang SC', monospace;
  white-space:pre-wrap; word-wrap:break-word;
  max-height:600px; overflow-y:auto; background:#fff;
}

.fade-enter-active, .fade-leave-active { transition:opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity:0; }
.slide-enter-active, .slide-leave-active { transition:all 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity:0; max-height:0; }
.slide-enter-to, .slide-leave-from { max-height:800px; }
</style>
