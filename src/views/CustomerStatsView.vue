<template>
  <div class="cs-page">
    <div class="cs-topbar">
      <div class="cs-top-left">
        <h2><span class="cs-icon-wrap"><el-icon :size="20"><DataAnalysis /></el-icon></span> 客户统计</h2>
        <el-date-picker v-model="formDate" type="date" value-format="YYYY-MM-DD" size="default" @change="onDateChange" class="cs-date-pick" />
        <el-select v-model="accountId" size="default" placeholder="选择广告账号" @change="onAccountChange" class="cs-account-sel">
          <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
        </el-select>
        <span v-if="existingId" class="cs-badge cs-badge--ok">已有记录</span>
        <span v-else class="cs-badge cs-badge--new">新日期</span>
      </div>
      <div class="cs-top-right">
        <el-button @click="salesManageVisible = true" class="cs-ghost-btn"><el-icon :size="14"><User /></el-icon> 销售名单</el-button>
      </div>
    </div>

    <div class="cs-toolbar">
      <el-button type="primary" @click="saveData"><el-icon :size="15"><Check /></el-icon> 保存</el-button>
      <el-button @click="pasteVisible = true"><el-icon :size="15"><Files /></el-icon> 粘贴识别</el-button>
      <el-button @click="copyPreview"><el-icon :size="15"><DocumentCopy /></el-icon> 一键复制</el-button>
      <el-button @click="clearForm" class="cs-clear-btn"><el-icon :size="15"><Delete /></el-icon> 清空</el-button>
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
            <label class="cs-ditem"><span class="cs-dnum">1</span><span class="cs-dlabel">新客户</span><el-input-number v-model="form.newCustomers" :min="0" placeholder="0" class="cs-dinput" /><span class="cs-dunit">个</span></label>
            <label class="cs-ditem"><span class="cs-dnum">2</span><span class="cs-dlabel">有回复</span><el-input-number v-model="form.repliedCustomers" :min="0" placeholder="0" class="cs-dinput" /><span class="cs-dunit">个</span></label>
            <label class="cs-ditem"><span class="cs-dnum">3</span><span class="cs-dlabel">已登记</span><el-input-number v-model="form.registeredCustomers" :min="0" placeholder="0" class="cs-dinput" /><span class="cs-dunit">个</span></label>
            <label class="cs-ditem"><span class="cs-dnum">4</span><span class="cs-dlabel">拉群+图</span><el-input-number v-model="form.groupedWithPlan" :min="0" placeholder="0" class="cs-dinput" /><span class="cs-dunit">个</span></label>
            <label class="cs-ditem"><span class="cs-dnum">5</span><span class="cs-dlabel">来访</span><el-input-number v-model="form.visitingCustomers" :min="0" placeholder="0" class="cs-dinput" /><span class="cs-dunit">个</span></label>
            <label class="cs-ditem"><span class="cs-dnum">6</span><span class="cs-dlabel">成交</span><el-input-number v-model="form.closedDeals" :min="0" placeholder="0" class="cs-dinput" /><span class="cs-dunit">个</span></label>
          </div>

          <div class="cs-bottom-row">
            <div class="cs-sales cs-sales--half">
              <div class="cs-sales-hd"><span class="cs-dnum">7</span><span class="cs-dlabel">国家客资</span><span class="cs-sales-cnt" v-if="selectedCountries.length">{{ totalCountryCount }}个</span></div>
              <div class="cs-sales-body">
                <div class="cs-sales-tree">
                  <el-tree ref="countryTreeRef" :data="countryTreeData" show-checkbox node-key="key" :props="{ label: 'label', children: 'children' }" default-expand-all @check="onCountryTreeCheck" />
                </div>
                <div class="cs-sales-chips" v-if="selectedCountries.length">
                  <div v-for="ct in selectedCountries" :key="ct.country" class="cs-chip-row">
                    <el-tag size="small" effect="dark" type="success" closable @close="removeCountryRow(ct.country)">{{ ct.country }}</el-tag>
                    <span class="cs-stepper">
                      <button class="cs-step-btn" @click="countryMap[ct.country] = Math.max(1, (countryMap[ct.country]||1) - 1); syncCountryTotal()">−</button>
                      <span class="cs-step-val">{{ countryMap[ct.country] || 0 }}</span>
                      <button class="cs-step-btn cs-step-btn--plus" @click="countryMap[ct.country] = (countryMap[ct.country]||0) + 1; syncCountryTotal()">+</button>
                    </span>
                  </div>
                </div>
                <div v-else class="cs-sales-none">勾选国家</div>
              </div>
            </div>

            <div class="cs-sales cs-sales--half">
              <div class="cs-sales-hd"><span class="cs-dnum">8</span><span class="cs-dlabel">分配销售</span><span class="cs-sales-cnt" v-if="selectedSales.length">{{ selectedSales.length }}人</span></div>
              <div class="cs-sales-body">
                <div class="cs-sales-tree">
                  <el-tree ref="salesTreeRef" :data="salesTreeData" show-checkbox node-key="key" :props="{ label: 'label', children: 'children' }" default-expand-all @check="onSalesTreeCheck" />
                </div>
                <div class="cs-sales-chips" v-if="selectedSales.length">
                  <div v-for="sa in selectedSales" :key="sa.name" class="cs-chip-row">
                    <el-tag size="small" effect="dark" closable @close="removeSalesRow(sa.name)">{{ sa.name }}</el-tag>
                    <span class="cs-stepper">
                      <button class="cs-step-btn" @click="salesMap[sa.name] = Math.max(1, (salesMap[sa.name]||1) - 1)">−</button>
                      <span class="cs-step-val">{{ salesMap[sa.name] || 0 }}</span>
                      <button class="cs-step-btn cs-step-btn--plus" @click="salesMap[sa.name] = (salesMap[sa.name]||0) + 1">+</button>
                    </span>
                  </div>
                </div>
                <div v-else class="cs-sales-none">勾选销售</div>
              </div>
            </div>
          </div>
        </section>

        <!-- 月度汇总 -->
        <section class="cs-card cs-card--monthly">
          <header class="cs-card-hd"><span class="cs-hd-dot cs-hd-dot--accent"></span> 月度汇总 <span class="cs-hd-sub">{{ monthLabel }} · {{ monthly.records }}天</span></header>
          <div class="cs-mo-grid">
            <div class="cs-mo-cell"><b>{{ monthly.newCustomers }}</b><span>总询盘</span></div>
            <div class="cs-mo-cell"><b>{{ monthly.repliedCustomers }}</b><span>有回复</span></div>
            <div class="cs-mo-cell"><b>{{ monthly.registeredCustomers }}</b><span>已登记</span></div>
            <div class="cs-mo-cell"><b>{{ monthly.groupedWithPlan }}</b><span>拉群+图</span></div>
            <div class="cs-mo-cell"><b>{{ monthly.visitingCustomers }}</b><span>来访</span></div>
            <div class="cs-mo-cell"><b>{{ monthly.closedDeals }}</b><span>成交</span></div>
          </div>
          <div class="cs-mo-sales" v-if="monthly.countryBreakdown.length" style="margin-bottom:6px;">
            <span class="cs-mo-sales-label">国家</span>
            <span v-for="cb in monthly.countryBreakdown.slice(0, 8)" :key="cb.country" class="cs-mo-sales-item">{{ cb.country }} <b>{{ cb.count }}</b>个</span>
            <span v-if="monthly.countryBreakdown.length > 8" class="cs-mo-sales-item">+{{ monthly.countryBreakdown.length - 8 }}</span>
          </div>
          <div class="cs-mo-sales" v-if="monthly.salesAssignments.length">
            <span class="cs-mo-sales-label">分配</span>
            <span v-for="sa in monthly.salesAssignments" :key="sa.name" class="cs-mo-sales-item">{{ sa.name }} <b>{{ sa.count }}</b>个</span>
          </div>
        </section>

        <!-- 历史记录 -->
        <section class="cs-card cs-card--history">
          <header class="cs-card-hd"><span class="cs-hd-dot cs-hd-dot--sec"></span> 历史记录 <span class="cs-hd-hint">点击可编辑</span></header>
          <div class="cs-ht" v-if="history.length">
            <div class="cs-ht-row cs-ht-row--head"><span>日期</span><span>新客户</span><span>回复</span><span>登记</span><span>拉群+图</span><span>来访</span><span>成交</span><span class="cs-ht-s">分配销售</span></div>
            <div v-for="r in history" :key="r.id" class="cs-ht-row" @click="editRecord(r)">
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
          <div v-else class="cs-empty">暂无记录</div>
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
        <div v-if="!salesPersons.length" class="cs-empty">暂未添加</div>
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
const countryTreeRef = ref(null)

