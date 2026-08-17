<template>
  <div class="cs-page enterprise-page enterprise-page--wide">
    <div class="cs-topbar">
      <div class="cs-top-left">
        <h2><span class="cs-icon-wrap"><el-icon :size="20"><DataAnalysis /></el-icon></span> 客户统计</h2>
        <el-date-picker v-model="formDate" type="date" value-format="YYYY-MM-DD" size="default" @change="onDateChange" class="cs-date-pick" :shortcuts="dateShortcuts" popper-class="cs-date-popper" />
        <el-select v-model="accountId" size="default" placeholder="选择广告账号" @change="onAccountChange" class="cs-account-sel">
          <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
          <el-option label="全部账号" value="all" />
        </el-select>
        <span v-if="isAll" class="cs-badge cs-badge--ok">全部账号汇总</span>
        <span v-else-if="existingId" class="cs-badge cs-badge--ok">已有记录</span>
        <span v-else class="cs-badge cs-badge--new">新日期</span>
      </div>
      <div class="cs-top-right">
        <el-button v-if="authStore.canEdit(PAGE) && !isAll" @click="salesManageVisible = true" class="cs-ghost-btn"><el-icon :size="14"><User /></el-icon> 销售名单</el-button>
      </div>
    </div>

    <div class="cs-toolbar">
      <el-button v-if="authStore.canEdit(PAGE) && !isAll" type="primary" @click="saveData"><el-icon :size="15"><Check /></el-icon> 保存</el-button>
      <el-button v-if="authStore.canEdit(PAGE) && !isAll" @click="pasteVisible = true"><el-icon :size="15"><Files /></el-icon> 粘贴识别</el-button>
      <el-button @click="copyPreview"><el-icon :size="15"><DocumentCopy /></el-icon> 一键复制</el-button>
      <el-button v-if="authStore.canEdit(PAGE) && !isAll" @click="clearForm" class="cs-clear-btn"><el-icon :size="15"><Delete /></el-icon> 清空</el-button>
      <transition name="cs-fade">
        <span v-if="saveMsg" class="cs-save-msg" :class="{ ok: saveOk, fail: !saveOk }">{{ saveMsg }}</span>
      </transition>
    </div>

    <div class="cs-main" v-if="accountId">
      <div class="cs-left">
        <!-- 本日数据 -->
        <section class="cs-card cs-card--daily">
          <header class="cs-card-hd">
            <span class="cs-hd-dot"></span> 本日数据
            <span class="cs-hd-date">{{ dailyLabel }}</span>
          </header>
          <div class="cs-daily-grid">
            <label class="cs-ditem"><span class="cs-dnum" style="--c:#6366f1">1</span><span class="cs-dlabel">新客户</span><span class="cs-dinput-wrap"><input type="number" :value="form.newCustomers" min="0" placeholder="自动" class="cs-dinput-raw cs-dinput-raw--auto" disabled title="由「国家客资」自动计算" /></span></label>
            <label class="cs-ditem"><span class="cs-dnum" style="--c:#8b5cf6">2</span><span class="cs-dlabel">有回复</span><span class="cs-dinput-wrap"><input type="number" v-model.number="form.repliedCustomers" min="0" placeholder="0" class="cs-dinput-raw" :disabled="!authStore.canEdit(PAGE) || isAll" /></span></label>
            <label class="cs-ditem"><span class="cs-dnum" style="--c:#06b6d4">3</span><span class="cs-dlabel">已登记</span><span class="cs-dinput-wrap"><input type="number" v-model.number="form.registeredCustomers" min="0" placeholder="0" class="cs-dinput-raw" :disabled="!authStore.canEdit(PAGE) || isAll" /></span></label>
            <label class="cs-ditem"><span class="cs-dnum" style="--c:#10b981">4</span><span class="cs-dlabel">拉群+图</span><span class="cs-dinput-wrap"><input type="number" v-model.number="form.groupedWithPlan" min="0" placeholder="0" class="cs-dinput-raw" :disabled="!authStore.canEdit(PAGE) || isAll" /></span></label>
            <label class="cs-ditem"><span class="cs-dnum" style="--c:#f59e0b">5</span><span class="cs-dlabel">来访</span><span class="cs-dinput-wrap"><input type="number" v-model.number="form.visitingCustomers" min="0" placeholder="0" class="cs-dinput-raw" :disabled="!authStore.canEdit(PAGE) || isAll" /></span></label>
            <label class="cs-ditem"><span class="cs-dnum" style="--c:#ef4444">6</span><span class="cs-dlabel">成交</span><span class="cs-dinput-wrap"><input type="number" v-model.number="form.closedDeals" min="0" placeholder="0" class="cs-dinput-raw" :disabled="!authStore.canEdit(PAGE) || isAll" /></span></label>
          </div>

          <div class="cs-bottom-row">
            <div class="cs-sales cs-sales--half">
              <div class="cs-sales-hd"><span class="cs-dnum" style="--c:#a78bfa">7</span><span class="cs-dlabel">国家客资</span><span class="cs-sales-cnt" v-if="selectedCountries.length">{{ totalCountryCount }}个</span></div>
              <div class="cs-sales-body">
                <div class="cs-sales-tree">
                  <el-input v-model="countryFilterText" placeholder="搜索国家或电话号，如 36" size="small" clearable class="cs-country-search" />
                  <el-tree ref="countryTreeRef" :data="countryTreeData" show-checkbox node-key="key" :props="{ label: 'label', children: 'children', disabled: () => !authStore.canEdit(PAGE) || isAll }" @check="onCountryTreeCheck" :default-expanded-keys="[]" :filter-node-method="countryFilterNode" />
                </div>
                <div class="cs-sales-chips" v-if="selectedCountries.length">
                  <div v-for="ct in selectedCountries" :key="ct.country" class="cs-chip-row">
                    <el-tag size="small" effect="dark" type="success" :closable="authStore.canEdit(PAGE) && !isAll" @close="removeCountryRow(ct.country)">{{ ct.country }}</el-tag>
                    <span class="cs-stepper">
                      <button :disabled="!authStore.canEdit(PAGE) || isAll" class="cs-step-btn" @click="countryMap[ct.country] = Math.max(1, (countryMap[ct.country]||1) - 1); syncCountryTotal()">−</button>
                      <span class="cs-step-val">{{ countryMap[ct.country] || 0 }}</span>
                      <button :disabled="!authStore.canEdit(PAGE) || isAll" class="cs-step-btn cs-step-btn--plus" @click="countryMap[ct.country] = (countryMap[ct.country]||0) + 1; syncCountryTotal()">+</button>
                    </span>
                  </div>
                </div>
                <div v-else class="cs-sales-none">勾选国家后此处可调数量</div>
              </div>
            </div>

            <div class="cs-sales cs-sales--half">
              <div class="cs-sales-hd"><span class="cs-dnum" style="--c:#f472b6">8</span><span class="cs-dlabel">分配销售</span><span class="cs-sales-cnt" v-if="totalCustomerCount">{{ totalCustomerCount }}个客户</span>
                <el-input v-model="groupCompany" placeholder="公司名" size="small" class="cs-gt-company" @change="persistGroupCompany" :disabled="!authStore.canEdit(PAGE) || isAll" />
              </div>
              <div v-if="!registeredCountries.length" class="cs-sales-lock"><el-icon :size="14"><Warning /></el-icon> 请先在上方「国家客资」勾选国家，才能分配销售</div>
              <div class="cs-sales-body cs-sales-body--detail" v-else>
                <div class="cs-sales-tree">
                  <el-input v-model="salesFilterText" placeholder="搜索销售" size="small" clearable class="cs-sales-search" />
                  <el-tree ref="salesTreeRef" :data="salesTreeData" show-checkbox node-key="key" :props="{ label: 'label', children: 'children', disabled: () => !authStore.canEdit(PAGE) || isAll }" default-expand-all @check="onSalesTreeCheck" :filter-node-method="salesFilterNode" />
                </div>
                <div class="cs-sales-detail" v-if="selectedSales.length">
                  <div v-for="sa in selectedSales" :key="sa.name" class="cs-sales-group">
                    <div class="cs-sales-group-hd">
                      <el-tag size="small" effect="dark" :closable="authStore.canEdit(PAGE) && !isAll" @close="removeSalesRow(sa.name)">{{ sa.name }}</el-tag>
                      <span class="cs-sales-group-cnt">{{ sa.customers.length }}个客户</span>
                    </div>
                    <div v-for="c in sa.customers" :key="c.id" class="cs-cust-row">
                      <div class="cs-cust-row-top">
                        <el-select v-model="c.country" placeholder="国家" size="small" class="cs-cust-country" clearable :disabled="!authStore.canEdit(PAGE) || isAll" @change="onCustomerCountryChange(sa, c)">
                          <el-option v-for="ct in registeredCountries" :key="ct" :label="ct + '（剩' + countryRemaining(ct) + '）'" :value="ct" />
                        </el-select>
                        <el-button v-if="authStore.canEdit(PAGE) && !isAll" size="small" text type="danger" class="cs-cust-del" @click="removeCustomer(sa.name, c.id)"><el-icon :size="14"><Close /></el-icon></el-button>
                      </div>
                      <el-input v-model="c.name" placeholder="客户名，如 Yug Patel" size="small" class="cs-cust-text" :disabled="!authStore.canEdit(PAGE) || isAll" />
                      <el-input v-model="c.detail" placeholder="客户详情，可填可不填" size="small" class="cs-cust-text" :disabled="!authStore.canEdit(PAGE) || isAll" />
                      <div v-if="c.name && c.country" class="cs-cust-groupname">
                        <el-icon :size="12"><Link /></el-icon>
                        <span class="cs-cust-groupname-text">{{ buildGroupName(c.name, c.country) }}</span>
                        <el-button size="small" text type="primary" class="cs-cust-copy" @click="copyGroupName(buildGroupName(c.name, c.country))">复制</el-button>
                      </div>
                    </div>
                    <el-button v-if="authStore.canEdit(PAGE) && !isAll" size="small" text type="primary" class="cs-cust-add" @click="addCustomer(sa.name)"><el-icon :size="13"><Plus /></el-icon> 添加客户</el-button>
                  </div>
                </div>
                <div v-else class="cs-sales-none">勾选销售后添加客户</div>
              </div>
            </div>
          </div>
        </section>

        <!-- 各账号月度汇总（全部账号模式） -->
        <section class="cs-card cs-card--peracc" v-if="isAll && monthly.perAccount && monthly.perAccount.length">
          <header class="cs-card-hd"><span class="cs-hd-dot cs-hd-dot--sec"></span> 各账号月度 <span class="cs-hd-sub">{{ monthLabel }} · 共{{ monthly.perAccount.length }}个账号</span></header>
          <div class="cs-pa-grid">
            <div v-for="pa in monthly.perAccount" :key="pa.accountId" class="cs-pa-card">
              <div class="cs-pa-name">{{ pa.accountName || pa.accountId }}</div>
              <div class="cs-pa-cells">
                <div class="cs-pa-cell"><b>{{ pa.newCustomers }}</b><span>总询盘</span></div>
                <div class="cs-pa-cell"><b>{{ pa.repliedCustomers }}</b><span>有回复</span></div>
                <div class="cs-pa-cell"><b>{{ pa.registeredCustomers }}</b><span>已登记</span></div>
                <div class="cs-pa-cell"><b>{{ pa.groupedWithPlan }}</b><span>拉群+图</span></div>
                <div class="cs-pa-cell"><b>{{ pa.visitingCustomers }}</b><span>来访</span></div>
                <div class="cs-pa-cell"><b>{{ pa.closedDeals }}</b><span>成交</span></div>
              </div>
            </div>
          </div>
        </section>

        <!-- 历史记录 -->
        <section class="cs-card cs-card--history">
          <header class="cs-card-hd"><span class="cs-hd-dot cs-hd-dot--sec"></span> 历史记录 <span class="cs-hd-hint">{{ isAll ? '全部账号每日合并 · 只读' : '点击可编辑' }}</span></header>
          <div class="cs-ht" v-if="history.length">
            <div class="cs-ht-row cs-ht-row--head"><span>日期</span><span>新客户</span><span>回复</span><span>登记</span><span>拉群+图</span><span>来访</span><span>成交</span><span class="cs-ht-s">分配销售</span></div>
            <div v-for="r in history" :key="r.id" class="cs-ht-row" @click="!isAll && authStore.canEdit(PAGE) && editRecord(r)" :style="isAll || !authStore.canEdit(PAGE) ? {cursor:'default',opacity:.8} : {}">
              <span class="cs-ht-date">{{ shortDate(r.date) }}<i>{{ dayName(r.date) }}</i></span>
              <span class="cs-ht-v">{{ r.newCustomers || 0 }}</span>
              <span class="cs-ht-v">{{ r.repliedCustomers || 0 }}</span>
              <span class="cs-ht-v">{{ r.registeredCustomers || 0 }}</span>
              <span class="cs-ht-v">{{ r.groupedWithPlan || 0 }}</span>
              <span class="cs-ht-v">{{ r.visitingCustomers || 0 }}</span>
              <span class="cs-ht-v">{{ r.closedDeals || 0 }}</span>
              <span class="cs-ht-s">{{ formatSalesText(r.salesAssignments) || '—' }}</span>
            </div>
          </div>
          <div v-else class="cs-empty"><el-icon :size="36"><Document /></el-icon><span>暂无记录</span></div>
        </section>
      </div>

      <!-- 右栏：预览 -->
      <div class="cs-right">
        <section class="cs-card cs-card--preview" v-if="previewText">
          <header class="cs-card-hd cs-card-hd--tight"><span>预览</span><el-button size="small" type="primary" link @click="copyPreview">复制</el-button></header>
          <pre class="cs-preview-text">{{ previewText }}</pre>
        </section>
        <div v-else class="cs-preview-empty"><el-icon :size="24"><Document /></el-icon><span>填写数据后自动生成预览</span></div>
      </div>
    </div>

    <!-- 销售名单 -->
    <el-dialog v-model="salesManageVisible" title="销售名单" width="480px" destroy-on-close class="cs-dialog">
      <div class="cs-dlg-list">
        <div v-for="sp in salesPersons" :key="sp.id" class="cs-dlg-row"><span class="cs-dlg-name">{{ sp.name }}</span><el-tag v-if="sp.group" size="small" effect="plain" type="info">{{ sp.group }}</el-tag><span class="cs-dlg-gap"></span><el-button size="small" text type="danger" @click="deleteSalesPerson(sp)"><el-icon :size="14"><Close /></el-icon></el-button></div>
        <div v-if="!salesPersons.length" class="cs-empty"><el-icon :size="36"><User /></el-icon><span>暂未添加销售</span></div>
      </div>
      <div class="cs-dlg-paste"><div class="cs-dlg-paste-label">批量添加（逗号/空格/换行分隔）</div><el-input v-model="bulkSalesInput" type="textarea" :rows="2" placeholder="袁绮媚, 陈婉镅, 丁敏" /><el-button size="small" type="primary" @click="addBulkSales" :disabled="!bulkSalesInput.trim()" class="cs-dlg-paste-btn">批量添加</el-button></div>
      <div class="cs-dlg-add"><el-input v-model="newSalesName" placeholder="名字" @keyup.enter="addSalesPerson" class="cs-dlg-add-name" /><el-input v-model="newSalesGroup" placeholder="分组" @keyup.enter="addSalesPerson" class="cs-dlg-add-group" /><el-button type="primary" @click="addSalesPerson">添加</el-button></div>
    </el-dialog>

    <!-- 粘贴识别 -->
    <el-dialog v-model="pasteVisible" title="粘贴识别" width="600px" destroy-on-close class="cs-dialog">
      <el-alert title="粘贴日报格式的客户统计数据" type="info" :closable="false" show-icon style="margin-bottom:14px;" />
      <el-input v-model="pasteInput" type="textarea" :rows="12" placeholder="在此粘贴..." />
      <div v-if="parseResults.length" class="cs-parse-result"><div class="cs-parse-result-title">识别结果</div><div v-for="p in parseResults" :key="p" class="cs-parse-result-line">{{ p }}</div></div>
      <template #footer><el-button @click="pasteVisible = false">取消</el-button><el-button type="primary" @click="doParsePaste">识别并填入</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api, todayStr } from '../api'
