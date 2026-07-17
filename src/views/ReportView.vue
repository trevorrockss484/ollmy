<template>
  <div class="report-page">
    <!-- ====== 顶部栏 ====== -->
    <div class="top-bar">
      <div class="top-left">
        <h2><el-icon :size="24"><Edit /></el-icon> 每日汇报</h2>
        <el-date-picker v-model="reportDate" type="date" value-format="YYYY-MM-DD" size="default" style="width:148px;" />
        <el-select v-model="selectedAccountId" size="default" style="width:180px;" placeholder="选择广告账号" @change="onAccountChange">
          <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
        </el-select>
        <el-tag v-if="existingData" type="success" effect="dark" size="small" round>已有数据</el-tag>
        <el-tag v-else type="info" effect="plain" size="small" round>新日期</el-tag>
      </div>
      <div class="top-right">
        <span v-if="activeCountries.length" class="week-label">当前国家</span>
        <el-tag v-for="c in activeCountries" :key="c" size="small" effect="plain" round class="country-chip" closable @close="removeCountry(c)">{{ c }}</el-tag>
        <el-dropdown v-if="addableCountries.length" trigger="click" @command="addCountry">
          <el-tag size="small" effect="light" class="add-country-tag" style="cursor:pointer;border-style:dashed;color:#6366f1">+ 添加国家</el-tag>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="c in addableCountries" :key="c" :command="c">{{ c }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- ====== 操作栏 ====== -->
    <div class="action-bar">
      <el-button type="success" size="default" @click="copyReport" :disabled="!reportText"><el-icon :size="15"><DocumentCopy /></el-icon> 一键复制</el-button>
      <el-button size="default" @click="pasteVisible = true"><el-icon :size="15"><Files /></el-icon> 粘贴识别</el-button>
      <el-button size="default" @click="saveData"><el-icon :size="15"><Check /></el-icon> 保存</el-button>
      <el-button size="default" @click="clearForm" type="danger" plain><el-icon :size="15"><Delete /></el-icon> 清空</el-button>
      <span v-if="saveMsg" class="save-msg" :class="{ ok: saveOk, err: !saveOk }">{{ saveMsg }}</span>
    </div>

    <div class="main-layout" v-if="activeCountries.length">
      <!-- ====== 左侧：国家表单 + 总结优化 ====== -->
      <div class="left-panel">
        <!-- 一、海外整体汇总 -->
        <div class="overall-card">
          <div class="overall-title">
            <span class="overall-num">一</span> 海外整体汇总
            <span class="overall-auto">自动计算</span>
          </div>
          <div class="overall-grid">
            <div class="ov-item">
              <div class="ov-val">¥{{ fmtNum(overallTotal.budget) }}</div>
              <div class="ov-label">1. 总费用</div>
            </div>
            <div class="ov-item">
              <div class="ov-val">{{ overallTotal.newCustomer }}</div>
              <div class="ov-label">2. 总客资</div>
            </div>
            <div class="ov-item">
              <div class="ov-val">{{ overallTotal.grouped }}</div>
              <div class="ov-label">3. 总拉群</div>
            </div>
            <div class="ov-item">
              <div class="ov-val highlight">¥{{ overallTotal.avgCost > 0 ? overallTotal.avgCost.toFixed(1) : '—' }}</div>
              <div class="ov-label">4. 询盘客价</div>
            </div>
            <div class="ov-item">
              <div class="ov-val highlight">¥{{ overallTotal.effCost > 0 ? overallTotal.effCost.toFixed(1) : '—' }}</div>
              <div class="ov-label">5. 有效客价</div>
            </div>
          </div>
        </div>

        <!-- 3. 总拉群及客户详情（全局汇总） -->
        <div class="gd-global">
          <div class="gd-global-label">3. 总拉群及客户详情</div>
          <div class="gd-global-val">{{ overallTotal.groupCountSummary || '—' }}</div>
        </div>

        <!-- 二、每个国家明细 -->
        <div class="section-header">
          <span class="section-num">二</span> 每个国家明细
        </div>

        <div v-for="(c, i) in activeCountries" :key="c" class="country-card">
          <div class="cc-header">
            <div class="cc-header-left">
              <span class="cc-num">{{ i + 1 }}</span>
              <span class="cc-name">{{ c }}</span>
            </div>
            <el-button size="small" text type="danger" class="cc-remove-btn" @click="removeCountry(c)" :disabled="activeCountries.length <= 1">移除</el-button>
          </div>
          <div class="cc-body">
            <div class="cc-row">
              <div class="cc-field">
                <label>费用</label>
                <el-input-number v-model="countryData[c].budget" :min="0" :precision="2" :controls="false" placeholder="0" class="cc-input" />
                <span class="cc-unit">元</span>
              </div>
              <div class="cc-field">
                <label>客资</label>
                <el-input-number v-model="countryData[c].newCustomer" :min="0" :controls="false" placeholder="0" class="cc-input" />
                <span class="cc-unit">个</span>
              </div>
              <div class="cc-field">
                <label>拉群</label>
                <el-input-number v-model="countryData[c].grouped" :min="0" :controls="false" placeholder="0" class="cc-input" />
                <span class="cc-unit">个</span>
              </div>
              <div class="cc-field cc-computed">
                <label>询盘客价</label>
                <div class="cc-computed-val">{{ countryAvg(c) > 0 ? '¥' + countryAvg(c).toFixed(1) : '—' }}</div>
              </div>
              <div class="cc-field cc-computed">
                <label>有效客价</label>
                <div class="cc-computed-val">{{ countryEffCost(c) > 0 ? '¥' + countryEffCost(c).toFixed(1) : '—' }}</div>
              </div>
            </div>
            <div class="cc-gd">
              <label>
                总拉群及客户详情
                <el-button size="small" link type="primary" @click="openTemplate('groupDetail')"><el-icon :size="12"><DocumentCopy /></el-icon> 模版</el-button>
              </label>
              <el-input v-model="countryData[c].groupDetail" placeholder="【印度x3，平面图】【沙特x2，单品】" class="cc-gd-input" />
            </div>
          </div>
        </div>

        <!-- 7. 总结 & 8. 优化 -->
        <div class="section-header">
          <span class="section-num">7</span> 总结 & <span class="section-num">8</span> 优化
        </div>
        <div class="so-card">
          <div class="so-field">
            <label>
              <span class="so-num">7.</span> 总结
              <el-button size="small" link type="primary" @click="openTemplate('summary')"><el-icon :size="12"><DocumentCopy /></el-icon> 模版</el-button>
            </label>
            <el-input v-model="reportSummary" type="textarea" :rows="3" placeholder="继续去测试，调整高消耗无效广告，高预算跑东南亚，小预算跑非洲" />
          </div>
          <div class="so-field">
            <label>
              <span class="so-num">8.</span> 优化方向
              <el-button size="small" link type="primary" @click="openTemplate('optimize')"><el-icon :size="12"><DocumentCopy /></el-icon> 模版</el-button>
            </label>
            <el-input v-model="reportOptimize" placeholder="提高数量，调整客户精准度，减少无效客户" />
          </div>
        </div>
      </div>

      <!-- ====== 右侧：日报预览（固定） ====== -->
      <div class="right-panel">
        <div class="preview-sticky" v-if="reportText">
          <div class="preview-header">
            <span><el-icon :size="16"><Document /></el-icon> 日报预览</span>
            <el-button size="small" type="primary" link @click="copyReport">一键复制</el-button>
          </div>
          <div class="preview-content">{{ reportText }}</div>
        </div>
        <div v-else class="preview-empty">
          <el-icon :size="36"><Document /></el-icon>
          <p>填写数据后<br/>自动生成预览</p>
        </div>
      </div>
    </div>

    <!-- 无国家 -->
    <div v-else class="empty-state">
      <el-icon :size="40"><Warning /></el-icon>
      <p>暂无国家</p>
      <span>请在周计划设置国家，或点击上方「+ 添加国家」手动添加</span>
    </div>

    <!-- ====== 粘贴识别弹窗 ====== -->
    <el-dialog v-model="pasteVisible" title="粘贴识别" width="700px">
      <el-alert style="margin-bottom:12px;" title="粘贴之前生成的日报文字，系统自动识别所有字段" type="info" :closable="false" show-icon />
      <el-input v-model="pasteInput" type="textarea" :rows="14" placeholder="在此粘贴日报内容..." />
      <div v-if="parseDetail.length" style="margin-top:12px;background:#f0fdf4;border-radius:8px;padding:12px;">
        <div style="font-weight:600;color:#059669;margin-bottom:4px;"> 识别到以下字段：</div>
        <div v-for="d in parseDetail" :key="d" style="font-size:12px;color:#374151;">• {{ d }}</div>
      </div>
      <template #footer>
        <el-button @click="pasteVisible = false">取消</el-button>
        <el-button type="primary" @click="parsePasted"><el-icon :size="14"><Search /></el-icon> 识别并填入</el-button>
      </template>
    </el-dialog>

    <!-- ====== 模版弹窗 ====== -->
    <el-dialog v-model="templateVisible" :title="templateLabels[templateField]" width="620px">
      <el-tabs v-model="templateTab">
        <el-tab-pane label="预设模版" name="preset">
          <div v-if="!presetTemplates[templateField]?.length" style="color:#9ca3af;text-align:center;padding:20px;">暂无预设模版</div>
          <div v-for="(t, i) in presetTemplates[templateField]" :key="'p'+i" class="template-item" @click="pickTemplate(t)">
            <div class="template-content">{{ t }}</div>
            <el-button size="small" type="primary" link>使用</el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane label="我的模版" name="custom">
          <div v-if="!myTemplates[templateField]?.length" style="color:#9ca3af;text-align:center;padding:20px;">暂无自定义模版，在下方添加</div>
          <div v-for="(t, i) in myTemplates[templateField]" :key="'c'+i" class="template-item">
            <div class="template-content" style="flex:1;">{{ t }}</div>
            <el-button size="small" type="primary" link @click="pickTemplate(t)">使用</el-button>
            <el-button size="small" type="danger" link @click="delMyTemplate(i)">删除</el-button>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <el-input v-model="newTemplateText" placeholder="输入新模版内容..." size="small" style="flex:1;" />
            <el-button size="small" type="primary" @click="saveMyTemplate"><el-icon :size="13"><Check /></el-icon> 新增模版</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer><el-button @click="templateVisible = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWeekStore } from '../stores/week'
import { api, formatDateCN, todayStr } from '../api'

const weekStore = useWeekStore()

// 全量可选国家列表（与 PlanView 国家树一致）
const allCountries = [
  '印度尼西亚','越南','菲律宾','泰国','马来西亚','新加坡','缅甸','柬埔寨',
  '尼日利亚','埃塞俄比亚','南非','肯尼亚','加纳','埃及',
  '巴西','墨西哥','哥伦比亚','阿根廷',
  '阿联酋','沙特阿拉伯','土耳其','卡塔尔',
  '印度','巴基斯坦','孟加拉国',
  '日本','韩国',
  '美国','英国','德国','法国','澳大利亚','俄罗斯'
]

const activeCountries = ref([])
const addableCountries = computed(() => allCountries.filter(c => !activeCountries.value.includes(c)))

function addCountry(c) {
  if (!activeCountries.value.includes(c)) {
    activeCountries.value = [...activeCountries.value, c]
    if (!(c in countryData)) countryData[c] = defaultCountryFb()
  }
}

function removeCountry(c) {
  if (activeCountries.value.length <= 1) { ElMessage.warning('至少保留一个国家'); return }
  activeCountries.value = activeCountries.value.filter(x => x !== c)
  delete countryData[c]
}

const reportDate = ref(todayStr())
const saveMsg = ref('')
const saveOk = ref(true)
const existingData = ref(false)
const accounts = ref([
  { id: 'lisa-office', name: '莉莎办公家具' },
  { id: 'zhenshan-office', name: '甄珊办公家具' },
  { id: 'xiege-office', name: '谢哥办公家具' },
])
const selectedAccountId = ref('lisa-office')
const selectedAccount = computed(() => accounts.value.find(a => a.id === selectedAccountId.value) || accounts.value[0])

const defaultCountryFb = () => ({ budget:null, newCustomer:null, grouped:null, groupDetail:'', catNoReply:null, msgIgnore:null, lowBudget:null, competitor:null, harass:null, visitPending:null })
const countryData = reactive({})
const reportSummary = ref('')
const reportOptimize = ref('')

function initCountryData(countries) {
  // 基于周计划国家初始化 activeCountries（保留用户手动添加的）
  const base = new Set([...countries])
  for (const c of activeCountries.value) base.add(c)
  activeCountries.value = [...base]
  for (const c of activeCountries.value) {
    if (!(c in countryData)) countryData[c] = defaultCountryFb()
  }
  for (const k of Object.keys(countryData)) {
    if (!activeCountries.value.includes(k)) delete countryData[k]
  }
}

function resetFormData() {
  for (const c of Object.keys(countryData)) countryData[c] = defaultCountryFb()
  reportSummary.value = ''
  reportOptimize.value = ''
  existingData.value = false
}

function onAccountChange() {
  saveMsg.value = ''
  resetFormData()
  if (reportDate.value) loadExistingData(reportDate.value)
}

const weekReady = ref(false)
watch(() => weekStore.currentWeek?.countries, (countries) => {
  if (countries?.length) {
    initCountryData(countries)
    weekReady.value = true
    if (reportDate.value) loadExistingData(reportDate.value)
  }
}, { immediate: true })

const n = v => v ?? 0
function countryAvg(c) { const d = countryData[c]; if (!d) return 0; const b = n(d.budget), cu = n(d.newCustomer); return (b && cu) ? b / cu : 0 }
function countryEffCost(c) { const d = countryData[c]; if (!d) return 0; const b = n(d.budget), g = n(d.grouped); return (b && g) ? b / g : 0 }

const overallTotal = computed(() => {
  let budget = 0, newCustomer = 0, grouped = 0
  const gdParts = []
  const groupCountParts = []
  for (const c of activeCountries.value) {
    const d = countryData[c]; if (!d) continue
    budget += n(d.budget); newCustomer += n(d.newCustomer); grouped += n(d.grouped)
    if (d.groupDetail) gdParts.push(d.groupDetail)
    if (n(d.grouped) > 0) groupCountParts.push(c + '+' + n(d.grouped))
  }
  return { budget, newCustomer, grouped, avgCost: (budget && newCustomer) ? budget / newCustomer : 0, effCost: (budget && grouped) ? budget / grouped : 0, gdSummary: gdParts.join('；'), groupCountSummary: groupCountParts.join('  ') }
})

function fmtNum(v) { if (v == null) return '0.00'; const r = Math.round(v * 100) / 100; return r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

// ====== 模版 ======
const templateVisible = ref(false); const templateField = ref('summary'); const templateTab = ref('preset'); const newTemplateText = ref('')
const templateLabels = { groupDetail:'拉群详情模版', summary:'总结模版', optimize:'优化方向模版' }
const presetTemplates = {
  groupDetail: [
    '【尼日利亚x3，一个有平面图，其他单品】，【印尼x1，单品】，【越南x1，中间商】',
    '【印度x3，平面图x2，单品x1】，【尼日利亚x2，中间商】，【沙特x1，公司采购有平面图】',
  ],
  summary: [
    '平均客户单价12元一个，今天测试新素材，需要时间测试。高预算跑东南亚，小预算跑非洲',
    '今天整体量跑不出去，更换素材去测试。很多素材跑不出去，调整高消耗无效广告组',
    '今天整体效果量比之前多了，但无效偏多，东南亚地区效果也不好。调整细分定位，优化广告素材和落地页',
  ],
  optimize: [
    '提高询盘数量，调整客户精准度，减少无效客户，优化广告素材和落地页',
    '调整客户精准度，减少无效客户。优化广告素材，更换低CTR素材',
    '提高数量，调整细分定位，减少无效客户。测试新国家新素材，小预算测出效果再放量',
  ],
}
const MY_TEMPLATE_KEY = 'pan_templates'
const myTemplates = ref(loadMyTemplates())
function loadMyTemplates() { try { const raw = localStorage.getItem(MY_TEMPLATE_KEY); return raw ? JSON.parse(raw) : { groupDetail:[], summary:[], optimize:[] } } catch(e) { return { groupDetail:[], summary:[], optimize:[] } } }
function openTemplate(field) { templateField.value = field; templateTab.value = 'preset'; newTemplateText.value = ''; templateVisible.value = true }
function pickTemplate(text) {
  if (templateField.value === 'groupDetail') { for (const c of activeCountries.value) { if (c in countryData && !countryData[c].groupDetail) { countryData[c].groupDetail = text; break } } }
  else if (templateField.value === 'summary') reportSummary.value = text
  else if (templateField.value === 'optimize') reportOptimize.value = text
  templateVisible.value = false; ElMessage.success('模版已填入')
}
function saveMyTemplate() {
  const text = newTemplateText.value.trim(); if (!text) { ElMessage.warning('请输入模版内容'); return }
  const field = templateField.value; if (!myTemplates.value[field]) myTemplates.value[field] = []
  myTemplates.value[field].unshift(text)
  try { localStorage.setItem(MY_TEMPLATE_KEY, JSON.stringify(myTemplates.value)) } catch (e) { ElMessage.error('保存失败'); return }
  newTemplateText.value = ''; ElMessage.success('模版已保存')
}
function delMyTemplate(index) { const field = templateField.value; if (!myTemplates.value[field]) return; myTemplates.value[field].splice(index, 1); try { localStorage.setItem(MY_TEMPLATE_KEY, JSON.stringify(myTemplates.value)) } catch (e) { ElMessage.error('删除失败'); return } }

// ====== 数据加载 ======
async function loadExistingData(d) {
  if (!d || !weekReady.value) return
  const seq = ++loadSeq
  resetFormData()
  try {
    const res = await api.daily.get(d, { accountId: selectedAccountId.value }); if (seq !== loadSeq) return
    existingData.value = !!(res.success && res.data)
    if (res.success && res.data && res.data.countries) {
      // 把已存数据中的国家合并到 activeCountries
      const savedCountries = Object.keys(res.data.countries)
      for (const c of savedCountries) {
        if (!activeCountries.value.includes(c)) {
          activeCountries.value = [...activeCountries.value, c]
        }
        if (!(c in countryData)) countryData[c] = defaultCountryFb()
        const fb = res.data.countries[c]
        Object.keys(countryData[c]).forEach(k => { if (k in fb) countryData[c][k] = fb[k] ?? null })
      }
      reportSummary.value = res.data.summary || ''; reportOptimize.value = res.data.optimize || ''
    }
  } catch(e) { existingData.value = false }
}

const skipAutoLoad = ref(false); let loadSeq = 0
watch(reportDate, (d) => { if (!d) return; saveMsg.value = ''; if (skipAutoLoad.value) { skipAutoLoad.value = false; return }; loadExistingData(d) })

// ====== 生成日报（实时预览） ======
function splitDetails(text) {
  const t = (text || '').trim()
  if (!t) return []
  const m = t.match(/【[^】]*】/g)
  if (m && m.length) return m
  return ['【' + t + '】']
}

function buildReportText() {
  const ot = overallTotal.value
  const hasData = ot.budget > 0 || ot.newCustomer > 0 || ot.grouped > 0 || reportSummary.value || reportOptimize.value
  if (!hasData) return ''

  const parts = reportDate.value.split('-')
  const dateLabel = parseInt(parts[0]) + '.' + parseInt(parts[1]) + '.' + parseInt(parts[2])

  let text = `${dateLabel} 海外投流数据总结
账号：${selectedAccount.value?.name || '莉莎办公家具'}

一、今日海外整体汇总

1. 总费用：${fmtNum(ot.budget)}
2. 总客资：${ot.newCustomer}
3. 总拉群及客户详情：${ot.grouped}`
  if (ot.groupCountSummary) text += `\n▷\n（${ot.groupCountSummary}）\n▷`
  text += `
4. 询盘客价：${ot.avgCost > 0 ? ot.avgCost.toFixed(1) : '0'} 元
5. 有效客价：${ot.effCost > 0 ? ot.effCost.toFixed(1) : '0'} 元

二、每个国家明细
`
  activeCountries.value.forEach((c) => {
    const d = countryData[c]; if (!d) return
    const budget = n(d.budget), customer = n(d.newCustomer), grouped = n(d.grouped)
    const avg = (budget && customer) ? (budget / customer).toFixed(1) : '0'
    const eff = (budget && grouped) ? (budget / grouped).toFixed(1) : '0'
    const details = splitDetails(d.groupDetail)
    text += `
----------

▌${c}

1. 费用：${fmtNum(budget)} 元
2. 客资：${customer} 个
3. 总拉群及客户详情：${grouped} 个`
    if (details.length) text += `\n▷\n${details.join('\n')}\n▷`
    text += `
4. 询盘客价：${avg} / 元
5. 有效客价：${eff} / 元
`
  })
  text += `
----------`

  if (reportSummary.value || reportOptimize.value) {
    text += '\n'
    if (reportSummary.value) text += `\n7. 总结：${reportSummary.value}`
    if (reportOptimize.value) text += `\n8. 优化：${reportOptimize.value}`
  }
  return text
}

const reportText = computed(() => buildReportText())

async function copyReport() {
  if (!reportText.value) { ElMessage.warning('请先生成日报'); return }
  try { await navigator.clipboard.writeText(reportText.value); ElMessage.success('已复制到剪贴板') }
  catch {
    const ta = document.createElement('textarea'); ta.value = reportText.value; ta.style.position = 'fixed'; ta.style.left = '-9999px'
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ElMessage.success('已复制') } catch { ElMessage.error('复制失败') }
    document.body.removeChild(ta)
  }
}

async function saveData() {
  const date = reportDate.value; if (!date) { ElMessage.warning('请选择日期'); return }
  const countries = {}
  for (const c of activeCountries.value) {
    const d = countryData[c]; if (!d) continue
    countries[c] = { budget: n(d.budget), newCustomer: n(d.newCustomer), grouped: n(d.grouped), groupDetail: d.groupDetail || '', catNoReply: n(d.catNoReply), msgIgnore: n(d.msgIgnore), lowBudget: n(d.lowBudget), competitor: n(d.competitor), harass: n(d.harass), visitPending: n(d.visitPending) }
  }
  saveMsg.value = '保存中...'; saveOk.value = true
  try {
    const res = await api.daily.save(date, { countries, summary: reportSummary.value, optimize: reportOptimize.value }, { accountId: selectedAccountId.value })
    if (res.success) { saveMsg.value = ' 已保存'; saveOk.value = true; existingData.value = true }
    else { saveMsg.value = '❌ ' + (res.error||'未知错误'); saveOk.value = false }
  } catch(e) { saveMsg.value = '❌ ' + e.message; saveOk.value = false }
}

async function clearForm() {
  try { await ElMessageBox.confirm('确定清空表单？未保存的数据将丢失。', '确认清空', { confirmButtonText: '确认清空', cancelButtonText: '取消', type: 'warning' }) } catch { return }
  for (const c of activeCountries.value) { if (c in countryData) Object.keys(countryData[c]).forEach(k => { countryData[c][k] = (typeof countryData[c][k] === 'number' || countryData[c][k] === null) ? null : '' }) }
  reportSummary.value = ''; reportOptimize.value = ''; saveMsg.value = ''
  ElMessage.success('表单已清空')
}

// ====== 粘贴识别 ======
const pasteVisible = ref(false); const pasteInput = ref(''); const parseDetail = ref([])
function parsePasted() {
  parseDetail.value = []
  const rawText = pasteInput.value.trim(); if (!rawText) { ElMessage.warning('请先粘贴内容'); return }
  skipAutoLoad.value = true
  const text = rawText.replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/：/g,':').replace(/\t/g,' ').replace(/ /g,' ')
  const firstLine = text.split('\n')[0].trim()
  let dm = firstLine.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)
  if (!dm) dm = firstLine.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (dm) { reportDate.value = dm[1] + '-' + dm[2].padStart(2,'0') + '-' + dm[3].padStart(2,'0'); parseDetail.value.push('日期: ' + formatDateCN(reportDate.value)) }
  for (const c of activeCountries.value) {
    if (!(c in countryData)) continue
    const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const blockNew = new RegExp('▌\\s*' + escaped + '[\\s\\S]*?(?=\\n-{3,}|\\n▌|\\n7[\\.、]|$)', 'i')
    const blockOld = new RegExp('\\d+[\\.、]\\s*' + escaped + '[\\s\\S]*?(?=\\n\\d+[\\.、]|\\n7[\\.、]|\\n二、|$)', 'i')
    const bm = text.match(blockNew) || text.match(blockOld)
    if (bm) {
      const b = bm[0]
      const feeM = b.match(/费用\s*[:]\s*(\d+\.?\d*)\s*元?/i); if (feeM) { countryData[c].budget = parseFloat(feeM[1])||0; parseDetail.value.push(c+' 费用: '+feeM[1]) }
      const custM = b.match(/客资\s*[:]\s*(\d+\.?\d*)\s*个?/i); if (custM) { countryData[c].newCustomer = parseFloat(custM[1])||0; parseDetail.value.push(c+' 客资: '+custM[1]) }
      const grpM = b.match(/总拉群及客户详情\s*[:]\s*(\d+\.?\d*)/i)
      if (grpM) { countryData[c].grouped = parseFloat(grpM[1])||0; parseDetail.value.push(c+' 拉群: '+grpM[1]) }
      const detailM = b.match(/【[^】]*】/g); if (detailM) countryData[c].groupDetail = detailM.join('')
    }
  }
  const summM = text.match(/7[\\.、]?\\s*总结\\s*[:]([\\s\\S]*?)(?=\\n8[\\.、]|$)/i); if (summM) { reportSummary.value = summM[1].trim(); parseDetail.value.push('总结已识别') }
  const optM = text.match(/8[\\.、]?\\s*优化\\s*[:]([\\s\\S]*?)$/i); if (optM) { reportOptimize.value = optM[1].trim(); parseDetail.value.push('优化已识别') }
  pasteVisible.value = false
  parseDetail.value.length ? ElMessage.success('识别 '+parseDetail.value.length+' 个字段') : ElMessage.warning('未识别到数据')
}

