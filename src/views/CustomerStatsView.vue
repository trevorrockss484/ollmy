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
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" size="default" @click="saveData"><el-icon :size="15"><Check /></el-icon> 保存</el-button>
      <el-button size="default" @click="clearForm" type="danger" plain><el-icon :size="15"><Delete /></el-icon> 清空</el-button>
      <span v-if="saveMsg" class="save-msg" :class="{ ok: saveOk, err: !saveOk }">{{ saveMsg }}</span>
    </div>

    <div class="main-grid">
      <!-- ====== 本日数据 ====== -->
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
            <label>4. 本日已拉群且有平面图客户</label>
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
        <div class="fg-item fg-item--full">
          <label>7. 拉群客户分配销售</label>
          <el-input v-model="form.salesAssignments" placeholder="如：袁绮媚1个 陈婉镅2个" class="fg-input-text" />
        </div>
      </div>

      <!-- ====== 月度数据 ====== -->
      <div class="card monthly-card">
        <div class="card-hd">⭐ 月度数据（{{ formDate.substring(0, 7) }}）</div>
        <div class="monthly-list">
          <div class="ml-row">
            <span class="ml-idx">1.</span>
            <span class="ml-label">本月总询盘客户</span>
            <span class="ml-val">{{ monthly.newCustomers }}</span>
            <span class="ml-unit">个</span>
          </div>
          <div class="ml-row">
            <span class="ml-idx">2.</span>
            <span class="ml-label">本月有回复的客户</span>
            <span class="ml-val">{{ monthly.repliedCustomers }}</span>
            <span class="ml-unit">个</span>
          </div>
          <div class="ml-row">
            <span class="ml-idx">3.</span>
            <span class="ml-label">本月已登记客户</span>
            <span class="ml-val">{{ monthly.registeredCustomers }}</span>
            <span class="ml-unit">个</span>
          </div>
          <div class="ml-row">
            <span class="ml-idx">4.</span>
            <span class="ml-label">本月已拉群且有平面图客户</span>
            <span class="ml-val">{{ monthly.groupedWithPlan }}</span>
            <span class="ml-unit">个</span>
          </div>
          <div class="ml-row">
            <span class="ml-idx">5.</span>
            <span class="ml-label">本月来访客户</span>
            <span class="ml-val">{{ monthly.visitingCustomers }}</span>
            <span class="ml-unit">个</span>
          </div>
          <div class="ml-row">
            <span class="ml-idx">6.</span>
            <span class="ml-label">本月成交客户</span>
            <span class="ml-val">{{ monthly.closedDeals }}</span>
            <span class="ml-unit">个</span>
          </div>
          <div class="ml-row">
            <span class="ml-idx">7.</span>
            <span class="ml-label">拉群客户分配销售</span>
            <span class="ml-val ml-val--text">{{ monthly.salesAssignments || '—' }}</span>
          </div>
        </div>
        <div class="monthly-footer">共 {{ monthly.records }} 天记录</div>
      </div>
    </div>

    <!-- ====== 历史记录 ====== -->
    <div class="card history-card">
      <div class="card-hd">📋 历史记录</div>
      <div class="history-table-wrap" v-if="history.length">
        <div class="ht-head">
          <span class="ht-cell ht-cell--date">日期</span>
          <span class="ht-cell">新客户</span>
          <span class="ht-cell">回复</span>
          <span class="ht-cell">登记</span>
          <span class="ht-cell">拉群+图</span>
          <span class="ht-cell">来访</span>
          <span class="ht-cell">成交</span>
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
          <span class="ht-cell ht-cell--sales">{{ r.salesAssignments || '—' }}</span>
        </div>
      </div>
      <div v-else class="history-empty">暂无记录</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
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

const defaultForm = () => ({
  newCustomers: null, repliedCustomers: null, registeredCustomers: null,
  groupedWithPlan: null, visitingCustomers: null, closedDeals: null,
  salesAssignments: '',
})
const form = reactive(defaultForm())

const monthly = reactive({
  newCustomers: 0, repliedCustomers: 0, registeredCustomers: 0,
  groupedWithPlan: 0, visitingCustomers: 0, closedDeals: 0,
  salesAssignments: '', records: 0,
})

const history = ref([])

function shortDate(str) {
  if (!str) return ''
  const p = str.split('-')
  return parseInt(p[1]) + '/' + parseInt(p[2])
}