import { useAuthStore } from '../stores/auth'
import { countryTreeData, allLeafKeys as allCountryKeys } from '../data/countryTree'
import { ACCOUNTS } from '../data/accounts'

const authStore = useAuthStore()
const PAGE = '/customer-stats'

// 每个页面实例唯一 ID（不持久化），实时更新时忽略自己发起的广播。
// 不用 sessionStorage：复制标签页会继承 sessionStorage 导致互相忽略。
const clientId = 'cs-' + Math.random().toString(36).slice(2) + '-' + Date.now()

const accounts = ref(ACCOUNTS)
const accountId = ref(localStorage.getItem('cs_accountId') || accounts.value[0].id)
const isAll = computed(() => accountId.value === 'all')
const formDate = ref(todayStr())

// 日期快捷筛选：本地时区构造，避免 UTC 偏移
function _d(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}
// 自然月：减 N 个月（上个月的今天；月末自动进位，如 3/31 → 2/28）
function _m(monthsAgo) {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}
const dateShortcuts = [
  { text: '今天', value: () => _d(0) },
  { text: '昨天', value: () => _d(-1) },
  { text: '前天', value: () => _d(-2) },
  { text: '一周前', value: () => _d(-7) },
  { text: '上个月', value: () => _m(1) },
  { text: '上上个月', value: () => _m(2) },
  { text: '三个月前', value: () => _m(3) },
  { text: '半年前', value: () => _m(6) },
  { text: '去年', value: () => _m(12) },
]