// 73国国家树
const countryTreeData = [
  { key:"se-asia", label:"东南亚", children:[{key:"印度尼西亚",label:"印度尼西亚"},{key:"越南",label:"越南"},{key:"菲律宾",label:"菲律宾"},{key:"泰国",label:"泰国"},{key:"马来西亚",label:"马来西亚"},{key:"新加坡",label:"新加坡"},{key:"缅甸",label:"缅甸"},{key:"柬埔寨",label:"柬埔寨"},{key:"老挝",label:"老挝"},{key:"文莱",label:"文莱"}]},
  { key:"s-asia", label:"南亚", children:[{key:"印度",label:"印度"},{key:"巴基斯坦",label:"巴基斯坦"},{key:"孟加拉国",label:"孟加拉国"},{key:"斯里兰卡",label:"斯里兰卡"},{key:"尼泊尔",label:"尼泊尔"}]},
  { key:"africa", label:"非洲", children:[{key:"尼日利亚",label:"尼日利亚"},{key:"埃塞俄比亚",label:"埃塞俄比亚"},{key:"南非",label:"南非"},{key:"肯尼亚",label:"肯尼亚"},{key:"加纳",label:"加纳"},{key:"埃及",label:"埃及"},{key:"坦桑尼亚",label:"坦桑尼亚"},{key:"乌干达",label:"乌干达"},{key:"摩洛哥",label:"摩洛哥"},{key:"阿尔及利亚",label:"阿尔及利亚"},{key:"安哥拉",label:"安哥拉"},{key:"科特迪瓦",label:"科特迪瓦"}]},
  { key:"mid-east", label:"中东", children:[{key:"阿联酋",label:"阿联酋"},{key:"沙特阿拉伯",label:"沙特阿拉伯"},{key:"土耳其",label:"土耳其"},{key:"卡塔尔",label:"卡塔尔"},{key:"阿曼",label:"阿曼"},{key:"科威特",label:"科威特"},{key:"巴林",label:"巴林"},{key:"伊拉克",label:"伊拉克"},{key:"约旦",label:"约旦"},{key:"黎巴嫩",label:"黎巴嫩"},{key:"以色列",label:"以色列"},{key:"伊朗",label:"伊朗"},{key:"也门",label:"也门"}]},
  { key:"e-asia", label:"东亚", children:[{key:"中国",label:"中国"},{key:"日本",label:"日本"},{key:"韩国",label:"韩国"},{key:"蒙古",label:"蒙古"}]},
  { key:"latam", label:"拉美", children:[{key:"巴西",label:"巴西"},{key:"墨西哥",label:"墨西哥"},{key:"哥伦比亚",label:"哥伦比亚"},{key:"阿根廷",label:"阿根廷"},{key:"智利",label:"智利"},{key:"秘鲁",label:"秘鲁"},{key:"厄瓜多尔",label:"厄瓜多尔"},{key:"委内瑞拉",label:"委内瑞拉"}]},
  { key:"emea", label:"欧美", children:[{key:"美国",label:"美国"},{key:"英国",label:"英国"},{key:"德国",label:"德国"},{key:"法国",label:"法国"},{key:"澳大利亚",label:"澳大利亚"},{key:"俄罗斯",label:"俄罗斯"},{key:"加拿大",label:"加拿大"},{key:"意大利",label:"意大利"},{key:"西班牙",label:"西班牙"},{key:"荷兰",label:"荷兰"},{key:"波兰",label:"波兰"},{key:"乌克兰",label:"乌克兰"}]},
  { key:"central-asia", label:"中亚", children:[{key:"哈萨克斯坦",label:"哈萨克斯坦"},{key:"乌兹别克斯坦",label:"乌兹别克斯坦"},{key:"吉尔吉斯斯坦",label:"吉尔吉斯斯坦"}]}
]
const allCountryKeys = countryTreeData.flatMap(g => g.children.map(c => c.key))


