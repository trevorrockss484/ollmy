<template>
  <div class="scripts-page">

    <!-- 顶栏 -->
    <div class="sc-topbar">
      <div class="sc-title">
        <h2><el-icon :size="24"><ChatDotRound /></el-icon> 话术库</h2>
        <span class="sc-count">{{ filteredList.length }} / {{ list.length }} 条</span>
      </div>
      <div class="sc-actions">
        <el-input v-model="search" placeholder="搜索标题或内容..." clearable size="default" style="width:240px;" :prefix-icon="Search" />
        <el-select v-model="filterCat" placeholder="分类筛选" clearable size="default" style="width:130px;">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>
        <el-button type="primary" round size="large" @click="openAdd">
          <el-icon><Plus /></el-icon> 新增话术
        </el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!list.length" class="sc-empty">
      <el-icon :size="64" color="#d1d5db"><ChatDotRound /></el-icon>
      <p style="font-size:16px;font-weight:600;color:#6b7280;margin:16px 0 6px;">话术库还是空的</p>
      <p style="font-size:14px;color:#9ca3af;margin-bottom:20px;">添加英文+中文话术，一键复制发给客户</p>
      <el-button type="primary" size="large" round @click="openAdd"><el-icon><Plus /></el-icon> 新增话术</el-button>
    </div>

    <div v-else-if="!filteredList.length" class="sc-empty"><p>没有匹配的话术</p></div>

    <!-- 卡片列表 -->
    <div v-else class="sc-grid">
      <div v-for="item in filteredList" :key="item.id" class="sc-card">
        <div class="sc-card-hd">
          <div class="sc-card-left">
            <span class="sc-card-cat" :style="{background: catColor(item.category)}">{{ item.category }}</span>
            <span class="sc-card-name">{{ item.title }}</span>
          </div>
          <div class="sc-card-right">
            <span v-if="item.usageCount" class="sc-usage">已用 {{ item.usageCount }} 次</span>
          </div>
        </div>
        <!-- 预览区：英文代码块 + 中文 -->
        <div class="sc-card-body" @click="openView(item)">
          <div v-if="item.content" class="sc-en-block">{{ truncate(item.content, 200) }}</div>
          <p v-if="item.contentCn" class="sc-card-cn">{{ truncate(item.contentCn, 120) }}</p>
          <p v-if="!item.content && !item.contentCn" class="sc-card-cn" style="color:#d1d5db;">（空内容）</p>
        </div>
        <div class="sc-card-ft">
          <el-button size="small" round type="primary" plain @click.stop="doCopy(item)">
            <el-icon><DocumentCopy /></el-icon> 复制
          </el-button>
          <el-button size="small" round @click.stop="openView(item)">
            <el-icon><View /></el-icon> 查看
          </el-button>
          <el-button size="small" round @click.stop="openEdit(item)">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button size="small" round type="danger" plain @click.stop="doDelete(item)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑话术' : '新增话术'" width="min(95vw, 720px)" destroy-on-close align-center :close-on-click-modal="false">
      <el-form label-position="top" size="default">
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <el-form-item label="标题" style="flex:1;min-width:200px;">
            <el-input v-model="form.title" placeholder="话术标题" size="large" maxlength="100" />
          </el-form-item>
          <el-form-item label="分类" style="width:180px;">
            <el-select v-model="form.category" size="large" style="width:100%;">
              <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="英文内容">
          <el-input v-model="form.content" type="textarea" :rows="8" placeholder="英文话术（发给客户的原文）" />
        </el-form-item>
        <el-form-item label="中文内容">
          <el-input v-model="form.contentCn" type="textarea" :rows="8" placeholder="中文翻译（方便自己看的）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button v-if="editingId" type="danger" @click="doDeleteById(editingId)" style="margin-right:auto;">删除</el-button>
        <el-button size="large" round @click="dialogVisible = false">取消</el-button>
        <el-button size="large" round type="primary" @click="doSave">
          <el-icon><Check /></el-icon> {{ editingId ? '保存' : '新增' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看弹窗：英文在上，中文在下 -->
    <el-dialog v-model="viewVisible" title="话术详情" width="min(95vw, 620px)" destroy-on-close align-center>
      <div v-if="viewItem" class="view-dialog">
        <div class="vd-hd">
          <span class="sc-card-cat" :style="{background: catColor(viewItem.category)}">{{ viewItem.category }}</span>
          <span class="vd-name">{{ viewItem.title }}</span>
        </div>
        <!-- 英文 -->
        <div v-if="viewItem.content" class="vd-block">
          <div class="vd-label">English</div>
          <pre class="vd-content vd-en">{{ viewItem.content }}</pre>
        </div>
        <!-- 中文 -->
        <div v-if="viewItem.contentCn" class="vd-block">
          <div class="vd-label">中文</div>
          <pre class="vd-content vd-cn">{{ viewItem.contentCn }}</pre>
        </div>
        <div class="vd-ft">
          <el-button type="primary" round size="large" @click="doCopy(viewItem)">
            <el-icon><DocumentCopy /></el-icon> 复制英文内容
          </el-button>
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

const list = ref([])
const search = ref('')
const filterCat = ref('')
const categories = ['开场白', '产品介绍', '价格谈判', '逼单', '售后跟进', '节日问候', '日常维护', '其他']

function catColor(c) {
  const m = { '开场白':'#10b981','产品介绍':'#6366f1','价格谈判':'#f59e0b','逼单':'#ef4444','售后跟进':'#8b5cf6','节日问候':'#f97316','日常维护':'#06b6d4','其他':'#6b7280' }
  return m[c] || '#6b7280'
}
function truncate(t, n) { if (!t) return ''; return t.length > n ? t.substring(0, n) + '…' : t }

const filteredList = computed(() => {
  let arr = [...list.value]
  if (search.value) {
    const kw = search.value.toLowerCase()
    arr = arr.filter(s => (s.title || '').toLowerCase().includes(kw) || (s.content || '').toLowerCase().includes(kw) || (s.contentCn || '').includes(search.value))
  }
  if (filterCat.value) arr = arr.filter(s => s.category === filterCat.value)
  arr.sort((a, b) => b.id - a.id)
  return arr
})

const dialogVisible = ref(false)
const editingId = ref(null)
const form = ref({ title: '', content: '', contentCn: '', category: '开场白' })

function openAdd() { editingId.value = null; form.value = { title: '', content: '', contentCn: '', category: '开场白' }; dialogVisible.value = true }
function openEdit(s) { editingId.value = s.id; form.value = { title: s.title, content: s.content || '', contentCn: s.contentCn || '', category: s.category }; dialogVisible.value = true }

async function doSave() {
  if (!form.value.title.trim()) { ElMessage.warning('请输入标题'); return }
  if (!form.value.content.trim() && !form.value.contentCn.trim()) { ElMessage.warning('请至少填写英文或中文内容'); return }
  const token = localStorage.getItem('pan_token') || ''
  const body = JSON.stringify(form.value)
  try {
    const res = await fetch('/api/tools/scripts/' + (editingId.value ? editingId.value : 'add'), {
      method: editingId.value ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token }, body,
    })
    const json = await res.json()
    if (json.success) { ElMessage.success(editingId.value ? '已更新' : '已新增'); dialogVisible.value = false; await load() }
    else ElMessage.error(json.error || '保存失败')
  } catch { ElMessage.error('保存失败') }
}
async function doDelete(s) {
  try { await ElMessageBox.confirm(`删除「${s.title}」？`, '确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }) } catch { return }
  await doDeleteById(s.id)
}
async function doDeleteById(id) {
  const token = localStorage.getItem('pan_token') || ''
  try {
    const res = await fetch('/api/tools/scripts/' + id, { method: 'DELETE', headers: { 'X-Auth-Token': token } })
    const json = await res.json()
    if (json.success) { ElMessage.success('已删除'); dialogVisible.value = false; await load() }
  } catch { ElMessage.error('删除失败') }
}

const viewVisible = ref(false)
const viewItem = ref(null)
function openView(s) { viewItem.value = s; viewVisible.value = true }
async function doCopy(s) {
  try {
    await navigator.clipboard.writeText(s.content || '')
    try { await fetch('/api/tools/scripts/' + s.id + '/usage', { method: 'POST', headers: { 'X-Auth-Token': localStorage.getItem('pan_token') || '' }, body: '{}' }) } catch {}
    ElMessage.success('已复制英文内容')
  } catch {
    const ta = document.createElement('textarea'); ta.value = s.content || ''
    document.body.appendChild(ta); ta.select(); document.execCommand('copy')
    document.body.removeChild(ta); ElMessage.success('已复制')
  }
}

async function load() {
  try {
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/scripts', { headers: { 'X-Auth-Token': token } })
    const json = await res.json()
    if (json.success) list.value = json.data
  } catch {}
}
onMounted(() => load())
</script>

<style scoped>
.scripts-page { max-width: 1100px; margin: 0 auto; }

.sc-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.sc-title { display: flex; align-items: center; gap: 14px; }
.sc-title h2 { font-size: 22px; font-weight: 800; color: #111827; margin: 0; display: flex; align-items: center; gap: 10px; }
.sc-count { font-size: 14px; color: #9ca3af; font-weight: 500; }
.sc-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.sc-empty { text-align: center; padding: 100px 20px; }

/* ===== 卡片 ===== */
.sc-grid { display: flex; flex-direction: column; gap: 10px; }

.sc-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.sc-card:hover { border-color: #c7d2fe; box-shadow: 0 4px 20px rgba(99,102,241,.08); }

.sc-card-hd { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 0; }
.sc-card-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.sc-card-cat {
  font-size: 12px; font-weight: 700; color: #fff;
  padding: 4px 12px; border-radius: 8px; flex-shrink: 0;
  letter-spacing: .3px;
}
.sc-card-name { font-size: 16px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-card-right { flex-shrink: 0; }
.sc-usage { font-size: 12px; color: #9ca3af; font-weight: 500; }

.sc-card-body { padding: 12px 20px 18px; cursor: pointer; }
.sc-en-block {
  font-size: 14px; color: #e2e8f0; line-height: 1.8;
  background: #1e293b; border-radius: 10px; padding: 12px 16px;
  font-weight: 500; letter-spacing: .2px;
  display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
}
.sc-card-cn {
  font-size: 14px; color: #374151; line-height: 1.8; margin: 10px 0 0;
  padding: 10px 14px; background: #f9fafb; border-radius: 8px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.sc-card-ft {
  display: flex; gap: 8px; padding: 0 16px 16px;
}
.sc-card-ft .el-button { font-size: 13px; padding: 6px 16px; }

/* ===== 查看弹窗 ===== */
.view-dialog { display: flex; flex-direction: column; gap: 18px; }
.vd-hd { display: flex; align-items: center; gap: 12px; }
.vd-name { font-size: 18px; font-weight: 700; color: #111827; }
.vd-block { }
.vd-label {
  font-size: 11px; font-weight: 700; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 8px;
}
.vd-label::after { content: ''; flex: 1; height: 1px; background: #f3f4f6; }
.vd-content {
  margin: 0; padding: 20px 24px; border-radius: 14px;
  font-size: 14px; line-height: 1.8;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  white-space: pre-wrap; word-wrap: break-word;
  max-height: 40vh; overflow-y: auto;
}
.vd-en { background: #1e293b; color: #e2e8f0; }
.vd-cn { background: #f9fafb; color: #374151; }
.vd-ft { display: flex; justify-content: center; padding-top: 8px; }
</style>