// ====== 拉群名 ======
const groupCompany = ref(localStorage.getItem('cs_group_company') || 'Misimu furniture')
function persistGroupCompany() { localStorage.setItem('cs_group_company', groupCompany.value.trim()) }
// 生成完整拉群名：客户名 & 公司名 国家（YYMMDD），日期跟随所选日期
function buildGroupName(customerName, country) {
  const company = groupCompany.value.trim() || '公司名'
  const d = formDate.value || ''
  const p = d.split('-')
  const dateLabel = p.length === 3 ? p[0].slice(2) + p[1] + p[2] : ''
  return `${(customerName || '').trim()} & ${company} ${country || ''}（${dateLabel}）`
}
async function copyGroupName(text) {
  if (!text) return
  try { await navigator.clipboard.writeText(text); ElMessage.success('拉群名已复制') }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ElMessage.success('拉群名已复制') } catch { ElMessage.error('复制失败') }
    document.body.removeChild(ta)
  }
}
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
const countryTreeRef = ref(null)
const countryFilterText = ref('')
const salesFilterText = ref('')

// 国家数据（共享模块：src/data/countryTree.js）


const defaultForm = () => ({
  newCustomers: null, repliedCustomers: null, registeredCustomers: null,
  groupedWithPlan: null, visitingCustomers: null, closedDeals: null,
})
const form = reactive(defaultForm())
// salesMap: { 销售名: [{ id, country, text, status }] } — 分配销售的客户详情列表
const salesMap = reactive({})
const countryMap = reactive({})
let custIdSeq = 0

const monthly = reactive({
  newCustomers: 0, repliedCustomers: 0, registeredCustomers: 0,
  groupedWithPlan: 0, visitingCustomers: 0, closedDeals: 0,
  salesAssignments: [], countryBreakdown: [], records: 0, perAccount: [],
})
const history = ref([])

const dailyLabel = computed(() => { const d = formDate.value; if (!d) return ''; const p = d.split('-'); return parseInt(p[1]) + '月' + parseInt(p[2]) + '日' })
const monthLabel = computed(() => { const d = formDate.value; if (!d) return ''; const p = d.split('-'); return parseInt(p[1]) + '月' })

const salesTreeData = computed(() => {
  const groups = {}
  for (const sp of salesPersons.value) { const g = sp.group || '未分组'; if (!groups[g]) groups[g] = []; groups[g].push({ key: sp.name, label: sp.name }) }
  return Object.entries(groups).map(([gname, children]) => ({ key: 'grp-' + gname, label: gname, children }))
})
const allSalesKeys = computed(() => salesPersons.value.map(sp => sp.name))

function salesFilterNode(value, data) {
  if (!value) return true
  const v = String(value).trim().toLowerCase()
  if (!v) return true
  if (data.children) return false
  return String(data.label || '').toLowerCase().includes(v) || String(data.key || '').toLowerCase().includes(v)
}
function onSalesFilter() { salesTreeRef.value?.filter(salesFilterText.value) }
watch(salesFilterText, () => onSalesFilter())

function onSalesTreeCheck(_n, checked) {
  const leafs = checked.checkedKeys.filter(k => allSalesKeys.value.includes(k))
  for (const k of leafs) { if (!(k in salesMap)) salesMap[k] = [] }
  for (const k of Object.keys(salesMap)) { if (!leafs.includes(k)) delete salesMap[k] }
}

