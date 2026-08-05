<template>
  <div class="cs-page">
    <!-- 顶部 -->
    <div class="top-bar">
      <div class="top-left">
        <h2><el-icon :size="24"><DataAnalysis /></el-icon> 客户数据统计</h2>
        <el-date-picker v-model="formDate" type="date" value-format="YYYY-MM-DD" size="default" style="width:148px;" @change="onDateChange" />
        <el-select v-model="accountId" size="default" style="width:180px;" placeholder="选择广告账号" @change="onAccountChange">
          <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
        </el-select>
        <el-tag v-if="existingId" type="success" effect="dark" size="small" round>已有数据</el-tag>
        <el-tag v-else type="info" effect="plain" size="small" round>新日期</el-tag>
      </div>
      <div class="top-right">
        <el-button size="default" @click="salesManageVisible = true"><el-icon :size="14"><Setting /></el-icon> 管理销售</el-button>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" size="default" @click="saveData"><el-icon :size="15"><Check /></el-icon> 保存</el-button>
      <el-button size="default" @click="clearForm" type="danger" plain><el-icon :size="15"><Delete /></el-icon> 清空</el-button>
      <span v-if="saveMsg" class="save-msg" :class="{ ok: saveOk, err: !saveOk }">{{ saveMsg }}</span>
    </div>

    <!-- 双栏布局 -->
    <div class="main-layout" v-if="accountId">
      <!-- 左栏：表单 + 历史 -->
      <div class="left-panel">
        <!-- 本日数据 -->
        <div class="card daily-card">
          <div class="card-hd">⭐ 本日数据</div>
          <div class="form-grid">
            <div class="fg-item">
              <label>1. 本日新客户</label>
              <el-input-number v-model="form.newCustomers" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>
            </div>
            <div class="fg-item">
              <label>2. 本日有回复的客户</label>
              <el-input-number v-model="form.repliedCustomers" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>
            </div>
            <div class="fg-item">
              <label>3. 本日已登记客户</label>
              <el-input-number v-model="form.registeredCustomers" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>
            </div>
            <div class="fg-item">
              <label>4. 本日已拉群且有平面图</label>
              <el-input-number v-model="form.groupedWithPlan" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>
            </div>
            <div class="fg-item">
              <label>5. 本日来访客户</label>
              <el-input-number v-model="form.visitingCustomers" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>
            </div>
            <div class="fg-item">
              <label>6. 本日成交客户</label>
              <el-input-number v-model="form.closedDeals" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>
            </div>
          </div>
          <!-- 分配销售 -->
          <div class="fg-sales-section">
            <label class="fg-sales-label">7. 拉群客户分配销售</label>
            <div class="fg-sales-list">
              <div v-for="(sa, i) in form.salesAssignments" :key="i" class="fg-sales-row">
                <el-select v-model="sa.name" placeholder="选择销售" size="default" class="fg-sales-select" clearable filterable>
                  <el-option v-for="sp in salesPersons" :key="sp.id" :label="sp.name" :value="sp.name" />
                </el-select>
                <el-input-number v-model="sa.count" :min="1" :controls="false" placeholder="0" class="fg-sales-count" />
                <span class="fg-unit">个</span>
                <el-button size="small" text type="danger" @click="removeSalesRow(i)"><el-icon :size="14"><Close /></el-icon></el-button>
              </div>
              <el-button size="small" text type="primary" @click="addSalesRow" class="fg-sales-add">
                <el-icon :size="13"><Plus /></el-icon> 添加销售
              </el-button>
            </div>
          </div>
        </div>

        <!-- 历史记录 -->
        <div class="card history-card">
          <div class="card-hd">📋 历史记录</div>
          <div class="history-table-wrap" v-if="history.length">
            <div class="ht-head">
              <span class="ht-cell ht-cell--date">日期</span>
              <span class="ht-cell ht-cell--num">新客户</span>
              <span class="ht-cell ht-cell--num">回复</span>
              <span class="ht-cell ht-cell--num">登记</span>
              <span class="ht-cell ht-cell--num">拉群+图</span>
              <span class="ht-cell ht-cell--num">来访</span>
              <span class="ht-cell ht-cell--num">成交</span>
              <span class="ht-cell ht-cell--sales">分配销售</span>
            </div>
            <div v-for="r in history" :key="r.id" class="ht-row" @click="editRecord(r)">
              <span class="ht-cell ht-cell--date">{{ shortDate(r.date) }}</span>
              <span class="ht-cell ht-cell--num">{{ r.newCustomers || 0 }}</span>
              <span class="ht-cell ht-cell--num">{{ r.repliedCustomers || 0 }}</span>
              <span class="ht-cell ht-cell--num">{{ r.registeredCustomers || 0 }}</span>
              <span class="ht-cell ht-cell--num">{{ r.groupedWithPlan || 0 }}</span>
              <span class="ht-cell ht-cell--num">{{ r.visitingCustomers || 0 }}</span>
              <span class="ht-cell ht-cell--num">{{ r.closedDeals || 0 }}</span>
              <span class="ht-cell ht-cell--sales">{{ formatSalesText(r.salesAssignments) || '—' }}</span>
            </div>
          </div>
          <div v-else class="history-empty">暂无记录</div>
        </div>
      </div>

      <!-- 右栏：预览 + 月度 -->
      <div class="right-panel">
        <!-- 月度汇总 -->
        <div class="card monthly-card">
          <div class="card-hd">⭐ 月度数据（{{ formDate.substring(0, 7) }}）</div>
          <div class="monthly-list">
            <div class="ml-row"><span class="ml-idx">1.</span><span class="ml-label">本月总询盘客户</span><span class="ml-val">{{ monthly.newCustomers }}</span><span class="ml-unit">个</span></div>
            <div class="ml-row"><span class="ml-idx">2.</span><span class="ml-label">有回复的客户</span><span class="ml-val">{{ monthly.repliedCustomers }}</span><span class="ml-unit">个</span></div>
            <div class="ml-row"><span class="ml-idx">3.</span><span class="ml-label">已登记客户</span><span class="ml-val">{{ monthly.registeredCustomers }}</span><span class="ml-unit">个</span></div>
            <div class="ml-row"><span class="ml-idx">4.</span><span class="ml-label">已拉群且有平面图</span><span class="ml-val">{{ monthly.groupedWithPlan }}</span><span class="ml-unit">个</span></div>
            <div class="ml-row"><span class="ml-idx">5.</span><span class="ml-label">来访客户</span><span class="ml-val">{{ monthly.visitingCustomers }}</span><span class="ml-unit">个</span></div>
            <div class="ml-row"><span class="ml-idx">6.</span><span class="ml-label">成交客户</span><span class="ml-val">{{ monthly.closedDeals }}</span><span class="ml-unit">个</span></div>
            <div class="ml-row ml-row--sales">
              <span class="ml-idx">7.</span>
              <span class="ml-label">拉群客户分配销售</span>
              <span class="ml-val ml-val--text">
                <template v-if="monthly.salesAssignments.length">
                  <el-tag v-for="sa in monthly.salesAssignments" :key="sa.name" size="small" effect="plain" style="margin:1px 4px 1px 0;">{{ sa.name }}{{ sa.count }}个</el-tag>
                </template>
                <span v-else style="color:#d1d5db;">—</span>
              </span>
            </div>
          </div>
          <div class="monthly-footer">共 {{ monthly.records }} 天记录</div>
        </div>

        <!-- 数据预览 -->
        <div class="card preview-card" v-if="previewText">
          <div class="preview-hd">
            <span>📋 数据预览</span>
            <el-button size="small" type="primary" @click="copyPreview">一键复制</el-button>
          </div>
          <div class="preview-content">{{ previewText }}</div>
        </div>
        <div v-else class="preview-empty">
          <el-icon :size="28"><Document /></el-icon>
          <p>填写数据后<br/>自动生成预览</p>
        </div>
      </div>
    </div>

    <!-- 销售名单管理弹窗 -->
    <el-dialog v-model="salesManageVisible" title="管理销售名单" width="420px" destroy-on-close>
      <div class="sm-list">
        <div v-for="sp in salesPersons" :key="sp.id" class="sm-row">
          <span class="sm-name">{{ sp.name }}</span>
          <el-button size="small" text type="danger" @click="deleteSalesPerson(sp)"><el-icon :size="14"><Close /></el-icon></el-button>
        </div>
        <div v-if="!salesPersons.length" class="sm-empty">暂未添加销售</div>
        <div class="sm-add">
          <el-input v-model="newSalesName" placeholder="新销售名字" size="default" style="flex:1;" @keyup.enter="addSalesPerson" />
          <el-button type="primary" size="default" @click="addSalesPerson">添加</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="salesManageVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, todayStr } from '../api'

