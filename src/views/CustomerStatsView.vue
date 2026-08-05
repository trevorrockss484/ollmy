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
        <el-button size="default" @click="salesManageVisible = true"><el-icon :size="14"><Setting /></el-icon> 销售名单</el-button>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" size="default" @click="saveData"><el-icon :size="15"><Check /></el-icon> 保存</el-button>
      <el-button size="default" @click="pasteVisible = true"><el-icon :size="15"><Files /></el-icon> 粘贴识别</el-button>
      <el-button size="default" @click="clearForm" type="danger" plain><el-icon :size="15"><Delete /></el-icon> 清空</el-button>
      <span v-if="saveMsg" class="save-msg" :class="{ ok: saveOk, err: !saveOk }">{{ saveMsg }}</span>
    </div>

    <!-- 双栏布局 -->
    <div class="main-layout" v-if="accountId">
      <div class="left-panel">
        <!-- 本日数据 -->
        <div class="card daily-card">
          <div class="card-hd">⭐ 本日数据 · {{ shortDate(formDate) }}</div>
          <div class="daily-nums">
            <div class="dn-row">
              <span class="dn-idx">1</span>
              <label>本日新客户</label>
              <el-input-number v-model="form.newCustomers" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>

              <span class="dn-idx dn-idx--r">4</span>
              <label>拉群且有平面图</label>
              <el-input-number v-model="form.groupedWithPlan" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>
            </div>
            <div class="dn-row">
              <span class="dn-idx">2</span>
              <label>有回复的客户</label>
              <el-input-number v-model="form.repliedCustomers" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>

              <span class="dn-idx dn-idx--r">5</span>
              <label>来访客户</label>
              <el-input-number v-model="form.visitingCustomers" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>
            </div>
            <div class="dn-row">
              <span class="dn-idx">3</span>
              <label>已登记客户</label>
              <el-input-number v-model="form.registeredCustomers" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>

              <span class="dn-idx dn-idx--r">6</span>
              <label>成交客户</label>
              <el-input-number v-model="form.closedDeals" :min="0" :controls="false" placeholder="0" class="fg-input" />
              <span class="fg-unit">个</span>
            </div>
          </div>

          <!-- 分配销售：树状选择 -->
          <div class="fg-sales-section">
            <label class="fg-sales-label">7. 拉群客户分配销售</label>
            <div class="fg-sales-layout">
              <div class="fg-sales-tree">
                <el-tree
                  ref="salesTreeRef"
                  :data="salesTreeData"
                  show-checkbox
                  node-key="key"
                  :props="{ label: 'label', children: 'children' }"
                  :default-expanded-keys="salesGroupKeys"
                  default-expand-all
                  @check="onSalesTreeCheck"
                  style="max-height:260px;overflow-y:auto;"
                />
              </div>
              <div class="fg-sales-result">
                <div class="fg-sales-list" v-if="selectedSales.length">
                  <div v-for="sa in selectedSales" :key="sa.name" class="fg-sales-row">
                    <el-tag size="default" effect="dark" type="primary" closable @close="removeSalesRow(sa.name)">{{ sa.name }}</el-tag>
                    <el-input-number v-model="sa.count" :min="1" :controls="false" size="small" class="fg-sales-count" />
                    <span class="fg-unit">个</span>
                  </div>
                </div>
                <div v-else class="fg-sales-none">勾选左侧销售</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 历史记录 -->
        <div class="card history-card">
          <div class="card-hd">📋 历史记录 <span class="card-hint">点击行可编辑</span></div>
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
              <span class="ht-cell ht-cell--date">{{ shortDate(r.date) }} <span style="font-size:10px;color:#9ca3af;font-weight:400;">{{ dayName(r.date) }}</span></span>
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

      <!-- 右栏 -->
      <div class="right-panel">
        <!-- 月度汇总 -->
        <div class="card monthly-card">
          <div class="card-hd">⭐ 月度汇总 · {{ formDate.substring(0, 7) }} <span class="monthly-days">({{ monthly.records }}天)</span></div>
          <div class="monthly-grid">
            <div class="mg-cell"><span class="mg-num">{{ monthly.newCustomers }}</span><span class="mg-label">总询盘</span></div>
            <div class="mg-cell"><span class="mg-num">{{ monthly.repliedCustomers }}</span><span class="mg-label">有回复</span></div>
            <div class="mg-cell"><span class="mg-num">{{ monthly.registeredCustomers }}</span><span class="mg-label">已登记</span></div>
            <div class="mg-cell"><span class="mg-num">{{ monthly.groupedWithPlan }}</span><span class="mg-label">拉群+图</span></div>
            <div class="mg-cell"><span class="mg-num">{{ monthly.visitingCustomers }}</span><span class="mg-label">来访</span></div>
            <div class="mg-cell"><span class="mg-num">{{ monthly.closedDeals }}</span><span class="mg-label">成交</span></div>
          </div>
          <div class="monthly-sales" v-if="monthly.salesAssignments.length">
            <span class="monthly-sales-label">分配：</span>
            <el-tag v-for="sa in monthly.salesAssignments" :key="sa.name" size="small" effect="plain" type="info">{{ sa.name }}{{ sa.count }}个</el-tag>
          </div>
        </div>

        <!-- 数据预览 -->
        <div class="card preview-card" v-if="previewText">
          <div class="preview-hd"><span>📋 数据预览</span><el-button size="small" type="primary" @click="copyPreview">复制</el-button></div>
          <div class="preview-content">{{ previewText }}</div>
        </div>
        <div v-else class="preview-empty">填写数据后将在此展示预览</div>
      </div>
    </div>

    <!-- 销售名单管理弹窗 -->
    <el-dialog v-model="salesManageVisible" title="管理销售名单" width="520px" destroy-on-close>
      <div class="sm-list">
        <div v-for="sp in salesPersons" :key="sp.id" class="sm-row">
          <span class="sm-name">{{ sp.name }}</span>
          <el-tag v-if="sp.group" size="small" type="info" effect="plain" style="margin:0 4px;">{{ sp.group }}</el-tag>
          <el-button size="small" text type="danger" @click="deleteSalesPerson(sp)"><el-icon :size="14"><Close /></el-icon></el-button>
        </div>
        <div v-if="!salesPersons.length" class="sm-empty">暂未添加销售</div>
        <div class="sm-paste-area">
          <div class="sm-paste-label">批量添加（用逗号、空格、或换行分隔）</div>
          <el-input v-model="bulkSalesInput" type="textarea" :rows="2" placeholder="如：袁绮媚, 陈婉镅, 丁敏" @keyup.ctrl.enter="addBulkSales" />
          <el-button size="small" type="primary" @click="addBulkSales" :disabled="!bulkSalesInput.trim()" style="margin-top:6px;">批量添加</el-button>
        </div>
        <div class="sm-add-row">
          <el-input v-model="newSalesName" placeholder="销售名字" size="default" style="flex:2;" @keyup.enter="addSalesPerson" />
          <el-input v-model="newSalesGroup" placeholder="分组名（可选）" size="default" style="flex:1;" @keyup.enter="addSalesPerson" />
          <el-button type="primary" size="default" @click="addSalesPerson">添加</el-button>
        </div>
      </div>
      <template #footer><el-button @click="salesManageVisible = false">关闭</el-button></template>
    </el-dialog>

    <!-- 粘贴识别弹窗 -->
    <el-dialog v-model="pasteVisible" title="粘贴识别" width="620px" destroy-on-close>
      <el-alert style="margin-bottom:12px;" title="粘贴日报格式的客户统计数据，自动识别所有字段" type="info" :closable="false" show-icon />
      <el-input v-model="pasteInput" type="textarea" :rows="14" placeholder="在此粘贴..." />
      <div v-if="parseResults.length" class="parse-result">
        <div class="parse-title"> 识别结果：</div>
        <div v-for="p in parseResults" :key="p" class="parse-line">{{ p }}</div>
      </div>
      <template #footer>
        <el-button @click="pasteVisible = false">取消</el-button>
        <el-button type="primary" @click="doParsePaste">识别并填入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
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
const newSalesGroup = ref('')
const bulkSalesInput = ref('')