function onCountryTreeCheck(_n, checked) {
  const leafs = checked.checkedKeys.filter(k => allCountryKeys.includes(k))
  for (const k of leafs) { if (!(k in countryMap)) countryMap[k] = 1 }
  for (const k of Object.keys(countryMap)) { if (!leafs.includes(k)) delete countryMap[k] }
  pruneOrphanCustomers()
  syncCountryTotal()
}
// 清除客户详情中「国家」已不在国家客资里的记录（国家被移除后残留的脏数据）
function pruneOrphanCustomers() {
  const valid = new Set(Object.keys(countryMap))
  for (const name of Object.keys(salesMap)) {
    const list = salesMap[name] || []
    const kept = list.filter(c => valid.has(c.country))
    if (kept.length) salesMap[name] = kept
    else delete salesMap[name]
  }
  nextTick(() => { if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys(Object.keys(salesMap)) })
}
function countryFilterNode(value, data) {
  if (!value) return true
  const v = String(value).trim().toLowerCase()
  if (!v) return true
  if (data.children) return false
  return String(data.label || '').toLowerCase().includes(v) || String(data.key || '').toLowerCase().includes(v)
}
function onCountryFilter() { countryTreeRef.value?.filter(countryFilterText.value) }
watch(countryFilterText, () => onCountryFilter())
const selectedSales = computed(() => Object.keys(salesMap).map(name => ({ name, customers: salesMap[name] || [] })))
const selectedCountries = computed(() => Object.entries(countryMap).filter(([_, v]) => v > 0).map(([country, count]) => ({ country, count })))
const totalCountryCount = computed(() => selectedCountries.value.reduce((s, c) => s + (c.count || 0), 0))
// 客户详情里「国家」下拉选项 = 已登记的国家客资
const registeredCountries = computed(() => selectedCountries.value.map(c => c.country))
const totalCustomerCount = computed(() => selectedSales.value.reduce((s, sa) => s + (sa.customers?.length || 0), 0))
// 每个国家已分配的客户数（跨所有销售）
const countryUsage = computed(() => {
  const usage = {}
  for (const name of Object.keys(salesMap)) {
    for (const c of (salesMap[name] || [])) { if (c.country) usage[c.country] = (usage[c.country] || 0) + 1 }
  }
  return usage
})
function countryRemaining(country) {
  const total = countryMap[country] || 0
  const used = countryUsage.value[country] || 0
  return total - used
}
function syncCountryTotal() { nextTick(() => { form.newCustomers = totalCountryCount.value }) }

function shortDate(str) { if (!str) return ''; const p = str.split('-'); return parseInt(p[1]) + '/' + parseInt(p[2]) }
function dayName(str) { if (!str) return ''; const d = new Date(str + 'T00:00:00'); return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()] }
function formatSalesText(arr) { if (!Array.isArray(arr) || !arr.length) return ''; return arr.filter(s => s.name).map(s => s.name + (s.customers ? s.customers.length : (s.count || 0)) + '个').join(' ') }

// 分配销售客户详情操作
function addCustomer(name) {
  if (!salesMap[name]) salesMap[name] = []
  // 默认选第一个仍有余额的国家
  const defCountry = registeredCountries.value.find(c => countryRemaining(c) > 0) || ''
  if (!defCountry) { ElMessage.warning('各国家客资已分配完，无法新增客户'); return }
  salesMap[name].push({ id: ++custIdSeq, country: defCountry, name: '', detail: '' })
}
function onCustomerCountryChange(sa, c) {
  if (!c.country) return
  if (countryRemaining(c.country) < 0) {
    ElMessage.warning(`「${c.country}」客资已分配完`)
    c.country = ''
  }
}
function removeCustomer(name, id) {
  if (!salesMap[name]) return
  salesMap[name] = salesMap[name].filter(c => c.id !== id)
}

function removeSalesRow(name) { delete salesMap[name]; nextTick(() => { if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys(Object.keys(salesMap)) }) }
function removeCountryRow(country) { delete countryMap[country]; pruneOrphanCustomers(); nextTick(() => { if (countryTreeRef.value) countryTreeRef.value.setCheckedKeys(Object.keys(countryMap)) }); syncCountryTotal() }
function restoreCountryMap(arr, skipTotal) {
  for (const k of Object.keys(countryMap)) delete countryMap[k]
  if (Array.isArray(arr)) for (const s of arr) { if (s.country) countryMap[s.country] = s.count || 1 }
  nextTick(() => { if (countryTreeRef.value) countryTreeRef.value.setCheckedKeys(Object.keys(countryMap)) })
  if (!skipTotal) syncCountryTotal()
}
function restoreSalesMap(arr) {
  for (const k of Object.keys(salesMap)) delete salesMap[k]
  if (Array.isArray(arr)) {
    for (const s of arr) {
      if (!s.name) continue
      if (Array.isArray(s.customers)) {
        salesMap[s.name] = s.customers.map(c => ({ id: ++custIdSeq, country: c.country || '', name: c.name || c.text || '', detail: c.detail || '' }))
      } else {
        // 旧结构 { name, count }：生成 count 条空客户详情，待用户补全
        const n = s.count || 0
        salesMap[s.name] = Array.from({ length: n }, () => ({ id: ++custIdSeq, country: '', name: '', detail: '' }))
      }
    }
  }
  nextTick(() => { if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys(Object.keys(salesMap)) })
}

async function loadSalesPersons() { const res = await api.salesPersons.list(); if (res.success) salesPersons.value = res.data }
async function addSalesPerson() {
  const name = newSalesName.value.trim(); if (!name) { ElMessage.warning('请输入名字'); return }
  const res = await api.salesPersons.add(name, newSalesGroup.value.trim())
  if (res.success) { newSalesName.value = ''; newSalesGroup.value = ''; loadSalesPersons() } else ElMessage.error(res.error || '添加失败')
}
function addBulkSales() {
  const raw = bulkSalesInput.value.trim(); if (!raw) return
  const names = raw.split(/[,，、\s\n\r]+/).map(s => s.trim()).filter(Boolean); if (!names.length) return
  const group = newSalesGroup.value.trim() || ''
  Promise.allSettled(names.map(n => api.salesPersons.add(n, group)))
    .then(results => {
      bulkSalesInput.value = ''
      loadSalesPersons()
      const ok = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const fail = results.length - ok
      if (fail) ElMessage.warning(`已添加 ${ok} 个，${fail} 个失败`)
      else ElMessage.success('已添加 ' + ok + ' 个')
    })
}
async function deleteSalesPerson(sp) { const res = await api.salesPersons.delete(sp.id); if (res.success) loadSalesPersons() }

