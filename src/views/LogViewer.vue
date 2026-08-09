<template>
  <div class="audit-page enterprise-page enterprise-page--wide">
    <div class="audit-top">
      <h2><el-icon :size="22"><Notebook /></el-icon> 操作日志</h2>
      <div class="audit-summary-strip">
        <div class="audit-stat"><b>{{ stats.today }}</b><span>今日操作</span></div>
        <div class="audit-stat"><b>{{ stats.thisWeek }}</b><span>本周操作</span></div>
        <div class="audit-stat"><b>{{ files.length || 0 }}</b><span>日志天数</span></div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="audit-toolbar">
      <div class="audit-tb-left">
        <div class="audit-search">
          <el-icon :size="15"><Search /></el-icon>
          <input v-model="searchText" placeholder="搜索操作人、模块、详情..." class="audit-search-input" />
          <el-icon v-if="searchText" :size="13" class="audit-search-clear" @click="searchText=''"><Close /></el-icon>
        </div>
        <div class="audit-pills">
          <button v-for="m in moduleFilters" :key="m.key" class="audit-pill" :class="{active:filterModule===m.key}" @click="filterModule=filterModule===m.key?'':m.key">{{ m.label }}</button>
        </div>
      </div>
      <div class="audit-tb-right">
        <el-select v-model="selectedFile" size="default" style="width:160px;" @change="loadLogs" placeholder="选择日期">
          <el-option v-for="f in files" :key="f.name" :label="f.label" :value="f.name" />
        </el-select>
        <el-button size="small" @click="refresh" :loading="loading" circle><el-icon :size="14"><Refresh /></el-icon></el-button>
      </div>
    </div>

    <!-- 加载/错误/空 -->
    <div v-if="loadError" class="audit-placeholder">
      <el-icon :size="48" color="#f59e0b"><WarningFilled /></el-icon>
      <p>加载失败</p><p style="font-size:12px;color:#9ca3af;">{{ loadError }}</p>
      <el-button size="small" @click="refresh">重试</el-button>
    </div>
    <div v-else-if="loading" class="audit-placeholder"><el-icon :size="32"><Loading /></el-icon><p>加载中...</p></div>
    <div v-else-if="!displayEntries.length" class="audit-placeholder">
      <el-icon :size="48" color="#d1d5db"><Notebook /></el-icon>
      <p>暂无日志</p><p style="font-size:12px;color:#9ca3af;">操作数据后自动出现</p>
    </div>

    <!-- 表格 -->
    <div v-else class="audit-table-wrap">
      <table class="audit-table">
        <thead>
          <tr>
            <th style="width:130px;">时间</th>
            <th style="width:80px;">操作人</th>
            <th style="width:70px;">模块</th>
            <th style="width:80px;">操作</th>
            <th>目标</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(e, i) in displayEntries" :key="i" :class="{new: i===0 && isToday(selectedFile)}">
            <td class="td-time">
              <span class="td-time-date">{{ formatDate(e.ts) }}</span>
              <span class="td-time-clock">{{ formatTime(e.ts) }}</span>
            </td>
            <td class="td-user">
              <span class="td-user-avatar" :class="e.role==='admin'?'admin':''">{{ (e.user||'系').charAt(0) }}</span>
              <span class="td-user-name">{{ e.user || '系统' }}</span>
            </td>
            <td>
              <span class="td-module-badge" :style="{background:moduleColor(e.action),color:'#fff'}">{{ moduleLabel(e.action) }}</span>
            </td>
            <td>
              <span class="td-action-tag" :class="actionClass(e.action)">{{ actionLabel(e.action) }}</span>
            </td>
            <td class="td-detail">
              <span class="td-target">{{ formatDetail(e.detail) }}</span>
              <span class="td-meta" v-if="e.detail?.accountId">账号：{{ e.detail.accountId }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="audit-footer">
        <span>共 {{ displayEntries.length }} 条记录</span>
        <span class="audit-hint">仅保留最近 100 条</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const files = ref([])
const selectedFile = ref('')
const entries = ref([])
const loading = ref(false)
const loadError = ref('')
const searchText = ref('')
const filterModule = ref('')

const moduleFilters = [
  { key: 'vps', label: 'VPS' },
  { key: 'daily', label: '日报' },
  { key: 'prompt', label: '提示词' },
  { key: 'config', label: '配置' },
  { key: 'assets', label: '资产' },
  { key: 'users', label: '用户' },
  { key: 'roles', label: '角色' },
]

const displayEntries = computed(() => {
  let arr = entries.value
  const kw = searchText.value.trim().toLowerCase()
  if (kw) arr = arr.filter(e =>
    (e.user||'').toLowerCase().includes(kw) ||
    (e.action||'').toLowerCase().includes(kw) ||
    JSON.stringify(e.detail||{}).toLowerCase().includes(kw)
  )
  if (filterModule.value) arr = arr.filter(e => (e.action||'').startsWith(filterModule.value+'.'))
  return arr
})

const stats = computed(() => {
  const now = new Date()
  const todayStr = now.toISOString().slice(0,10)
  let today=0, thisWeek=0
  for (const f of files.value) {
    const fileDate = f.name.replace('.log','')
    // count from entries rather than files for accuracy
    if (fileDate === todayStr.replace(/-/g,'')) today++
  }
  entries.value.forEach(e => {
    if (e.ts && e.ts.slice(0,10) === todayStr) today++
    const d = new Date(e.ts)
    const dayOfWeek = d.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((dayOfWeek+6)%7))
    if (d >= monday) thisWeek++
  })
  return { today, thisWeek }
})