const pasteVisible = ref(false)
const pasteInput = ref('')
const parseResults = ref([])
const salesTreeRef = ref(null)

const defaultForm = () => ({
  newCustomers: null, repliedCustomers: null, registeredCustomers: null,
  groupedWithPlan: null, visitingCustomers: null, closedDeals: null,
})
const form = reactive(defaultForm())
// 销售选择：{ name: count }
const salesMap = reactive({})

const monthly = reactive({
  newCustomers: 0, repliedCustomers: 0, registeredCustomers: 0,
  groupedWithPlan: 0, visitingCustomers: 0, closedDeals: 0,
  salesAssignments: [], records: 0,
})

const history = ref([])

// 树数据：按 group 分组
const salesTreeData = computed(() => {
  const groups = {}
  for (const sp of salesPersons.value) {
    const g = sp.group || '默认组'
    if (!groups[g]) groups[g] = []
    groups[g].push({ key: sp.name, label: sp.name })
  }
  return Object.entries(groups).map(([gname, children]) => ({
    key: 'grp-' + gname,
    label: gname,
    children,
  }))
})

const salesGroupKeys = computed(() => salesTreeData.value.map(g => g.key))
const allSalesKeys = computed(() => salesPersons.value.map(sp => sp.name))

function onSalesTreeCheck(_n, checked) {
  const leafs = checked.checkedKeys.filter(k => allSalesKeys.value.includes(k))
  // 新增的叶子
  for (const k of leafs) {
    if (!(k in salesMap)) salesMap[k] = 1
  }
  // 取消的叶子
  for (const k of Object.keys(salesMap)) {
    if (!leafs.includes(k)) delete salesMap[k]
  }
}