async function loadData() {
  const d = formDate.value; if (!d) return
  const isAllMode = accountId.value === 'all'
  autoSaveSkip = true
  monthly.perAccount = []
  const dayQ = { startDate: d, endDate: d }
  if (!isAllMode) dayQ.accountId = accountId.value
  const res = await api.customerStats.list(dayQ)
  if (isAllMode) {
    existingId.value = null
    for (const k of Object.keys(salesMap)) delete salesMap[k]
    for (const k of Object.keys(countryMap)) delete countryMap[k]
    if (res.success && res.data.length) {
      const sum = k => res.data.reduce((s, r) => s + (r[k] || 0), 0)
      form.newCustomers = sum('newCustomers'); form.repliedCustomers = sum('repliedCustomers'); form.registeredCustomers = sum('registeredCustomers')
      form.groupedWithPlan = sum('groupedWithPlan'); form.visitingCustomers = sum('visitingCustomers'); form.closedDeals = sum('closedDeals')
      // 聚合各账号今日国家客资与分配销售（只读展示）
      for (const r of res.data) {
        for (const cb of (Array.isArray(r.countryBreakdown) ? r.countryBreakdown : [])) { if (cb.country) countryMap[cb.country] = (countryMap[cb.country] || 0) + (cb.count || 0) }
        for (const sa of (Array.isArray(r.salesAssignments) ? r.salesAssignments : [])) {
          if (!sa.name) continue
          if (!salesMap[sa.name]) salesMap[sa.name] = []
          const customers = Array.isArray(sa.customers) ? sa.customers : []
          for (const c of customers) salesMap[sa.name].push({ id: ++custIdSeq, country: c.country || '', name: c.name || c.text || '', detail: c.detail || '' })
        }
      }
    } else { Object.assign(form, defaultForm()) }
    nextTick(() => { if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys(Object.keys(salesMap)); if (countryTreeRef.value) countryTreeRef.value.setCheckedKeys(Object.keys(countryMap)) })
  } else if (res.success && res.data.length) {
    const r = res.data[0]; existingId.value = r.id
    form.newCustomers = r.newCustomers; form.repliedCustomers = r.repliedCustomers; form.registeredCustomers = r.registeredCustomers
    form.groupedWithPlan = r.groupedWithPlan; form.visitingCustomers = r.visitingCustomers; form.closedDeals = r.closedDeals
    restoreSalesMap(r.salesAssignments); restoreCountryMap(r.countryBreakdown, !(r.countryBreakdown && r.countryBreakdown.length) /* 有客资则强制同步新客户总数，无客资(老数据)保留手填值 */)
  } else { existingId.value = null; Object.assign(form, defaultForm()); for (const k of Object.keys(salesMap)) delete salesMap[k]; for (const k of Object.keys(countryMap)) delete countryMap[k]; nextTick(() => { if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys([]); if (countryTreeRef.value) countryTreeRef.value.setCheckedKeys([]) }) }
  const mRes = await api.customerStats.monthly(d.substring(0, 7), accountId.value, d); if (mRes.success) Object.assign(monthly, mRes.data); else resetMonthly()
  // 历史仅加载当月数据
  const hQ = { startDate: d.substring(0, 7) + '-01', endDate: d.substring(0, 7) + '-31' }
  if (!isAllMode) hQ.accountId = accountId.value
  const hRes = await api.customerStats.list(hQ)
  if (hRes.success) {
    if (isAllMode) {
      // 全部账号：按日期合并各账号总数
      const byDate = {}
      const add = (key, r) => {
        if (!byDate[key]) byDate[key] = { id: 'all-' + key, date: key, newCustomers: 0, repliedCustomers: 0, registeredCustomers: 0, groupedWithPlan: 0, visitingCustomers: 0, closedDeals: 0, salesAssignments: {} }
        const t = byDate[key]
        t.newCustomers += (r.newCustomers || 0); t.repliedCustomers += (r.repliedCustomers || 0); t.registeredCustomers += (r.registeredCustomers || 0)
        t.groupedWithPlan += (r.groupedWithPlan || 0); t.visitingCustomers += (r.visitingCustomers || 0); t.closedDeals += (r.closedDeals || 0)
        for (const sa of (Array.isArray(r.salesAssignments) ? r.salesAssignments : [])) { const cnt = Array.isArray(sa.customers) ? sa.customers.length : (sa.count || 0); if (sa.name && cnt > 0) t.salesAssignments[sa.name] = (t.salesAssignments[sa.name] || 0) + cnt }
      }
      for (const r of hRes.data) add(r.date, r)
      history.value = Object.values(byDate).map(t => ({ ...t, salesAssignments: Object.entries(t.salesAssignments).map(([name, count]) => ({ name, count })) })).sort((a, b) => b.date.localeCompare(a.date))
    } else {
      history.value = hRes.data.sort((a, b) => b.date.localeCompare(a.date))
    }
  }
  autoSaveSkip = false; saveMsg.value = ''
}

let skipAutoLoad = false
function onDateChange() { if (skipAutoLoad) return; flushAutoSave(); saveMsg.value = ''; loadData() }
function onAccountChange() { flushAutoSave(); localStorage.setItem('cs_accountId', accountId.value); loadData() }

async function saveData(silent, snap) {
  const date = snap?.date ?? formDate.value
  const aid = snap?.accountId ?? accountId.value
  if (aid === 'all') return
  if (!date) { if (!silent) ElMessage.warning('请选择日期'); return }
  const acc = accounts.value.find(a => a.id === aid) || accounts.value[0]
  if (!silent) { saveMsg.value = '保存中...'; saveOk.value = true }
  try {
    const payload = { date, accountId: aid, accountName: acc.name, newCustomers: form.newCustomers || 0, repliedCustomers: form.repliedCustomers || 0, registeredCustomers: form.registeredCustomers || 0, groupedWithPlan: form.groupedWithPlan || 0, visitingCustomers: form.visitingCustomers || 0, closedDeals: form.closedDeals || 0, salesAssignments: Object.keys(salesMap).filter(n => (salesMap[n] || []).length > 0).map(n => ({ name: n, customers: (salesMap[n] || []).map(c => { const cname = (c.name || '').trim(); const detail = (c.detail || '').trim(); return { country: c.country || '', name: cname, detail, text: detail } }) })), countryBreakdown: selectedCountries.value.filter(c => c.country), clientId }
    const res = await api.customerStats.save(payload)
    if (res.success) { existingId.value = res.data.id; saveMsg.value = silent ? '已自动保存' : '已保存'; saveOk.value = true; autoSaveSkip = true; await refreshMonthly(); autoSaveSkip = false } else { saveMsg.value = '❌ ' + (res.error || '未知错误'); saveOk.value = false }
    const currentMsg = saveMsg.value
    setTimeout(() => { if (saveMsg.value === currentMsg) saveMsg.value = '' }, 2500)
  } catch (e) { saveMsg.value = '❌ ' + e.message; saveOk.value = false }
}

async function clearForm() {
  autoSaveSkip = true
  const id = existingId.value
  Object.assign(form, defaultForm())
  for (const k of Object.keys(salesMap)) delete salesMap[k]
  for (const k of Object.keys(countryMap)) delete countryMap[k]
  existingId.value = null
  saveMsg.value = ''
  nextTick(() => { if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys([]); if (countryTreeRef.value) countryTreeRef.value.setCheckedKeys([]) })
  autoSaveSkip = false
  if (id) {
    saveMsg.value = '清空中...'; saveOk.value = true
    try {
      const res = await api.customerStats.delete(id)
      if (res.success) { saveMsg.value = '已清空'; saveOk.value = true; await refreshMonthly() }
      else { saveMsg.value = '❌ ' + (res.error || '清空失败'); saveOk.value = false }
    } catch (e) { saveMsg.value = '❌ ' + e.message; saveOk.value = false }
    const cur = saveMsg.value
    setTimeout(() => { if (saveMsg.value === cur) saveMsg.value = '' }, 2500)
  } else {
    ElMessage.success('已清空')
  }
}