const defaultForm = () => ({
  newCustomers: null, repliedCustomers: null, registeredCustomers: null,
  groupedWithPlan: null, visitingCustomers: null, closedDeals: null,
})
const form = reactive(defaultForm())
const salesMap = reactive({})
const countryMap = reactive({})

const monthly = reactive({
  newCustomers: 0, repliedCustomers: 0, registeredCustomers: 0,
  groupedWithPlan: 0, visitingCustomers: 0, closedDeals: 0,
  salesAssignments: [], countryBreakdown: [], records: 0,
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

function onSalesTreeCheck(_n, checked) {
  const leafs = checked.checkedKeys.filter(k => allSalesKeys.value.includes(k))
  for (const k of leafs) { if (!(k in salesMap)) salesMap[k] = 1 }
  for (const k of Object.keys(salesMap)) { if (!leafs.includes(k)) delete salesMap[k] }
}

function onCountryTreeCheck(_n, checked) {
  const leafs = checked.checkedKeys.filter(k => allCountryKeys.includes(k))
  for (const k of leafs) { if (!(k in countryMap)) countryMap[k] = 1 }
  for (const k of Object.keys(countryMap)) { if (!leafs.includes(k)) delete countryMap[k] }
  syncCountryTotal()
}
const selectedSales = computed(() => Object.entries(salesMap).filter(([_, v]) => v > 0).map(([name, count]) => ({ name, count })))
const selectedCountries = computed(() => Object.entries(countryMap).filter(([_, v]) => v > 0).map(([country, count]) => ({ country, count })))
const totalCountryCount = computed(() => selectedCountries.value.reduce((s, c) => s + (c.count || 0), 0))
function syncCountryTotal() { nextTick(() => { form.newCustomers = totalCountryCount.value }) }

function shortDate(str) { if (!str) return ''; const p = str.split('-'); return parseInt(p[1]) + '/' + parseInt(p[2]) }
function dayName(str) { if (!str) return ''; const d = new Date(str + 'T00:00:00'); return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()] }
function formatSalesText(arr) { if (!Array.isArray(arr) || !arr.length) return ''; return arr.filter(s => s.name).map(s => s.name + s.count + '个').join(' ') }

function removeSalesRow(name) { delete salesMap[name]; nextTick(() => { if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys(Object.keys(salesMap)) }) }
function removeCountryRow(country) { delete countryMap[country]; nextTick(() => { if (countryTreeRef.value) countryTreeRef.value.setCheckedKeys(Object.keys(countryMap)) }); syncCountryTotal() }
function restoreCountryMap(arr, skipTotal) {
  for (const k of Object.keys(countryMap)) delete countryMap[k]
  if (Array.isArray(arr)) for (const s of arr) { if (s.country) countryMap[s.country] = s.count || 1 }
  nextTick(() => { if (countryTreeRef.value) countryTreeRef.value.setCheckedKeys(Object.keys(countryMap)) })
  if (!skipTotal) syncCountryTotal()
}
function restoreSalesMap(arr) {
  for (const k of Object.keys(salesMap)) delete salesMap[k]
  if (Array.isArray(arr)) for (const s of arr) { if (s.name) salesMap[s.name] = s.count || 1 }
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
  autoSaveSkip = true
  const res = await api.customerStats.list({ startDate: d, endDate: d, accountId: accountId.value })
  if (res.success && res.data.length) {
    const r = res.data[0]; existingId.value = r.id
    form.newCustomers = r.newCustomers; form.repliedCustomers = r.repliedCustomers; form.registeredCustomers = r.registeredCustomers
    form.groupedWithPlan = r.groupedWithPlan; form.visitingCustomers = r.visitingCustomers; form.closedDeals = r.closedDeals
    restoreSalesMap(r.salesAssignments); restoreCountryMap(r.countryBreakdown, true /* skipTotal: don't overwrite persisted newCustomers */)
  } else { existingId.value = null; Object.assign(form, defaultForm()); for (const k of Object.keys(salesMap)) delete salesMap[k]; for (const k of Object.keys(countryMap)) delete countryMap[k] }
  const mRes = await api.customerStats.monthly(d.substring(0, 7), accountId.value); if (mRes.success) Object.assign(monthly, mRes.data)
  // 历史仅加载当月数据
  const hRes = await api.customerStats.list({ accountId: accountId.value, startDate: d.substring(0, 7) + '-01', endDate: d.substring(0, 7) + '-31' }); if (hRes.success) history.value = hRes.data.sort((a, b) => b.date.localeCompare(a.date))
  autoSaveSkip = false; saveMsg.value = ''
}

let skipAutoLoad = false
function onDateChange() { if (skipAutoLoad) return; saveMsg.value = ''; loadData() }
function onAccountChange() { localStorage.setItem('cs_accountId', accountId.value); loadData() }

async function saveData(silent) {
  const d = formDate.value; if (!d) { if (!silent) ElMessage.warning('请选择日期'); return }
  const acc = accounts.value.find(a => a.id === accountId.value) || accounts.value[0]
  if (!silent) { saveMsg.value = '保存中...'; saveOk.value = true }
  try {
    const payload = { date: d, accountId: accountId.value, accountName: acc.name, newCustomers: form.newCustomers || 0, repliedCustomers: form.repliedCustomers || 0, registeredCustomers: form.registeredCustomers || 0, groupedWithPlan: form.groupedWithPlan || 0, visitingCustomers: form.visitingCustomers || 0, closedDeals: form.closedDeals || 0, salesAssignments: selectedSales.value.filter(s => s.name), countryBreakdown: selectedCountries.value.filter(c => c.country) }
    const res = await api.customerStats.save(payload)
    if (res.success) { existingId.value = res.data.id; saveMsg.value = silent ? '已自动保存' : '已保存'; saveOk.value = true; autoSaveSkip = true; await refreshMonthly(); autoSaveSkip = false } else { saveMsg.value = '❌ ' + (res.error || '未知错误'); saveOk.value = false }
    if (silent) { setTimeout(() => { if (saveMsg.value === '已自动保存') saveMsg.value = '' }, 2000) }
  } catch (e) { saveMsg.value = '❌ ' + e.message; saveOk.value = false }
}

function clearForm() { autoSaveSkip = true; Object.assign(form, defaultForm()); for (const k of Object.keys(salesMap)) delete salesMap[k]; for (const k of Object.keys(countryMap)) delete countryMap[k]; existingId.value = null; saveMsg.value = ''; nextTick(() => { if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys([]); if (countryTreeRef.value) countryTreeRef.value.setCheckedKeys([]); autoSaveSkip = false }); ElMessage.success('已清空') }

function editRecord(r) { skipAutoLoad = true; if (r.accountId && r.accountId !== accountId.value) { accountId.value = r.accountId; localStorage.setItem('cs_accountId', accountId.value) }; formDate.value = r.date; skipAutoLoad = false; loadData() }

const previewText = computed(() => {
  const d = formDate.value; if (!d) return ''
  const salesText = selectedSales.value.map(s => s.name + s.count + '个').join(' ')
  return `${dailyLabel.value}总结：\n⭐本日数据：\n1.本日新客户：${form.newCustomers || 0}个\n2.本日有回复的客户：${form.repliedCustomers || 0}个\n3.本日已登记客户：${form.registeredCustomers || 0}个\n4.本日已拉群且有平面图客户：${form.groupedWithPlan || 0}个\n5.本日来访客户：${form.visitingCustomers || 0}\n6.本日成交客户：${form.closedDeals || 0}\n7.拉群客户分配销售：${salesText || '无'}\n\n⭐月度数据：\n1.本月总询盘客户：${monthly.newCustomers}个\n2.本月有回复的客户：${monthly.repliedCustomers}个\n3.本月已登记客户：${monthly.registeredCustomers}个\n4.本月已拉群且有平面图客户：${monthly.groupedWithPlan}个\n5.本月来访客户：${monthly.visitingCustomers}\n6.本月成交客户：${monthly.closedDeals}\n7.拉群客户分配销售：${monthly.salesAssignments.length ? monthly.salesAssignments.map(s => s.name + s.count + '个').join(' ') : '无'}`
})
async function copyPreview() { if (!previewText.value) { ElMessage.warning('请先填写数据'); return }; try { await navigator.clipboard.writeText(previewText.value); ElMessage.success('已复制') } catch { const ta = document.createElement('textarea'); ta.value = previewText.value; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy') } catch {}; document.body.removeChild(ta) } }

async function refreshMonthly() { const d = formDate.value; if (!d) return; const mRes = await api.customerStats.monthly(d.substring(0, 7), accountId.value); if (mRes.success) Object.assign(monthly, mRes.data) }

function doParsePaste() {
  parseResults.value = []; const raw = pasteInput.value.trim(); if (!raw) { ElMessage.warning('请先粘贴内容'); return }
  const text = raw.replace(/\r\n/g, '\n').replace(/：/g, ':')
  const dm = text.match(/(\d+)月(\d+)日/); if (dm) { const y = formDate.value.split('-')[0]; formDate.value = y + '-' + dm[1].padStart(2, '0') + '-' + dm[2].padStart(2, '0'); parseResults.value.push('日期: ' + dm[1] + '月' + dm[2] + '日') }
  const daySection = text.split(/⭐月度数据|月度数据/)[0] || text
  const m1 = daySection.match(/本日新客户[:\s]*(\d+)/); if (m1) { form.newCustomers = parseInt(m1[1]) || 0; parseResults.value.push('新客户: ' + m1[1]) }
  const m2 = daySection.match(/有回复的客户[:\s]*(\d+)/); if (m2) { form.repliedCustomers = parseInt(m2[1]) || 0; parseResults.value.push('有回复: ' + m2[1]) }
  const m3 = daySection.match(/已登记客户[:\s]*(\d+)/); if (m3) { form.registeredCustomers = parseInt(m3[1]) || 0; parseResults.value.push('已登记: ' + m3[1]) }
  const m4 = daySection.match(/已拉群且有平面图[:\s]*(\d+)/); if (m4) { form.groupedWithPlan = parseInt(m4[1]) || 0; parseResults.value.push('拉群+平面图: ' + m4[1]) }
  const m5 = daySection.match(/来访客户[:\s]*(\d+)/); if (m5) { form.visitingCustomers = parseInt(m5[1]) || 0; parseResults.value.push('来访: ' + m5[1]) }
  const m6 = daySection.match(/成交客户[:\s]*(\d+)/); if (m6) { form.closedDeals = parseInt(m6[1]) || 0; parseResults.value.push('成交: ' + m6[1]) }
  const saLine = daySection.match(/拉群客户分配销售[:\s]*([^\n]*)/)
  if (saLine && saLine[1] && saLine[1].trim() !== '无') { const saRe = /([^\s,，、\d]+?)(\d+)个/g; let sm; while ((sm = saRe.exec(saLine[1])) !== null) { salesMap[sm[1]] = parseInt(sm[2]); parseResults.value.push('销售: ' + sm[1] + sm[2] + '个') } }
  pasteVisible.value = false; pasteInput.value = ''
  parseResults.value.length ? ElMessage.success('识别 ' + parseResults.value.length + ' 个字段') : ElMessage.warning('未识别到数据')
  nextTick(() => { if (salesTreeRef.value) salesTreeRef.value.setCheckedKeys(Object.keys(salesMap)) }); refreshMonthly()
}



// ====== 自动保存 ======
let autoSavePending = false
let autoSaveSkip = false
let autoSaveReady = false
let autoSaveTimer = null
function triggerAutoSave() {
  if (autoSaveSkip) return
  if (!autoSaveReady) return
  if (autoSavePending) return
  autoSavePending = true
  autoSaveTimer = setTimeout(() => {
    autoSavePending = false
    autoSaveTimer = null
    if (autoSaveSkip) return
    saveMsg.value = '自动保存中...'; saveOk.value = true
    saveData(true)
  }, 1000)
}

watch(
  () => JSON.stringify({
    nc: form.newCustomers, rc: form.repliedCustomers, reg: form.registeredCustomers,
    gp: form.groupedWithPlan, vc: form.visitingCustomers, cd: form.closedDeals,
    sa: selectedSales.value.map(s => s.name + ':' + s.count).join(','),
    cc: selectedCountries.value.map(c => c.country + ':' + c.count).join(','),
  }),
  () => { triggerAutoSave() }
)

onMounted(async () => { await loadSalesPersons(); await loadData(); setTimeout(() => { autoSaveReady = true }, 800) })
onUnmounted(() => { if (autoSaveTimer) clearTimeout(autoSaveTimer) })
</script>

<style scoped>
.cs-page { --c-bg:#f7f8fa;--c-card:#fff;--c-border:#eaecf0;--c-accent:#5b5fe3;--c-accent-light:#edeefc;--c-text:#1a1d2e;--c-soft:#6b7084;--c-muted:#9ba0b4;--c-good:#12b886;--c-bad:#e5484d;--r:14px;--rs:10px;max-width:1360px;margin:0 auto;padding-bottom:48px; }

/* Topbar */
.cs-topbar{display:flex;justify-content:space-between;align-items:center;padding:18px 0 14px;gap:12px;flex-wrap:wrap;}
.cs-top-left{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.cs-top-left h2{font-size:22px;font-weight:700;color:var(--c-text);display:flex;align-items:center;gap:10px;margin:0;letter-spacing:-.3px;}
.cs-icon-wrap{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:var(--c-accent-light);color:var(--c-accent);}
.cs-date-pick{width:148px;}.cs-account-sel{width:176px;}
.cs-badge{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:.2px;}
.cs-badge::before{content:'·';font-size:18px;line-height:0;}
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

/* Layout */
.cs-main{display:flex;gap:18px;align-items:flex-start;}
.cs-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:14px;}
.cs-right{width:480px;flex-shrink:0;position:sticky;top:18px;display:flex;flex-direction:column;gap:14px;}

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
.cs-ditem{display:flex;align-items:center;gap:10px;cursor:text;}
.cs-dnum{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:var(--c-accent-light);color:var(--c-accent);font-size:11px;font-weight:700;flex-shrink:0;}
.cs-dlabel{font-size:14px;font-weight:600;color:var(--c-soft);white-space:nowrap;width:80px;flex-shrink:0;}
.cs-dunit{font-size:12px;font-weight:500;color:var(--c-muted);}

/* Sales */

.cs-sales-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.cs-sales-cnt{font-size:12px;font-weight:600;color:var(--c-accent);margin-left:auto;}
/* 7-8 并排 */
.cs-bottom-row{display:flex;gap:16px;border-top:1px solid var(--c-accent-light);padding-top:14px;}
.cs-sales--half{flex:1;min-width:0;border-top:none;padding-top:0;}

.cs-sales-body{display:flex;gap:10px;}
.cs-sales-tree{width:180px;flex-shrink:0;border:1px solid var(--c-border);border-radius:var(--rs);padding:4px;background:var(--c-bg);max-height:200px;overflow-y:auto;}
.cs-sales-chips{flex:1;display:flex;flex-direction:column;gap:4px;}
/* Chip rows + stepper */
.cs-dinput{width:110px;}
.cs-dinput :deep(.el-input__wrapper){background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1.5px #d1d5db;padding:2px 10px;transition:all .15s;}
.cs-dinput :deep(.el-input__wrapper:hover){box-shadow:inset 0 0 0 2px var(--c-accent);}
.cs-dinput :deep(.el-input__wrapper.is-focus){box-shadow:inset 0 0 0 2.5px var(--c-accent)!important;}
.cs-dinput :deep(.el-input__inner){font-size:17px;font-weight:700;color:var(--c-text);height:38px;}

.cs-stepper{display:inline-flex;align-items:center;gap:0;border-radius:6px;overflow:hidden;border:1px solid var(--c-border);}
.cs-step-btn{width:24px;height:26px;border:none;background:#f9fafb;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--c-soft);cursor:pointer;transition:all .12s;padding:0;line-height:1;}
.cs-step-btn:hover{background:var(--c-accent-light);color:var(--c-accent);}
.cs-step-btn--plus{color:var(--c-good);}
.cs-step-btn--plus:hover{background:#ecfdf3;color:#0e6245;}
.cs-step-val{min-width:32px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--c-text);border:none;outline:none;background:#fff;padding:0 4px;font-family:inherit;}

.cs-chip-row{display:flex;align-items:center;gap:4px;flex-shrink:0;justify-content:space-between;width:100%;}
.cs-stepper{display:inline-flex;align-items:center;gap:0;border-radius:6px;overflow:hidden;border:1px solid var(--c-border);}

.cs-step-btn{
  width:28px;height:30px;border:none;background:#f9fafb;
  display:flex;align-items:center;justify-content:center;
  font-size:15px;font-weight:700;color:var(--c-soft);cursor:pointer;
  transition:all .12s;padding:0;line-height:1;
}
.cs-step-btn:hover{background:var(--c-accent-light);color:var(--c-accent);}
.cs-step-btn--plus{color:var(--c-good);}
.cs-step-btn--plus:hover{background:#ecfdf3;color:#0e6245;}


/* History */
.cs-ht{border:1px solid var(--c-border);border-radius:var(--rs);overflow:hidden;}
.cs-ht-row{display:grid;grid-template-columns:88px 1fr 1fr 1fr 1fr 1fr 1fr 150px;align-items:center;gap:6px;padding:13px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:600;color:var(--c-soft);}
.cs-ht-row--head{background:#f9fafb;font-size:12px;color:var(--c-muted);padding:9px 16px;letter-spacing:.2px;}
.cs-ht-row:not(.cs-ht-row--head){cursor:pointer;}
.cs-ht-row:nth-child(even):not(.cs-ht-row--head){background:#fcfcfd;}
.cs-ht-row:hover:not(.cs-ht-row--head){background:var(--c-accent-light);box-shadow:inset 3px 0 0 var(--c-accent);}
.cs-ht-row:last-of-type{border-bottom:none;}
.cs-ht-date{font-weight:700;color:var(--c-text);font-size:14px;display:flex;flex-direction:column;gap:0;}
.cs-ht-date i{font-style:normal;font-size:11px;font-weight:500;color:var(--c-muted);}
.cs-ht-v{font-size:16px;font-weight:700;color:var(--c-text);text-align:center;}
.cs-ht-s{font-size:12px;color:var(--c-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* Monthly */
.cs-mo-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;}
.cs-mo-cell{background:#f9fafb;border-radius:var(--rs);padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:2px;}
.cs-mo-cell b{font-size:26px;font-weight:800;color:var(--c-text);line-height:1.1;}
.cs-mo-cell span{font-size:11px;font-weight:600;color:var(--c-muted);letter-spacing:.3px;}
.cs-mo-sales{display:flex;flex-wrap:wrap;align-items:center;gap:5px;}
.cs-mo-sales-label{font-size:11px;color:var(--c-muted);font-weight:600;}
.cs-mo-sales-item{display:inline-flex;align-items:baseline;gap:2px;font-size:12px;font-weight:500;color:var(--c-soft);background:#f3f4f6;padding:2px 8px;border-radius:5px;}
.cs-mo-sales-item b{font-weight:700;color:var(--c-accent);}

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

.cs-empty{text-align:center;padding:24px;color:var(--c-muted);font-size:13px;}

.cs-chip-btn {
  width: 22px; height: 22px; border-radius: 5px;
  border: 1px solid var(--c-border); background: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: var(--c-soft);
  cursor: pointer; padding: 0; line-height: 1;
  transition: all .12s; user-select: none;
}
.cs-chip-btn:hover { background: var(--c-accent-light); color: var(--c-accent); border-color: var(--c-accent); }
.cs-chip-btn--plus { color: var(--c-good); border-color: #a7f3d0; }
.cs-chip-btn--plus:hover { background: #ecfdf3; color: #0e6245; border-color: var(--c-good); }

@media(max-width:960px){.cs-main{flex-direction:column;}.cs-right{width:100%;position:static;}.cs-daily-grid{grid-template-columns:1fr;}.cs-mo-grid{grid-template-columns:1fr 1fr;}}
</style>