const selectedSales = computed(() => {
  return Object.entries(salesMap)
    .filter(([_, v]) => v > 0)
    .map(([name, count]) => ({ name, count }))
})

function shortDate(str) {
  if (!str) return ''
  const p = str.split('-')
  return parseInt(p[1]) + '/' + parseInt(p[2])
}

function dayName(str) {
  if (!str) return ''
  const d = new Date(str + 'T00:00:00')
  return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]
}

function formatSalesText(arr) {
  if (!Array.isArray(arr) || !arr.length) return ''
  return arr.filter(s => s.name).map(s => s.name + s.count + '个').join(' ')
}

function removeSalesRow(name) {
  delete salesMap[name]
  // 同步回树的选中状态
  if (salesTreeRef.value) {
    const keys = Object.keys(salesMap)
    salesTreeRef.value.setCheckedKeys(keys)
  }
}

// 从保存数据恢复 salesMap + 树选中
function restoreSalesMap(arr) {
  for (const k of Object.keys(salesMap)) delete salesMap[k]
  if (Array.isArray(arr)) {
    for (const s of arr) {
      if (s.name) salesMap[s.name] = s.count || 1
    }
  }
  nextTick(() => {
    if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys(Object.keys(salesMap))
  })
}

async function loadSalesPersons() {
  const res = await api.salesPersons.list()
  if (res.success) salesPersons.value = res.data
}

async function addSalesPerson() {
  const name = newSalesName.value.trim()
  if (!name) { ElMessage.warning('请输入名字'); return }
  const group = newSalesGroup.value.trim()
  const res = await api.salesPersons.add(name, group)
  if (res.success) { newSalesName.value = ''; newSalesGroup.value = ''; loadSalesPersons() }
  else ElMessage.error(res.error || '添加失败')
}

function addBulkSales() {
  const raw = bulkSalesInput.value.trim()
  if (!raw) return
  // 用逗号、中文逗号、顿号、空格、换行拆分
  const names = raw.split(/[,，、\s\n\r]+/).map(s => s.trim()).filter(Boolean)
  if (!names.length) return
  Promise.all(names.map(n => api.salesPersons.add(n)))
    .then(() => {
      bulkSalesInput.value = ''
      loadSalesPersons()
      ElMessage.success(`已添加 ${names.length} 个销售`)
    })
    .catch(() => ElMessage.error('部分添加失败'))
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
    restoreSalesMap(r.salesAssignments)
  } else {
    existingId.value = null
    Object.assign(form, defaultForm())
    for (const k of Object.keys(salesMap)) delete salesMap[k]
  }
  const month = d.substring(0, 7)
  const mRes = await api.customerStats.monthly(month, accountId.value)
  if (mRes.success) Object.assign(monthly, mRes.data)
  const hRes = await api.customerStats.list({ accountId: accountId.value })
  if (hRes.success) history.value = hRes.data.sort((a, b) => b.date.localeCompare(a.date))
}