function editRecord(r) { flushAutoSave(); skipAutoLoad = true; if (r.accountId && r.accountId !== accountId.value) { accountId.value = r.accountId; localStorage.setItem('cs_accountId', accountId.value) }; formDate.value = r.date; skipAutoLoad = false; loadData() }

const previewText = computed(() => {
  const d = formDate.value; if (!d) return ''
  const salesText = selectedSales.value.map(s => s.name + (s.customers?.length || 0) + '个').join(' ')
  return `${dailyLabel.value}总结：\n⭐本日数据：\n1.本日新客户：${form.newCustomers || 0}个\n2.本日有回复的客户：${form.repliedCustomers || 0}个\n3.本日已登记客户：${form.registeredCustomers || 0}个\n4.本日已拉群且有平面图客户：${form.groupedWithPlan || 0}个\n5.本日来访客户：${form.visitingCustomers || 0}\n6.本日成交客户：${form.closedDeals || 0}\n7.拉群客户分配销售：${salesText || '无'}\n\n⭐月度数据：\n1.本月总询盘客户：${monthly.newCustomers}个\n2.本月有回复的客户：${monthly.repliedCustomers}个\n3.本月已登记客户：${monthly.registeredCustomers}个\n4.本月已拉群且有平面图客户：${monthly.groupedWithPlan}个\n5.本月来访客户：${monthly.visitingCustomers}\n6.本月成交客户：${monthly.closedDeals}\n7.拉群客户分配销售：${monthly.salesAssignments.length ? [...monthly.salesAssignments].sort((a,b) => b.count - a.count).map(s => s.name + s.count + '个').join(' ') : '无'}`
})
async function copyPreview() { if (!previewText.value) { ElMessage.warning('请先填写数据'); return }; try { await navigator.clipboard.writeText(previewText.value); ElMessage.success('已复制') } catch { const ta = document.createElement('textarea'); ta.value = previewText.value; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy') } catch {}; document.body.removeChild(ta) } }

function resetMonthly() { Object.assign(monthly, { newCustomers: 0, repliedCustomers: 0, registeredCustomers: 0, groupedWithPlan: 0, visitingCustomers: 0, closedDeals: 0, salesAssignments: [], countryBreakdown: [], records: 0, perAccount: [] }) }
async function refreshMonthly() { const d = formDate.value; if (!d) return; const mRes = await api.customerStats.monthly(d.substring(0, 7), accountId.value, d); if (mRes.success) Object.assign(monthly, mRes.data); else resetMonthly() }

async function doParsePaste() {
  parseResults.value = []; const raw = pasteInput.value.trim(); if (!raw) { ElMessage.warning('请先粘贴内容'); return }
  const text = raw.replace(/\r\n/g, '\n').replace(/：/g, ':')
  const dm = text.match(/(\d+)月(\d+)日/)
  let dateChanged = false
  if (dm) { const y = formDate.value.split('-')[0]; const newDate = y + '-' + dm[1].padStart(2, '0') + '-' + dm[2].padStart(2, '0'); if (newDate !== formDate.value) { formDate.value = newDate; dateChanged = true } parseResults.value.push('日期: ' + dm[1] + '月' + dm[2] + '日') }
  if (dateChanged) await loadData()
  const daySection = text.split(/⭐月度数据|月度数据/)[0] || text
  const m1 = daySection.match(/本日新客户[:\s]*(\d+)/); if (m1) { form.newCustomers = parseInt(m1[1]) || 0; parseResults.value.push('新客户: ' + m1[1]) }
  const m2 = daySection.match(/有回复的客户[:\s]*(\d+)/); if (m2) { form.repliedCustomers = parseInt(m2[1]) || 0; parseResults.value.push('有回复: ' + m2[1]) }
  const m3 = daySection.match(/已登记客户[:\s]*(\d+)/); if (m3) { form.registeredCustomers = parseInt(m3[1]) || 0; parseResults.value.push('已登记: ' + m3[1]) }
  const m4 = daySection.match(/已拉群且有平面图[:\s]*(\d+)/); if (m4) { form.groupedWithPlan = parseInt(m4[1]) || 0; parseResults.value.push('拉群+平面图: ' + m4[1]) }
  const m5 = daySection.match(/来访客户[:\s]*(\d+)/); if (m5) { form.visitingCustomers = parseInt(m5[1]) || 0; parseResults.value.push('来访: ' + m5[1]) }
  const m6 = daySection.match(/成交客户[:\s]*(\d+)/); if (m6) { form.closedDeals = parseInt(m6[1]) || 0; parseResults.value.push('成交: ' + m6[1]) }
  const saLine = daySection.match(/拉群客户分配销售[:\s]*([^\n]*)/)
  if (saLine && saLine[1] && saLine[1].trim() !== '无') { const saRe = /([^\s,，、\d]+?)(\d+)个/g; let sm; while ((sm = saRe.exec(saLine[1])) !== null) { const n = parseInt(sm[2]); salesMap[sm[1]] = Array.from({ length: n }, () => ({ id: ++custIdSeq, country: '', name: '', detail: '' })); parseResults.value.push('销售: ' + sm[1] + sm[2] + '个') } }
  pasteVisible.value = false; pasteInput.value = ''
  parseResults.value.length ? ElMessage.success('识别 ' + parseResults.value.length + ' 个字段') : ElMessage.warning('未识别到数据')
  nextTick(() => { if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys(Object.keys(salesMap)) })
  if (!dateChanged) refreshMonthly()
}



// ====== 自动保存 ======
let autoSaveSkip = false
let autoSaveReady = false
let autoSaveTimer = null
let pendingSnapshot = null
function triggerAutoSave() {
  if (autoSaveSkip) return
  if (!autoSaveReady) return
  // 快照当前上下文（日期/账号），避免切换后 saveData 读错值
  pendingSnapshot = { date: formDate.value, accountId: accountId.value }
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null
    if (autoSaveSkip) return
    const snap = pendingSnapshot; pendingSnapshot = null
    saveMsg.value = '自动保存中...'; saveOk.value = true
    saveData(true, snap)
  }, 1000)
}

// 离开/切换前立即保存未落盘的修改（否则 debounce 未触发就丢失）
function flushAutoSave() {
  if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null }
  const snap = pendingSnapshot; pendingSnapshot = null
  if (autoSaveSkip || !snap) return
  saveData(true, snap)
}

watch(
  () => JSON.stringify({
    nc: form.newCustomers, rc: form.repliedCustomers, reg: form.registeredCustomers,
    gp: form.groupedWithPlan, vc: form.visitingCustomers, cd: form.closedDeals,
    sa: selectedSales.value.map(s => s.name + ':' + (s.customers || []).map(c => (c.country || '') + '/' + (c.name || '') + '/' + (c.detail || '')).join('|')).join(','),
    cc: selectedCountries.value.map(c => c.country + ':' + c.count).join(','),
  }),
  () => { triggerAutoSave() }
)