async function loadData() {
  const d = formDate.value
  if (!d) return
  // 加载当天该账号数据
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
    form.salesAssignments = r.salesAssignments || ''
  } else {
    existingId.value = null
    Object.assign(form, defaultForm())
  }
  // 加载月度汇总
  const month = d.substring(0, 7)
  const mRes = await api.customerStats.monthly(month, accountId.value)
  if (mRes.success) Object.assign(monthly, mRes.data)
  // 加载历史列表
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
      date: d,
      accountId: accountId.value,
      accountName: acc.name,
      newCustomers: form.newCustomers || 0,
      repliedCustomers: form.repliedCustomers || 0,
      registeredCustomers: form.registeredCustomers || 0,
      groupedWithPlan: form.groupedWithPlan || 0,
      visitingCustomers: form.visitingCustomers || 0,
      closedDeals: form.closedDeals || 0,
      salesAssignments: form.salesAssignments || '',
    }
    const res = await api.customerStats.save(payload)
    if (res.success) {
      existingId.value = res.data.id
      saveMsg.value = ' 已保存'; saveOk.value = true
      loadData() // 刷新月度+历史
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
  // accountId needs to match
  if (r.accountId) accountId.value = r.accountId
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.cs-page { max-width: 1000px; margin: 0 auto; padding-bottom: 40px; }

/* ====== 顶部 ====== */
.top-bar {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 16px 24px; margin-bottom: 10px;
  box-shadow: 0 1px 2px rgba(0,0,0,.03);
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

/* ====== 主网格 ====== */
.main-grid { display: grid; grid-template-columns: 1fr 380px; gap: 16px; margin-bottom: 16px; }

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
.fg-item label { font-size: 13px; font-weight: 600; color: #374151; white-space: nowrap; min-width: 0; flex-shrink: 0; }
.fg-item--full { margin-top: 4px; }
.fg-input { width: 100px; flex-shrink: 0; }
.fg-input :deep(.el-input__wrapper) { background: #fff; border-radius: 8px; box-shadow: 0 0 0 1px #e5e7eb; padding: 2px 10px; }
.fg-input :deep(.el-input__inner) { font-size: 15px; font-weight: 700; color: #1f2937; height: 36px; }
.fg-input-text { flex: 1; }
.fg-unit { font-size: 12px; color: #9ca3af; font-weight: 600; }

/* ====== 月度 ====== */
.monthly-list { display: flex; flex-direction: column; gap: 8px; }
.ml-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f9fafb; border-radius: 8px; }
.ml-idx { font-size: 13px; font-weight: 700; color: #6366f1; width: 20px; }
.ml-label { flex: 1; font-size: 13px; font-weight: 600; color: #374151; }
.ml-val { font-size: 20px; font-weight: 800; color: #1f2937; }
.ml-val--text { font-size: 13px; }
.ml-unit { font-size: 12px; color: #9ca3af; }
.monthly-footer { margin-top: 12px; font-size: 11px; color: #9ca3af; text-align: right; }

/* ====== 历史记录表 ====== */
.history-card { margin-bottom: 16px; }
.history-table-wrap {
  border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;
}
.ht-head {
  display: grid;
  grid-template-columns: 100px 1fr 1fr 1fr 1fr 1fr 1fr 180px;
  padding: 8px 14px; align-items: center;
  background: #f9fafb; border-bottom: 1px solid #e5e7eb;
  gap: 6px;
}
.ht-row {
  display: grid;
  grid-template-columns: 100px 1fr 1fr 1fr 1fr 1fr 1fr 180px;
  padding: 10px 14px; align-items: center; gap: 6px;
  border-bottom: 1px solid #f3f4f6; cursor: pointer;
  transition: background .12s;
}
.ht-row:hover { background: #f5f3ff; }
.ht-row:last-of-type { border-bottom: none; }
.ht-cell { font-size: 12px; font-weight: 600; color: #9ca3af; }
.ht-cell--date { font-size: 14px; font-weight: 700; color: #374151; }
.ht-cell--num { font-size: 15px; font-weight: 700; color: #1f2937; text-align: center; }
.ht-cell--sales { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.history-empty { text-align: center; padding: 30px; color: #9ca3af; font-size: 13px; }

@media (max-width: 860px) {
  .main-grid { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