function isToday(fileName) {
  if (!fileName) return false
  return fileName.replace('.log','') === new Date().toISOString().slice(0,10).replace(/-/g,'')
}

async function refresh() { loadError.value=''; await loadFiles() }

async function loadFiles() {
  loading.value=true
  try {
    const token=localStorage.getItem('pan_token')||''
    const res=await fetch('/api/logs/files',{headers:{'X-Auth-Token':token}})
    if (res.status===401){loadError.value='请退出重新登录';return}
    const data=await res.json()
    if(data.success&&data.data.length){files.value=data.data;selectedFile.value=data.data[0].name;loadLogs()}
  }catch(e){loadError.value=e.message}
  loading.value=false
}

async function loadLogs() {
  if(!selectedFile.value)return
  loading.value=true
  try {
    const token=localStorage.getItem('pan_token')||''
    const res=await fetch('/api/logs/read/'+selectedFile.value,{headers:{'X-Auth-Token':token}})
    const data=await res.json()
    if(data.success)entries.value=data.data;else loadError.value=data.error||'读取失败'
  }catch(e){loadError.value=e.message}
  loading.value=false
}

function formatDate(ts) { if(!ts)return''; const d=new Date(ts); return d.getMonth()+1+'月'+d.getDate()+'日' }
function formatTime(ts) { if(!ts)return''; const d=new Date(ts); return [d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':') }

const MODULE_MAP = {
  vps:{label:'VPS',color:'#6366f1'}, daily:{label:'日报',color:'#10b981'},
  prompt:{label:'提示词',color:'#f59e0b'}, config:{label:'配置',color:'#8b5cf6'},
  assets:{label:'资产',color:'#ec4899'}, users:{label:'用户',color:'#ef4444'},
  roles:{label:'角色',color:'#f97316'}, salesPerson:{label:'销售',color:'#06b6d4'},
  customerStats:{label:'统计',color:'#14b8a6'}, scripts:{label:'剧本',color:'#a78bfa'},
  library:{label:'资料',color:'#84cc16'}, tools:{label:'素材',color:'#0891b2'},
  system:{label:'系统',color:'#6b7280'},
}
function moduleLabel(action) { const m=(action||'').split('.')[0]; return MODULE_MAP[m]?.label||m||'其他' }
function moduleColor(action) { const m=(action||'').split('.')[0]; return MODULE_MAP[m]?.color||'#6b7280' }

const ACTION_MAP = {
  'vps.add':'新增','vps.update':'更新','vps.delete':'删除','vps.restore':'恢复',
  'daily.save':'保存','daily.delete':'删除',
  'prompt.add':'新增','prompt.update':'编辑','prompt.delete':'删除',
  'config.addWeek':'新增','config.updateWeek':'编辑','config.deleteWeek':'关闭','config.restoreWeek':'恢复','config.permDeleteWeek':'永久删除',
  'assets.upload':'上传','assets.update':'编辑','assets.delete':'删除','assets.batchDelete':'批量删除',
  'users.add':'新增','users.update':'编辑','users.delete':'删除',
  'roles.add':'新增','roles.update':'编辑','roles.delete':'删除',
  'salesPerson.add':'新增','salesPerson.delete':'删除',
  'customerStats.save':'保存','customerStats.delete':'删除',
  'scripts.add':'新增','scripts.update':'编辑','scripts.delete':'删除',
  'library.update':'编辑','library.delete':'删除',
  'tools.saveImage':'保存','tools.deleteImage':'删除','tools.saveVideo':'保存','tools.deleteVideo':'删除','tools.uploadRaw':'上传','tools.uploadVideo':'上传',
  'system.test':'测试',
}
function actionLabel(a) { return ACTION_MAP[a]||(a||'').split('.').pop()||'未知' }
function actionClass(a) {
  if(!a)return''
  if(a.includes('.add')||a.includes('.upload')||a.includes('.save')||a.includes('.restore'))return'tag-success'
  if(a.includes('.delete')||a.includes('.permDelete'))return'tag-danger'
  if(a.includes('.update')||a.includes('.edit'))return'tag-info'
  return''
}