onMounted(async () => { await loadSalesPersons(); await loadData(); setTimeout(() => { autoSaveReady = true }, 800); startRealtime() })
onUnmounted(() => { flushAutoSave(); stopRealtime() })

// ====== 实时更新 ======
let eventSource = null
function startRealtime() {
  try {
    const token = localStorage.getItem('pan_token') || ''
    if (!token) return
    eventSource = new EventSource('/api/events?token=' + encodeURIComponent(token))
    eventSource.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data)
        if (p.type !== 'customer-stats-changed') return
        if (p.clientId === clientId) return
        if (autoSaveTimer) return // 本地有未保存修改，先让本地保存
        // 刷新当前视图（数据/月度/历史）；日期/账号匹配由 loadData 自身处理
        loadData()
      } catch {}
    }
  } catch {}
}
function stopRealtime() {
  if (eventSource) { try { eventSource.close() } catch {} ; eventSource = null }
}
</script>

<style scoped>
.cs-page { --c-bg:#f7f8fa;--c-card:#fff;--c-border:#eaecf0;--c-accent:#5b5fe3;--c-accent-light:#edeefc;--c-text:#1a1d2e;--c-soft:#6b7084;--c-muted:#9ba0b4;--c-good:#12b886;--c-bad:#e5484d;--r:14px;--rs:10px;}
.cs-main{flex:1;min-height:0;display:flex;gap:18px;align-items:flex-start;}

/* Topbar */
.cs-topbar{display:flex;justify-content:space-between;align-items:center;padding:18px 0 14px;gap:12px;flex-wrap:wrap;}
.cs-top-left{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.cs-top-left h2{font-size:22px;font-weight:700;color:var(--c-text);display:flex;align-items:center;gap:10px;margin:0;letter-spacing:-.3px;}
.cs-icon-wrap{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:var(--c-accent-light);color:var(--c-accent);}
.cs-date-pick{width:148px;}.cs-account-sel{width:176px;}
.cs-badge{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:.2px;}
.cs-badge::before{content:'●';font-size:8px;}
.cs-badge--ok{background:#ecfdf3;color:#0e6245;}
.cs-badge--new{background:var(--c-bg);color:var(--c-muted);}
.cs-ghost-btn{border:1.5px solid var(--c-border);color:var(--c-soft);font-weight:600;border-radius:8px;font-size:13px;}
.cs-ghost-btn:hover{border-color:var(--c-accent);color:var(--c-accent);background:var(--c-accent-light);}

/* Toolbar */
.cs-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:18px;}
.cs-toolbar .el-button{font-weight:600;border-radius:8px;}
.cs-clear-btn{color:var(--c-soft);border-color:var(--c-border);}
.cs-clear-btn:hover{color:var(--c-bad);border-color:var(--c-bad);background:#fef2f2;}
.cs-save-msg{font-size:12px;font-weight:600;margin-left:6px;}
.cs-save-msg.ok{color:var(--c-good);}.cs-save-msg.fail{color:var(--c-bad);}
.cs-fade-enter-active,.cs-fade-leave-active{transition:opacity .2s;}
.cs-fade-enter-from,.cs-fade-leave-to{opacity:0;}

/* 分配销售标题栏的公司名输入 */
.cs-sales-hd .cs-gt-company{width:150px;flex-shrink:0;margin-left:auto;}

/* Layout */
.cs-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:14px;}
.cs-right{width:480px;flex-shrink:0;align-self:flex-start;position:sticky;top:18px;display:flex;flex-direction:column;gap:14px;}

/* Card */
.cs-card{background:var(--c-card);border:1px solid var(--c-border);border-radius:var(--r);padding:22px 24px;}
.cs-card-hd{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:var(--c-text);margin-bottom:18px;letter-spacing:-.2px;}
.cs-card-hd--tight{margin-bottom:10px;}
.cs-hd-dot{width:8px;height:8px;border-radius:3px;flex-shrink:0;background:var(--c-accent);}
.cs-hd-dot--sec{background:#10b981;}.cs-hd-dot--accent{background:#f59e0b;}
.cs-hd-date{font-size:13px;font-weight:500;color:var(--c-muted);margin-left:auto;}
.cs-hd-sub{font-size:12px;font-weight:500;color:var(--c-muted);margin-left:auto;}
.cs-hd-hint{font-size:11px;font-weight:500;color:var(--c-muted);margin-left:auto;}

/* Daily */
.cs-daily-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px 24px;margin-bottom:18px;}
.cs-ditem{display:flex;align-items:center;gap:8px;}
.cs-dnum{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:7px;background:color-mix(in srgb,var(--c) 15%,#fff);color:var(--c);font-size:11px;font-weight:800;flex-shrink:0;}
.cs-dlabel{font-size:13px;font-weight:700;color:var(--c-soft);white-space:nowrap;width:68px;flex-shrink:0;}
.cs-dinput-wrap{flex:1;max-width:140px;}
.cs-dinput-raw{width:100%;height:42px;border:2px solid #e5e7eb;border-radius:10px;background:#fafbfc;text-align:center;font-size:18px;font-weight:700;color:var(--c-text);outline:none;transition:all .15s;font-family:inherit;padding:0 8px;}
.cs-dinput-raw:hover{border-color:#c7d2fe;}
.cs-dinput-raw:focus{border-color:var(--c-accent);background:var(--surface-input);box-shadow:0 0 0 3px color-mix(in srgb,var(--c-accent) 15%,transparent);}
.cs-dinput-raw--auto{background:#f1f3f9;color:var(--c-soft);cursor:not-allowed;border-style:dashed;}

/* Sales */
.cs-sales-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.cs-country-search{margin-bottom:8px;}
.cs-sales-search{margin-bottom:8px;}
.cs-sales-cnt{font-size:12px;font-weight:600;color:var(--c-accent);margin-left:auto;}
.cs-bottom-row{display:flex;gap:20px;border-top:1px solid var(--c-accent-light);padding-top:18px;align-items:stretch;}
.cs-sales--half{flex:1;min-width:0;border-top:none;padding-top:0;display:flex;flex-direction:column;}
.cs-sales-body{display:flex;gap:12px;align-items:stretch;flex:1;min-height:0;}
.cs-sales-tree{flex:1;min-width:0;border:1px solid var(--c-border);border-radius:var(--rs);padding:6px;background:var(--c-bg);max-height:360px;overflow-y:auto;}
.cs-sales-tree :deep(.el-tree-node__label){overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cs-sales-chips{flex:1;display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto;padding:2px;}
.cs-sales-none{display:flex;align-items:center;justify-content:center;padding:20px 16px;color:var(--c-muted);font-size:12px;border:1px dashed var(--c-border);border-radius:var(--rs);text-align:center;}

/* 分配销售客户详情 */
.cs-sales-lock{display:flex;align-items:center;gap:6px;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:var(--rs);color:#c2410c;font-size:13px;font-weight:600;}
.cs-sales-body--detail .cs-sales-tree{flex:0 0 38%;max-height:360px;}
.cs-sales-detail{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px;max-height:360px;overflow-y:auto;padding-right:4px;}
.cs-sales-group{display:flex;flex-direction:column;gap:8px;border:1px solid var(--c-border);border-radius:var(--rs);padding:10px 12px;background:#fbfbfd;}
.cs-sales-group-hd{display:flex;align-items:center;gap:8px;margin-bottom:2px;}
.cs-sales-group-cnt{font-size:12px;font-weight:600;color:var(--c-muted);}
.cs-cust-row{display:flex;flex-direction:column;gap:6px;border:1px solid #eef0f4;border-radius:8px;padding:6px 8px;background:#fff;}
.cs-cust-row-top{display:flex;align-items:center;gap:8px;}
.cs-cust-country{flex:1;min-width:0;}
.cs-cust-text{width:100%;}
.cs-cust-groupname{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--c-accent);background:#f5f3ff;border:1px dashed #c7d2fe;border-radius:6px;padding:4px 8px;flex-wrap:wrap;}
.cs-cust-groupname-text{font-weight:600;word-break:break-all;flex:1;min-width:0;}
.cs-cust-copy{flex-shrink:0;}
.cs-cust-del{flex-shrink:0;opacity:.45;}
.cs-cust-del:hover{opacity:1;}
.cs-cust-add{align-self:flex-start;padding:5px 12px;border:1px dashed var(--c-border);border-radius:8px;font-size:12px;font-weight:600;color:var(--c-soft);transition:all .12s;background:#fff;}
.cs-cust-add:hover{border-color:var(--c-accent);color:var(--c-accent);background:var(--c-accent-light);}

.cs-chip-row{display:flex;align-items:center;gap:4px;flex-shrink:0;justify-content:space-between;width:100%;}
.cs-stepper{display:inline-flex;align-items:center;gap:0;border-radius:6px;overflow:hidden;border:1px solid var(--c-border);flex-shrink:0;}
.cs-step-btn{
  width:30px;height:32px;border:none;background:#f9fafb;
  display:flex;align-items:center;justify-content:center;
  font-size:15px;font-weight:700;color:var(--c-soft);cursor:pointer;
  transition:all .12s;padding:0;line-height:1;
}
.cs-step-btn:hover{background:var(--c-accent-light);color:var(--c-accent);}
.cs-step-btn--plus{color:var(--c-good);}
.cs-step-btn--plus:hover{background:#ecfdf3;color:#0e6245;}
.cs-step-val{min-width:34px;height:32px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--c-text);border:none;outline:none;background:var(--surface-card);padding:0 4px;font-family:inherit;}



/* History */
.cs-ht{border:1px solid var(--c-border);border-radius:var(--rs);overflow:hidden auto;}
.cs-ht-row{display:grid;grid-template-columns:88px repeat(6,1fr) 150px;align-items:center;gap:6px;padding:13px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:600;color:var(--c-soft);}
.cs-ht-row--head{background:#f9fafb;font-size:12px;color:var(--c-muted);padding:9px 16px;letter-spacing:.2px;font-weight:700;}
.cs-ht-row:not(.cs-ht-row--head){cursor:pointer;transition:all .12s;}
.cs-ht-row:nth-child(even):not(.cs-ht-row--head){background:#fcfcfd;}
.cs-ht-row:hover:not(.cs-ht-row--head){background:var(--c-accent-light);box-shadow:inset 3px 0 0 var(--c-accent);}
.cs-ht-row:last-of-type{border-bottom:none;}
.cs-ht-date{font-weight:700;color:var(--c-text);font-size:14px;display:flex;flex-direction:column;gap:0;}
.cs-ht-date i{font-style:normal;font-size:11px;font-weight:500;color:var(--c-muted);}
.cs-ht-v{font-size:16px;font-weight:700;color:var(--c-text);text-align:center;}
.cs-ht-s{font-size:12px;color:var(--c-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* Per-account */
.cs-pa-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.cs-pa-card{background:#f9fafb;border:1px solid var(--c-border);border-radius:var(--rs);padding:12px 14px;}
.cs-pa-name{font-size:13px;font-weight:700;color:var(--c-text);margin-bottom:10px;}
.cs-pa-cells{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
.cs-pa-cell{display:flex;flex-direction:column;align-items:center;gap:2px;}
.cs-pa-cell b{font-size:20px;font-weight:800;color:var(--c-accent);line-height:1.1;}
.cs-pa-cell span{font-size:10px;font-weight:600;color:var(--c-muted);}
@media(max-width:960px){.cs-pa-grid{grid-template-columns:1fr;}}

/* Preview */
.cs-card--preview{border-color:var(--c-accent-light);}
.cs-preview-text{white-space:pre-wrap;word-break:break-word;font-size:14px;line-height:1.9;color:var(--c-soft);overflow-y:auto;font-family:inherit;margin:0;}
.cs-preview-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:32px 16px;color:var(--c-muted);font-size:13px;text-align:center;background:var(--c-card);border:1px dashed var(--c-border);border-radius:var(--r);}

/* Dialog */
.cs-dlg-list{display:flex;flex-direction:column;gap:4px;max-height:240px;overflow-y:auto;}
.cs-dlg-row{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f9fafb;border-radius:8px;}
.cs-dlg-name{font-size:14px;font-weight:600;color:var(--c-text);}.cs-dlg-gap{flex:1;}
.cs-dlg-paste{margin-top:14px;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;}
.cs-dlg-paste-label{font-size:11px;font-weight:600;color:#166534;margin-bottom:8px;}
.cs-dlg-paste-btn{margin-top:8px;}
.cs-dlg-add{display:flex;gap:8px;margin-top:12px;}.cs-dlg-add-name{flex:2;}.cs-dlg-add-group{flex:1;}

/* Parse */
.cs-parse-result{margin-top:12px;background:#f0fdf4;border-radius:var(--rs);padding:12px 14px;}
.cs-parse-result-title{font-weight:700;color:#0e6245;margin-bottom:4px;font-size:13px;}
.cs-parse-result-line{font-size:12px;color:var(--c-soft);line-height:1.6;}

.cs-empty{text-align:center;padding:32px 24px;color:var(--c-muted);font-size:13px;display:flex;flex-direction:column;align-items:center;gap:8px;}

@media(max-width:960px){.cs-main{flex-direction:column;}.cs-right{width:100%;position:static;align-self:auto;}.cs-daily-grid{grid-template-columns:1fr;}.cs-ht-row{grid-template-columns:60px repeat(6,1fr) 100px;font-size:12px;padding:10px 8px;}.cs-sales-body{flex-direction:column;}.cs-sales-tree,.cs-sales-body--detail .cs-sales-tree{flex:1 1 auto;width:100%;max-height:220px;}}
</style>

<style>
/* 日期快捷面板美化（popper 挂 body，需非 scoped） */
.cs-date-popper .el-picker-panel__shortcut {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  padding: 8px 14px;
  border-radius: 6px;
  line-height: 1.4;
}
.cs-date-popper .el-picker-panel__shortcut:hover {
  color: #5b5fe3;
  background: #f5f3ff;
}
</style>