const accounts = ref([
  { id: 'lisa-office', name: '莉莎办公家具' },
  { id: 'zhenshan-office', name: '甄珊办公家具' },
  { id: 'xiege-office', name: '谢哥办公家具' },
])
const accountId = ref(localStorage.getItem('cs_accountId') || accounts.value[0].id)
const formDate = ref(todayStr())
const existingId = ref(null)
const saveMsg = ref('')
const saveOk = ref(true)

const salesPersons = ref([])
const salesManageVisible = ref(false)
const newSalesName = ref('')

const defaultForm = () => ({
  newCustomers: null, repliedCustomers: null, registeredCustomers: null,
  groupedWithPlan: null, visitingCustomers: null, closedDeals: null,
  salesAssignments: [],
})
const form = reactive(defaultForm())

const monthly = reactive({
  newCustomers: 0, repliedCustomers: 0, registeredCustomers: 0,
  groupedWithPlan: 0, visitingCustomers: 0, closedDeals: 0,
  salesAssignments: [], records: 0,
})

const history = ref([])

function shortDate(str) {
  if (!str) return ''
  const p = str.split('-')
  return parseInt(p[1]) + '/' + parseInt(p[2])
}

function formatSalesText(arr) {
  if (!Array.isArray(arr) || !arr.length) return ''
  return arr.filter(s => s.name).map(s => s.name + s.count + '个').join(' ')
}