let skipAutoLoad = false
function onDateChange() { if (skipAutoLoad) return; saveMsg.value = ''; loadData() }
function onAccountChange() { localStorage.setItem('cs_accountId', accountId.value); loadData() }

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
      salesAssignments: selectedSales.value.filter(s => s.name),
    }
    const res = await api.customerStats.save(payload)
    if (res.success) { existingId.value = res.data.id; saveMsg.value = ' 已保存'; saveOk.value = true; loadData() }
    else { saveMsg.value = '❌ ' + (res.error || '未知错误'); saveOk.value = false }
  } catch (e) { saveMsg.value = '❌ ' + e.message; saveOk.value = false }
}

async function refreshMonthly() {
  const d = formDate.value
  if (!d) return
  const month = d.substring(0, 7)
  const mRes = await api.customerStats.monthly(month, accountId.value)
  if (mRes.success) Object.assign(monthly, mRes.data)
}

function clearForm() {
  Object.assign(form, defaultForm())
  for (const k of Object.keys(salesMap)) delete salesMap[k]
  existingId.value = null; saveMsg.value = ''
  nextTick(() => {
    if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys([])
  })
  ElMessage.success('表单已清空')
}

function editRecord(r) {
  skipAutoLoad = true
  if (r.accountId && r.accountId !== accountId.value) {
    accountId.value = r.accountId
    localStorage.setItem('cs_accountId', accountId.value)
  }
  formDate.value = r.date
  skipAutoLoad = false
  loadData()
}

// ====== 预览 ======
const previewText = computed(() => {
  const d = formDate.value
  if (!d) return ''
  const parts = d.split('-')
  const title = parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日总结'
  const salesText = selectedSales.value.map(s => s.name + s.count + '个').join(' ')
  let text = `${title}：\n⭐本日数据：\n1.本日新客户：${form.newCustomers || 0}个\n2.本日有回复的客户：${form.repliedCustomers || 0}个\n3.本日已登记客户：${form.registeredCustomers || 0}个\n4.本日已拉群且有平面图客户：${form.groupedWithPlan || 0}个\n5.本日来访客户：${form.visitingCustomers || 0}\n6.本日成交客户：${form.closedDeals || 0}\n7.拉群客户分配销售：${salesText || '无'}`
  text += `\n\n⭐月度数据：\n1.本月总询盘客户：${monthly.newCustomers}个\n2.本月有回复的客户：${monthly.repliedCustomers}个\n3.本月已登记客户：${monthly.registeredCustomers}个\n4.本月已拉群且有平面图客户：${monthly.groupedWithPlan}个\n5.本月来访客户：${monthly.visitingCustomers}\n6.本月成交客户：${monthly.closedDeals}\n7.拉群客户分配销售：${monthly.salesAssignments.length ? monthly.salesAssignments.map(s => s.name + s.count + '个').join(' ') : '无'}`
  return text
})

async function copyPreview() {
  if (!previewText.value) { ElMessage.warning('请先填写数据'); return }
  try { await navigator.clipboard.writeText(previewText.value); ElMessage.success('已复制') }
  catch {
    const ta = document.createElement('textarea'); ta.value = previewText.value
    ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta)
    ta.select(); try { document.execCommand('copy'); ElMessage.success('已复制') } catch { ElMessage.error('复制失败') }; document.body.removeChild(ta)
  }
}