function formatDetail(d) {
  if(!d)return'—'
  const p=[]
  if(d.name)p.push(d.name)
  if(d.title)p.push(d.title)
  if(d.showName)p.push(d.showName)
  if(d.username)p.push(d.username)
  if(d.expire)p.push('到期'+d.expire.substring(0,10))
  if(d.date)p.push(d.date)
  if(d.count)p.push(d.count+'个')
  if(d.id&&!d.name&&!d.title)p.push('ID:'+d.id)
  return p.join(' · ')||JSON.stringify(d).substring(0,80)
}

onMounted(loadFiles)
</script>

<style scoped>
.audit-page { max-width:1100px; margin:0 auto; min-height:100%; display:flex; flex-direction:column; }
.audit-top { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:20px; flex-wrap:wrap; }
.audit-top h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }

.audit-summary-strip { display:flex; gap:20px; }
.audit-stat { text-align:center; }
.audit-stat b { display:block; font-size:20px; font-weight:800; color:#1f2937; }
.audit-stat span { font-size:11px; color:#9ca3af; font-weight:600; }

/* 工具栏 */
.audit-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.audit-tb-left { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.audit-tb-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }

.audit-search { position:relative; display:flex; align-items:center; }
.audit-search > .el-icon:first-child { position:absolute; left:10px; color:#9ca3af; }
.audit-search-input { width:200px; height:34px; padding:0 28px 0 30px; border:1.5px solid #e5e7eb; border-radius:8px; font-size:12px; outline:none; background:#f9fafb; }
.audit-search-input:focus { border-color:#6366f1; background:#fff; }
.audit-search-clear { position:absolute; right:6px; cursor:pointer; color:#9ca3af; }
.audit-search-clear:hover { color:#6b7280; }

.audit-pills { display:flex; gap:4px; }
.audit-pill { padding:4px 10px; border-radius:6px; border:1px solid #e5e7eb; background:#fff; font-size:11px; font-weight:600; color:#6b7280; cursor:pointer; transition:.12s; }
.audit-pill:hover { border-color:#c7d2fe; color:#6366f1; }
.audit-pill.active { background:#6366f1; color:#fff; border-color:#6366f1; }

.audit-placeholder { text-align:center; padding:60px; color:#9ca3af; display:flex; flex-direction:column; align-items:center; gap:8px; }

/* 表格 */
.audit-table-wrap { background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
.audit-table { width:100%; border-collapse:collapse; }
.audit-table th { font-size:11px; font-weight:700; color:#9ca3af; text-align:left; padding:10px 16px; background:#f9fafb; border-bottom:1px solid #e5e7eb; text-transform:uppercase; letter-spacing:.5px; }
.audit-table td { font-size:13px; padding:12px 16px; border-bottom:1px solid #f3f4f6; vertical-align:middle; }
.audit-table tbody tr:hover { background:#f9fafb; }
.audit-table tbody tr:last-child td { border-bottom:none; }
.audit-table tbody tr.new { background:#f0fdf4; }

.td-time { white-space:nowrap; }
.td-time-date { font-size:12px; font-weight:600; color:#374151; }
.td-time-clock { display:block; font-size:11px; color:#9ca3af; font-family:monospace; margin-top:1px; }

.td-user { display:flex; align-items:center; gap:8px; }
.td-user-avatar { width:26px; height:26px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#6366f1,#818cf8); color:#fff; font-size:12px; font-weight:700; flex-shrink:0; }
.td-user-avatar.admin { background:linear-gradient(135deg,#ef4444,#f87171); }
.td-user-name { font-size:12px; font-weight:600; color:#374151; }

.td-module-badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; letter-spacing:.3px; }

.td-action-tag { font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; }
.tag-success { background:#ecfdf3; color:#059669; }
.tag-danger { background:#fef2f2; color:#dc2626; }
.tag-info { background:#eff6ff; color:#2563eb; }

.td-detail { }
.td-target { font-size:12px; color:#374151; font-weight:500; }
.td-meta { display:block; font-size:10px; color:#9ca3af; margin-top:2px; }

.audit-footer { display:flex; justify-content:space-between; padding:10px 16px; background:#f9fafb; border-top:1px solid #e5e7eb; font-size:11px; color:#9ca3af; }
.audit-hint { font-style:italic; }
</style>