function addSalesRow() {
  form.salesAssignments.push({ name: '', count: 1 })
}

function removeSalesRow(i) {
  form.salesAssignments.splice(i, 1)
}

async function loadSalesPersons() {
  const res = await api.salesPersons.list()
  if (res.success) salesPersons.value = res.data
}

async function addSalesPerson() {
  const name = newSalesName.value.trim()
  if (!name) { ElMessage.warning('请输入名字'); return }
  const res = await api.salesPersons.add(name)
  if (res.success) {
    newSalesName.value = ''
    loadSalesPersons()
  } else {
    ElMessage.error(res.error || '添加失败')
  }
}

async function deleteSalesPerson(sp) {
  const res = await api.salesPersons.delete(sp.id)
  if (res.success) loadSalesPersons()
}

async function loadData() {
  const d = formDate.value
  if (!d) return
  const res = await api.customerStats.list({ startDate: d, endDate: d, accountId: accountId.value })
  if (res.success && res.data.length) {
    const r = res.data[0]
    existingId.value = r.id
    form.newCustomers = r.newCustomers
    form.repliedCustomers = r.repliedCustomers
    form.registeredCustomers = r.registeredCustomers
    form.groupedWithPlan = r.groupedWithPlan
    form.visitingCustomers = r.visitingCustomers
    form.closedDeals = r.closedDeals
    form.salesAssignments = Array.isArray(r.salesAssignments) ? r.salesAssignments.map(s => ({ name: s.name || '', count: s.count || 1 })) : []
  } else {
    existingId.value = null
    Object.assign(form, defaultForm())
  }
  const month = d.substring(0, 7)
  const mRes = await api.customerStats.monthly(month, accountId.value)
  if (mRes.success) Object.assign(monthly, mRes.data)
  const hRes = await api.customerStats.list({ accountId: accountId.value })
  if (hRes.success) history.value = hRes.data.sort((a, b) => b.date.localeCompare(a.date))
}

function onDateChange() { saveMsg.value = ''; loadData() }
function onAccountChange() {
  localStorage.setItem('cs_accountId', accountId.value)
  loadData()
}