onMounted(async () => {
  if (!weekStore.currentWeek) await weekStore.load()
  const t = sessionStorage.getItem('targetDate'); if (t) { reportDate.value = t; sessionStorage.removeItem('targetDate') }
  const e = sessionStorage.getItem('editDaily')
  if (e) {
    try {
      const { date, data: d } = JSON.parse(e); reportDate.value = date
      if (d.countries) { for (const [c, fb] of Object.entries(d.countries)) { if (c in countryData) Object.keys(countryData[c]).forEach(k => { if (k in fb) countryData[c][k] = fb[k] ?? null }) }; reportSummary.value = d.summary || ''; reportOptimize.value = d.optimize || '' }
    } catch {}
    sessionStorage.removeItem('editDaily')
  }
})
</script>

<style scoped>
.report-page { animation: fadeIn .3s ease; max-width: 1300px; margin: 0 auto; padding-bottom: 40px; }
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

/* ====== 顶部 ====== */
.top-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 24px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
.top-left { display: flex; align-items: center; gap: 14px; }
.top-left h2 { font-size: 20px; font-weight: 700; margin: 0; white-space: nowrap; }
.top-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.week-label { font-size: 12px; font-weight: 600; color: #6b7280; }
.country-chip { font-weight: 600; }

/* ====== 操作栏 ====== */
.action-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 20px; margin-bottom: 16px; }
.save-msg { font-size: 12px; font-weight: 600; margin-left: 8px; }
.save-msg.ok { color: #059669; }
.save-msg.err { color: #ef4444; }

/* ====== 布局 ====== */
.main-layout { display: flex; gap: 20px; align-items: flex-start; }
.left-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.right-panel { width: 380px; flex-shrink: 0; }

/* ====== 整体汇总卡片 ====== */
.overall-card {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border-radius: 14px; padding: 20px 24px; color: #fff;
  box-shadow: 0 4px 14px rgba(99,102,241,.25);
}
.overall-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.overall-num { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,.2); font-size: 14px; }
.overall-auto { font-size: 11px; font-weight: 400; opacity: .6; background: rgba(255,255,255,.12); padding: 2px 8px; border-radius: 10px; }
.overall-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.ov-item { background: rgba(255,255,255,.1); border-radius: 10px; padding: 10px 14px; flex: 1; min-width: 90px; text-align: center; backdrop-filter: blur(4px); }
.ov-val { font-size: 20px; font-weight: 800; }
.ov-val.highlight { color: #c7d2fe; }
.ov-label { font-size: 11px; opacity: .65; margin-top: 2px; }
/* 拉群全局 */
.gd-global { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 12px; }
.gd-global-label { font-size: 13px; font-weight: 700; color: #374151; white-space: nowrap; min-width: 120px; }
.gd-global-val { font-size: 13px; color: #6b7280; line-height: 1.6; }

/* ====== 区块标题 ====== */
.section-header { font-size: 16px; font-weight: 700; color: #1f2937; padding: 8px 0 4px; display: flex; align-items: center; gap: 10px; }
.section-num { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #eef2ff; color: #6366f1; font-size: 14px; }

/* ====== 国家卡片 ====== */
.country-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; transition: border-color .2s; }
.country-card:hover { border-color: #c7d2fe; }
.cc-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid #f3f4f6; }
.cc-header-left { display: flex; align-items: center; gap: 10px; }
.cc-num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: #6366f1; color: #fff; font-size: 12px; font-weight: 700; }
.cc-name { font-size: 15px; font-weight: 700; color: #1f2937; }
.cc-remove-btn { flex-shrink:0; font-size:12px; padding:2px 8px; opacity:.6; }
.cc-remove-btn:hover { opacity:1; }
.add-country-tag { transition: all .2s; }
.add-country-tag:hover { background:#eef2ff; border-color:#818cf8; }
.cc-body { padding: 16px 18px; }
.cc-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.cc-field { flex: 1; min-width: 100px; }
.cc-field label { display: block; font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 4px; }
.cc-input { width: 100%; }
.cc-input :deep(.el-input__wrapper) { background: #f9fafb; border-radius: 8px; box-shadow: none; padding: 2px 10px; }
.cc-input :deep(.el-input__inner) { font-size: 18px; font-weight: 700; color: #1f2937; height: 36px; }
.cc-unit { font-size: 11px; color: #9ca3af; margin-left: 4px; }
.cc-field.cc-computed { background: #f5f3ff; border-radius: 8px; padding: 6px 10px; }
.cc-computed-val { font-size: 18px; font-weight: 700; color: #6366f1; height: 36px; display: flex; align-items: center; }
.cc-gd label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
.cc-gd-input :deep(.el-input__wrapper) { border-radius: 8px; }
.cc-gd-input :deep(.el-input__inner) { font-size: 13px; }

/* ====== 总结优化 ====== */
.so-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; }
.so-field { margin-bottom: 16px; }
.so-field:last-child { margin-bottom: 0; }
.so-field label { display: block; font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
.so-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: #fef2f2; color: #ef4444; font-size: 12px; margin-right: 4px; }

/* ====== 预览（右侧固定） ====== */
.preview-sticky { position: sticky; top: 16px; background: #fff; border: 2px solid #6366f1; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(99,102,241,.1); }
.preview-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #f5f3ff; border-bottom: 1px solid #e0e7ff; font-weight: 700; font-size: 14px; }
.preview-content { white-space: pre-wrap; line-height: 1.9; font-size: 13px; padding: 16px 18px; color: #1f2937; max-height: calc(100vh - 180px); overflow-y: auto; }
.preview-empty { text-align: center; padding: 60px 20px; color: #9ca3af; background: #fff; border: 1px dashed #e5e7eb; border-radius: 14px; position: sticky; top: 16px; }
.preview-empty p { margin: 10px 0 0; font-size: 14px; line-height: 1.6; }

/* ====== 空状态 ====== */
.empty-state { text-align: center; padding: 80px 20px; color: #9ca3af; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
.empty-state p { font-size: 16px; font-weight: 600; margin: 12px 0 4px; color: #6b7280; }
.empty-state span { font-size: 13px; }

/* ====== 模版弹窗 ====== */
.template-item { display:flex; align-items:center; gap:10px; padding:10px 12px; margin-bottom:6px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer; transition:all 0.2s; }
.template-item:hover { border-color:#6366f1; background:#eef2ff; }
.template-content { flex:1; font-size:12px; color:#374151; line-height:1.6; }

@media (max-width: 960px) { .main-layout { flex-direction: column; } .right-panel { width: 100%; } .preview-sticky { position: static; } }
</style>