// ====== 粘贴识别 ======
function doParsePaste() {
  parseResults.value = []
  const raw = pasteInput.value.trim()
  if (!raw) { ElMessage.warning('请先粘贴内容'); return }

  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/：/g, ':').replace(/ /g, ' ')

  // 日期
  const dm = text.match(/(\d+)月(\d+)日/)
  if (dm) {
    const y = formDate.value.split('-')[0]
    formDate.value = y + '-' + dm[1].padStart(2, '0') + '-' + dm[2].padStart(2, '0')
    parseResults.value.push('日期: ' + dm[1] + '月' + dm[2] + '日')
  }

  // 本日数据 1-6
  const n0 = n => (n || 0)
  const daySection = text.split(/⭐月度数据|月度数据/)[0] || text

  const m1 = daySection.match(/本日新客户[:\s]*(\d+)/); if (m1) { form.newCustomers = n0(parseInt(m1[1])); parseResults.value.push('新客户: ' + m1[1]) }
  const m2 = daySection.match(/有回复的客户[:\s]*(\d+)/); if (m2) { form.repliedCustomers = n0(parseInt(m2[1])); parseResults.value.push('有回复: ' + m2[1]) }
  const m3 = daySection.match(/已登记客户[:\s]*(\d+)/); if (m3) { form.registeredCustomers = n0(parseInt(m3[1])); parseResults.value.push('已登记: ' + m3[1]) }
  const m4 = daySection.match(/已拉群且有平面图[客户:\s]*(\d+)/); if (m4) { form.groupedWithPlan = n0(parseInt(m4[1])); parseResults.value.push('拉群+平面图: ' + m4[1]) }
  const m5 = daySection.match(/来访客户[:\s]*(\d+)/); if (m5) { form.visitingCustomers = n0(parseInt(m5[1])); parseResults.value.push('来访: ' + m5[1]) }
  const m6 = daySection.match(/成交客户[:\s]*(\d+)/); if (m6) { form.closedDeals = n0(parseInt(m6[1])); parseResults.value.push('成交: ' + m6[1]) }

  // 分配销售
  const saLine = daySection.match(/拉群客户分配销售[:\s]*([^\n]*)/)
  if (saLine && saLine[1]) {
    const saText = saLine[1].trim()
    if (saText && saText !== '无') {
      for (const k of Object.keys(salesMap)) delete salesMap[k]
      // 匹配 "袁绮媚1个" "陈婉镅2个" 等
      const saRe = /([^\s,，、\d]+?)(\d+)个/g
      let sm
      while ((sm = saRe.exec(saText)) !== null) {
        salesMap[sm[1]] = parseInt(sm[2])
        parseResults.value.push('销售: ' + sm[1] + sm[2] + '个')
      }
    }
  }

  pasteVisible.value = false
  parseResults.value.length ? ElMessage.success('识别 ' + parseResults.value.length + ' 个字段') : ElMessage.warning('未识别到数据')
  // 同步树选中
  nextTick(() => {
    if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys(Object.keys(salesMap))
  })
  refreshMonthly() // 只刷新月度汇总，不覆盖已解析的表单数据
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
.action-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 20px; margin-bottom: 16px; }
.save-msg { font-size: 12px; font-weight: 600; margin-left: 8px; }
.save-msg.ok { color: #059669; }
.save-msg.err { color: #ef4444; }

/* ====== 双栏 ====== */
.main-layout { display: flex; gap: 18px; align-items: flex-start; }
.left-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.right-panel { width: 380px; flex-shrink: 0; position: sticky; top: 16px; display: flex; flex-direction: column; gap: 14px; }

/* ====== 卡片 ====== */
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,.03); }
.card-hd { font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 16px; }