async function saveData() {
  const d = formDate.value
  if (!d) { ElMessage.warning('请选择日期'); return }
  const acc = accounts.value.find(a => a.id === accountId.value) || accounts.value[0]
  saveMsg.value = '保存中...'; saveOk.value = true
  try {
    const payload = {
      date: d, accountId: accountId.value, accountName: acc.name,
      newCustomers: form.newCustomers || 0,
      repliedCustomers: form.repliedCustomers || 0,
      registeredCustomers: form.registeredCustomers || 0,
      groupedWithPlan: form.groupedWithPlan || 0,
      visitingCustomers: form.visitingCustomers || 0,
      closedDeals: form.closedDeals || 0,
      salesAssignments: form.salesAssignments.filter(s => s.name),
    }
    const res = await api.customerStats.save(payload)
    if (res.success) {
      existingId.value = res.data.id
      saveMsg.value = ' 已保存'; saveOk.value = true
      loadData()
    } else {
      saveMsg.value = '❌ ' + (res.error || '未知错误'); saveOk.value = false
    }
  } catch (e) { saveMsg.value = '❌ ' + e.message; saveOk.value = false }
}

function clearForm() {
  Object.assign(form, defaultForm())
  existingId.value = null
  saveMsg.value = ''
  ElMessage.success('表单已清空')
}

function editRecord(r) {
  formDate.value = r.date
  if (r.accountId) accountId.value = r.accountId
  loadData()
}

// 预览文本
const previewText = computed(() => {
  const d = formDate.value
  if (!d) return ''
  const parts = d.split('-')
  const title = parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日总结'

  const salesText = form.salesAssignments.filter(s => s.name).map(s => s.name + s.count + '个').join(' ')

  let text = `${title}：
⭐本日数据：
1.本日新客户：${form.newCustomers || 0}个
2.本日有回复的客户：${form.repliedCustomers || 0}个
3.本日已登记客户：${form.registeredCustomers || 0}个
4.本日已拉群且有平面图客户：${form.groupedWithPlan || 0}个
5.本日来访客户：${form.visitingCustomers || 0}
6.本日成交客户：${form.closedDeals || 0}
7.拉群客户分配销售：${salesText || '无'}

⭐月度数据：
1.本月总询盘客户：${monthly.newCustomers}个
2.本月有回复的客户：${monthly.repliedCustomers}个
3.本月已登记客户：${monthly.registeredCustomers}个
4.本月已拉群且有平面图客户：${monthly.groupedWithPlan}个
5.本月来访客户：${monthly.visitingCustomers}
6.本月成交客户：${monthly.closedDeals}
7.拉群客户分配销售：${monthly.salesAssignments.length ? monthly.salesAssignments.map(s => s.name + s.count + '个').join(' ') : '无'}`
  return text
})

async function copyPreview() {
  if (!previewText.value) { ElMessage.warning('请先填写数据'); return }
  try { await navigator.clipboard.writeText(previewText.value); ElMessage.success('已复制到剪贴板') }
  catch {
    const ta = document.createElement('textarea')
    ta.value = previewText.value
    ta.style.position = 'fixed'; ta.style.left = '-9999px'
    document.body.appendChild(ta); ta.select()
    try { document.execCommand('copy'); ElMessage.success('已复制') }
    catch { ElMessage.error('复制失败') }
    document.body.removeChild(ta)
  }
}

onMounted(async () => {
  await loadSalesPersons()
  loadData()
})
</script>

<style scoped>
.cs-page { max-width: 1200px; margin: 0 auto; padding-bottom: 40px; }

/* ====== 顶部 ====== */
.top-bar {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 16px 24px; margin-bottom: 10px;
  box-shadow: 0 1px 2px rgba(0,0,0,.03);
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
}
.top-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.top-left h2 { font-size: 20px; font-weight: 700; margin: 0; white-space: nowrap; }