/* ====== 表单 ====== */
.fg-input { width: 100px; flex-shrink: 0; }
.fg-input :deep(.el-input__wrapper) { background: #fff; border-radius: 8px; box-shadow: 0 0 0 1px #e5e7eb; padding: 2px 10px; transition: box-shadow .15s; }
.fg-input :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1.5px #c7d2fe; }
.fg-input :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px #6366f1 !important; }
.fg-input :deep(.el-input__inner) { font-size: 15px; font-weight: 700; color: #1f2937; height: 36px; }
.fg-unit { font-size: 12px; color: #9ca3af; font-weight: 600; }

/* 本日数据横向排列 */
.daily-nums { display: flex; flex-direction: column; gap: 8px; }
.dn-row {
  display: grid; grid-template-columns: 22px 1fr 110px auto 22px 1fr 110px auto;
  align-items: center; gap: 8px;
  padding: 10px 16px; background: #f9fafb; border-radius: 10px;
  transition: background .12s;
}
.dn-row:hover { background: #f3f4f6; }
.dn-row label { font-size: 14px; font-weight: 600; color: #374151; white-space: nowrap; }
.dn-idx {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 6px;
  background: #eef2ff; color: #6366f1; font-size: 12px; font-weight: 700;
  flex-shrink: 0;
}

/* 分配销售芯片 */
.fg-sales-section { border-top: 1px solid #f3f4f6; padding-top: 14px; }
.fg-sales-label { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 10px; }
/* 树布局 */
.fg-sales-layout { display: flex; gap: 16px; }
.fg-sales-tree { flex: 1; min-width: 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 4px; background: #fafafa; }
.fg-sales-result { flex: 1; min-width: 0; }

.fg-sales-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.fg-sales-row { display: flex; align-items: center; gap: 5px; }
.fg-sales-count { width: 70px; }
.fg-sales-count :deep(.el-input__wrapper) { background: #fff; border-radius: 6px; box-shadow: 0 0 0 1px #e5e7eb; padding: 1px 8px; }
.fg-sales-count :deep(.el-input__inner) { font-size: 13px; font-weight: 700; height: 28px; }
.fg-sales-none { font-size: 12px; color: #d1d5db; }

/* ====== 月度紧凑网格 ====== */
.monthly-days { font-size: 11px; color: #9ca3af; font-weight: 400; }
.monthly-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.mg-cell {
  background: #f9fafb; border-radius: 10px; padding: 10px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.mg-num { font-size: 22px; font-weight: 800; color: #1f2937; line-height: 1.1; }
.mg-label { font-size: 11px; font-weight: 600; color: #9ca3af; }
.monthly-sales { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 4px; }
.monthly-sales-label { font-size: 11px; color: #9ca3af; font-weight: 600; }

/* ====== 预览 ====== */
.preview-card { border-color: #c7d2fe; }
.preview-empty { text-align: center; padding: 36px 16px; color: #9ca3af; font-size: 13px; background: #fff; border: 1px dashed #e5e7eb; border-radius: 14px; }
.card-hint { font-size: 11px; color: #9ca3af; font-weight: 400; margin-left: 6px; }
.preview-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 700; font-size: 14px; }
.preview-content { white-space: pre-wrap; font-size: 13px; line-height: 1.8; color: #374151; max-height: 50vh; overflow-y: auto; }

/* ====== 历史 ====== */
.history-table-wrap { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.ht-head { display: grid; grid-template-columns: 90px 1fr 1fr 1fr 1fr 1fr 1fr 170px; padding: 8px 14px; align-items: center; background: #f9fafb; border-bottom: 1px solid #e5e7eb; gap: 6px; }
.ht-row { display: grid; grid-template-columns: 90px 1fr 1fr 1fr 1fr 1fr 1fr 170px; padding: 12px 14px; align-items: center; gap: 6px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: all .12s; position: relative; }
.ht-row:nth-child(even) { background: #fafafa; }
.ht-row:hover { background: #f5f3ff; box-shadow: inset 3px 0 0 #6366f1; }
.ht-row::after { content: '✎'; position: absolute; right: 6px; top: 50%; transform: translateY(-50%); font-size: 11px; color: #d1d5db; opacity: 0; transition: opacity .12s; }
.ht-row:hover::after { opacity: 1; color: #6366f1; }
.ht-row:last-of-type { border-bottom: none; }
.ht-cell { font-size: 12px; font-weight: 600; color: #9ca3af; }
.ht-cell--date { font-size: 14px; font-weight: 700; color: #374151; }
.ht-cell--num { font-size: 16px; font-weight: 700; color: #1f2937; text-align: center; }
.ht-cell--sales { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.history-empty { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }

/* ====== 销售管理弹窗 ====== */
.sm-list { display: flex; flex-direction: column; gap: 6px; }
.sm-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f9fafb; border-radius: 8px; }
.sm-name { font-size: 14px; font-weight: 600; color: #1f2937; }
.sm-empty { text-align: center; padding: 16px; color: #9ca3af; font-size: 13px; }
.sm-paste-area { margin-top: 12px; padding: 12px; background: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0; }
.sm-paste-label { font-size: 11px; font-weight: 600; color: #166534; margin-bottom: 6px; }
.sm-add-row { display: flex; gap: 8px; margin-top: 12px; }

/* ====== 粘贴识别 ====== */
.parse-result { margin-top: 12px; background: #f0fdf4; border-radius: 8px; padding: 12px; }
.parse-title { font-weight: 600; color: #059669; margin-bottom: 4px; }
.parse-line { font-size: 12px; color: #374151; }

@media (max-width: 860px) {
  .main-layout { flex-direction: column; }
  .right-panel { width: 100%; position: static; }
  .dn-row { flex-wrap: wrap; }

}
</style>