/* ====== 操作栏 ====== */
.action-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  padding: 10px 20px; margin-bottom: 16px;
}
.save-msg { font-size: 12px; font-weight: 600; margin-left: 8px; }
.save-msg.ok { color: #059669; }
.save-msg.err { color: #ef4444; }

/* ====== 双栏 ====== */
.main-layout { display: flex; gap: 18px; align-items: flex-start; }
.left-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.right-panel { width: 380px; flex-shrink: 0; position: sticky; top: 16px; display: flex; flex-direction: column; gap: 14px; }

/* ====== 卡片 ====== */
.card {
  background: #fff; border: 1px solid #e5e7eb;
  border-radius: 14px; padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,.03);
}
.card-hd { font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 16px; }

/* ====== 表单 ====== */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; margin-bottom: 14px; }
.fg-item { display: flex; align-items: center; gap: 8px; }
.fg-item label { font-size: 13px; font-weight: 600; color: #374151; white-space: nowrap; flex-shrink: 0; }
.fg-input { width: 100px; flex-shrink: 0; }
.fg-input :deep(.el-input__wrapper) { background: #fff; border-radius: 8px; box-shadow: 0 0 0 1px #e5e7eb; padding: 2px 10px; }
.fg-input :deep(.el-input__inner) { font-size: 15px; font-weight: 700; color: #1f2937; height: 36px; }
.fg-unit { font-size: 12px; color: #9ca3af; font-weight: 600; }

/* 分配销售 */
.fg-sales-section { border-top: 1px solid #f3f4f6; padding-top: 14px; }
.fg-sales-label { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 8px; }
.fg-sales-list { display: flex; flex-direction: column; gap: 6px; }
.fg-sales-row { display: flex; align-items: center; gap: 6px; }
.fg-sales-select { width: 160px; flex-shrink: 0; }
.fg-sales-count { width: 80px; flex-shrink: 0; }
.fg-sales-count :deep(.el-input__wrapper) { background: #fff; border-radius: 8px; box-shadow: 0 0 0 1px #e5e7eb; padding: 2px 10px; }
.fg-sales-count :deep(.el-input__inner) { font-size: 14px; font-weight: 700; height: 32px; }
.fg-sales-add { align-self: flex-start; margin-top: 2px; }

/* ====== 月度 ====== */
.monthly-list { display: flex; flex-direction: column; gap: 6px; }
.ml-row { display: flex; align-items: center; gap: 6px; padding: 7px 10px; background: #f9fafb; border-radius: 8px; }
.ml-row--sales { align-items: flex-start; flex-wrap: wrap; }
.ml-idx { font-size: 12px; font-weight: 700; color: #6366f1; width: 18px; }
.ml-label { flex: 1; font-size: 12px; font-weight: 600; color: #374151; }
.ml-val { font-size: 18px; font-weight: 800; color: #1f2937; }
.ml-val--text { font-size: 12px; display: flex; flex-wrap: wrap; align-items: center; }
.ml-unit { font-size: 11px; color: #9ca3af; }
.monthly-footer { margin-top: 10px; font-size: 11px; color: #9ca3af; text-align: right; }

/* ====== 预览 ====== */
.preview-card { border-color: #c7d2fe; }
.preview-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 700; font-size: 14px; }
.preview-content { white-space: pre-wrap; font-size: 13px; line-height: 1.8; color: #374151; max-height: 50vh; overflow-y: auto; }
.preview-empty { text-align: center; padding: 40px 16px; color: #9ca3af; background: #fff; border: 1px dashed #e5e7eb; border-radius: 14px; }
.preview-empty p { margin: 8px 0 0; font-size: 13px; line-height: 1.6; }

/* ====== 历史 ====== */
.history-table-wrap { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.ht-head {
  display: grid;
  grid-template-columns: 80px 1fr 1fr 1fr 1fr 1fr 1fr 160px;
  padding: 6px 12px; align-items: center;
  background: #f9fafb; border-bottom: 1px solid #e5e7eb; gap: 4px;
}
.ht-row {
  display: grid;
  grid-template-columns: 80px 1fr 1fr 1fr 1fr 1fr 1fr 160px;
  padding: 8px 12px; align-items: center; gap: 4px;
  border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background .12s;
}
.ht-row:hover { background: #f5f3ff; }
.ht-row:last-of-type { border-bottom: none; }
.ht-cell { font-size: 11px; font-weight: 600; color: #9ca3af; }
.ht-cell--date { font-size: 13px; font-weight: 700; color: #374151; }
.ht-cell--num { font-size: 13px; font-weight: 700; color: #1f2937; text-align: center; }
.ht-cell--sales { font-size: 11px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.history-empty { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }

/* ====== 销售管理弹窗 ====== */
.sm-list { display: flex; flex-direction: column; gap: 6px; }
.sm-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; background: #f9fafb; border-radius: 8px;
}
.sm-name { font-size: 14px; font-weight: 600; color: #1f2937; }
.sm-empty { text-align: center; padding: 16px; color: #9ca3af; font-size: 13px; }
.sm-add { display: flex; gap: 8px; margin-top: 12px; }

@media (max-width: 860px) {
  .main-layout { flex-direction: column; }
  .right-panel { width: 100%; position: static; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
