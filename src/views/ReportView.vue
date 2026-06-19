<template>
  <div class="report-page">
    <div class="page-header">
      <h2>📝 日报生成</h2>
      <p class="sub">填写数据 → 生成日报 → 一键复制 <span style="color:#6366f1;">| 支持粘贴历史日报自动识别</span></p>
    </div>

    <!-- FB + TX 双栏 -->
    <el-row :gutter="16" style="margin-bottom:16px;">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span style="font-weight:700;">📊 FB & IG 投流数据</span></template>
          <el-form label-position="top" size="default">
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="消耗预算(元)">
                  <el-input-number v-model="fb.budget" :min="0" :precision="2" :placeholder="'输入'" style="width:100%" controls-position="right" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="新客户(个)">
                  <el-input-number v-model="fb.newCustomer" :min="0" :placeholder="'输入'" style="width:100%" controls-position="right" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="平均单价(元)">
                  <div class="avg-cost-display" :class="{ highlight: fbAvg > 0 }">¥{{ fbAvg > 0 ? fbAvg.toFixed(1) : '—' }}</div>
                  <div style="font-size:10px;color:#9ca3af;">自动计算</div>
                </el-form-item>
              </el-col>
              <el-col :span="8"><el-form-item label="1.发目录未回"><el-input-number v-model="fb.catNoReply" :min="0" :placeholder="'输入'" style="width:100%" controls-position="right" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="2.发信息未理会"><el-input-number v-model="fb.msgIgnore" :min="0" :placeholder="'输入'" style="width:100%" controls-position="right" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="3.已拉群"><el-input-number v-model="fb.grouped" :min="0" :placeholder="'输入'" style="width:100%" controls-position="right" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="4.低预算"><el-input-number v-model="fb.lowBudget" :min="0" :placeholder="'输入'" style="width:100%" controls-position="right" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="5.同行"><el-input-number v-model="fb.competitor" :min="0" :placeholder="'输入'" style="width:100%" controls-position="right" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="6.骚扰"><el-input-number v-model="fb.harass" :min="0" :placeholder="'输入'" style="width:100%" controls-position="right" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="7.参观未定"><el-input-number v-model="fb.visitPending" :min="0" :placeholder="'输入'" style="width:100%" controls-position="right" /></el-form-item></el-col>
              <el-col :span="16">
                <el-form-item>
                  <template #label><span>拉群详情</span><el-button size="small" link type="primary" style="margin-left:8px;" @click="openTemplate('groupDetail')">📋 模版</el-button></template>
                  <el-input v-model="fb.groupDetail" placeholder="【尼日利亚x3，一个有平面图，其他单品】【印尼x1，单品】【越南x1，中间商】" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item>
                  <template #label><span>总结</span><el-button size="small" link type="primary" style="margin-left:8px;" @click="openTemplate('summary')">📋 模版</el-button></template>
                  <el-input v-model="fb.summary" type="textarea" :rows="2" placeholder="继续去测试，调整高消耗无效广告，高预算跑东南亚，小预算跑非洲" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item>
                  <template #label><span>优化方向</span><el-button size="small" link type="primary" style="margin-left:8px;" @click="openTemplate('optimize')">📋 模版</el-button></template>
                  <el-input v-model="fb.optimize" placeholder="提高数量，调整客户精准度，减少无效客户" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span style="font-weight:700;">📊 腾讯广告投流数据</span></template>
          <el-form label-position="top" size="default">
            <el-row :gutter="12">
              <el-col :span="8"><el-form-item label="消耗预算(元)"><el-input-number v-model="tx.budget" :min="0" :precision="2" :placeholder="'输入'" style="width:100%" controls-position="right" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="新客户(个)"><el-input-number v-model="tx.newCustomer" :min="0" :placeholder="'输入'" style="width:100%" controls-position="right" /></el-form-item></el-col>
              <el-col :span="8">
                <el-form-item label="平均有效成本(元)">
                  <div class="avg-cost-display" :class="{ highlight: txAvg > 0 }">¥{{ txAvg > 0 ? txAvg.toFixed(1) : '—' }}</div>
                  <div style="font-size:10px;color:#9ca3af;">自动计算</div>
                </el-form-item>
              </el-col>
              <el-col :span="8"><el-form-item label="有效客户(个)"><el-input-number v-model="tx.effective" :min="0" :placeholder="'输入'" style="width:100%" controls-position="right" /></el-form-item></el-col>
              <el-col :span="16">
                <el-form-item>
                  <template #label><span>TX总结</span><el-button size="small" link type="primary" style="margin-left:8px;" @click="openTemplate('txSummary')">📋 模版</el-button></template>
                  <el-input v-model="tx.summary" type="textarea" :rows="5" placeholder="今天来的8个都是填写表单的客户，一个添加微信办公室需要家具，其他打不通" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 工作内容 -->
    <el-card shadow="never" style="margin-bottom:16px;">
      <template #header><span style="font-weight:700;">📋 工作内容</span></template>
      <el-row :gutter="12">
        <el-col :span="8"><el-form-item label="今日工作"><el-input v-model="work.today" type="textarea" :rows="3" placeholder="发布4个账号作品，调整投流计划..." /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="第二天工作"><el-input v-model="work.tomorrow" type="textarea" :rows="3" placeholder="监控投流" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="每日工作(常规)"><el-input v-model="work.daily" type="textarea" :rows="3" placeholder="日常账号维护，提升客户精准度..."/></el-form-item></el-col>
      </el-row>
    </el-card>

    <!-- 操作栏 -->
    <el-card shadow="never" style="margin-bottom:16px;">
      <el-form :inline="true" size="default">
        <el-form-item label="日期"><el-date-picker v-model="reportDate" type="date" value-format="YYYY-MM-DD" style="width:150px" /></el-form-item>
        <el-form-item label="国家">
          <el-select v-model="reportCountry" style="width:130px">
            <el-option v-for="c in countries" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="generateReport">🔄 生成日报</el-button>
          <el-button type="success" @click="copyReport" :disabled="!reportText">📋 一键复制</el-button>
          <el-button @click="pasteVisible = true">📥 粘贴识别</el-button>
          <el-button @click="saveData">💾 保存数据</el-button>
          <el-button @click="clearForm" type="danger" plain>🗑 清空表单</el-button>
        </el-form-item>
      </el-form>
      <div v-if="saveMsg" style="margin-top:8px;font-size:12px;" :style="{color:saveOk?'#10b981':'#ef4444'}">{{ saveMsg }}</div>
    </el-card>

    <!-- 日报预览 -->
    <el-card v-if="reportText" shadow="never" style="margin-bottom:16px;">
      <template #header>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-weight:700;">📄 日报预览</span>
          <span style="font-size:12px;color:#9ca3af;">一键复制 → 直接粘贴使用</span>
        </div>
      </template>
      <div class="report-preview">{{ reportText }}</div>
    </el-card>

    <!-- 粘贴识别弹窗 -->
    <el-dialog v-model="pasteVisible" title="📥 粘贴识别" width="700px">
      <el-alert style="margin-bottom:12px;" title="粘贴之前生成的日报文字，系统自动识别所有字段" type="info" :closable="false" show-icon />
      <el-input v-model="pasteInput" type="textarea" :rows="14" placeholder="在此粘贴日报内容..." />
      <div v-if="parseDetail.length" style="margin-top:12px;background:#f0fdf4;border-radius:8px;padding:12px;">
        <div style="font-weight:600;color:#059669;margin-bottom:4px;">✅ 识别到以下字段：</div>
        <div v-for="d in parseDetail" :key="d" style="font-size:12px;color:#374151;">• {{ d }}</div>
      </div>
      <template #footer>
        <el-button @click="pasteVisible = false">取消</el-button>
        <el-button type="primary" @click="parsePasted">🔍 识别并填入</el-button>
      </template>
    </el-dialog>

    <!-- 模版弹窗 -->
    <el-dialog v-model="templateVisible" :title="'📋 ' + templateLabels[templateField]" width="620px">
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
        </el-tab-pane>
      </el-tabs>
      <div style="margin-top:16px;display:flex;gap:8px;">
        <el-input v-model="newTemplateText" placeholder="输入新模版内容..." size="small" style="flex:1;" />
        <el-button size="small" type="primary" @click="saveMyTemplate">💾 保存为我的模版</el-button>
      </div>
      <template #footer><el-button @click="templateVisible = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useWeekStore } from '../stores/week'
import { api, formatDateCN, todayStr } from '../api'

const countries = ['综合','印度尼西亚','越南','埃塞俄比亚','尼日利亚','南非']
const reportDate = ref(todayStr())
const reportCountry = ref('综合')

// 将日期对齐到当前周的年份
function alignToCurrentWeekYear(dateStr) {
  const ws = useWeekStore()
  if (!ws.currentWeek) return dateStr
  const weekYear = parseInt(ws.currentWeek.startDate.substring(0,4))
  const parts = dateStr.split('-')
  // 如果年份已经是周年份，不用改
  if (parseInt(parts[0]) === weekYear) return dateStr
  const candidate = weekYear + '-' + parts[1] + '-' + parts[2]
  // 只有在周范围内才改
  if (candidate >= ws.currentWeek.startDate && candidate <= ws.currentWeek.endDate) {
    return candidate
  }
  return dateStr
}
const reportText = ref('')
const saveMsg = ref('')
const saveOk = ref(true)
const existingData = ref(false)

// null=未填, 填入后会变成数字; 保存/生成时 null→0
const fb = reactive({ budget:null, newCustomer:null, catNoReply:null, msgIgnore:null, grouped:null, lowBudget:null, competitor:null, harass:null, visitPending:null, groupDetail:'', summary:'', optimize:'' })
const tx = reactive({ budget:null, newCustomer:null, effective:null, summary:'' })
const work = reactive({ today:'', tomorrow:'', daily:'' })

// 辅助：取值时 null→0
const n = v => v ?? 0

// 自动计算
const fbAvg = computed(() => {
  const budget = n(fb.budget), customer = n(fb.newCustomer)
  if (!budget || !customer) return 0
  return budget / customer
})
const txAvg = computed(() => {
  const budget = n(tx.budget), effective = n(tx.effective)
  if (!budget || !effective) return 0
  return budget / effective
})

const pasteVisible = ref(false)
const pasteInput = ref('')
const parseDetail = ref([])

// ====== 模版系统 ======
const templateVisible = ref(false)
const templateField = ref('summary')
const templateTab = ref('preset')
const newTemplateText = ref('')
const templateLabels = { groupDetail:'拉群详情模版', summary:'总结模版', optimize:'优化方向模版', txSummary:'TX总结模版' }

const presetTemplates = {
  groupDetail: [
    '【尼日利亚x3，一个有平面图，其他单品】，【印尼x1，单品】，【越南x1，中间商】',
    '【尼日利亚x2，都是单品】，【印尼x2，一个大项目】，【埃塞俄比亚x1，批发商】',
    '【越南x3，两个中间商一个工厂】，【南非x2，零售客户】',
    '【印尼x1，工程项目】，【尼日利亚x1，批发采购商】',
    '【菲律宾x2，中间商】，【泰国x1，工厂采购】'
  ],
  summary: [
    '平均客户单价'+fbAvg.value.toFixed(1)+'元一个，继续去测试新素材，调整高消耗无效广告组，高预算重点跑东南亚，小预算测试非洲市场',
    '今日东南亚投放效果较好，印尼越南客户质量偏高，非洲市场尼日利亚询盘量上升持续观察',
    '调整广告出价后客户成本下降，继续优化。减少低效广告预算，加大高转化地区投放力度',
    '今天整体效果不错，新客户数量达标。部分素材CTR偏低需要更换，明日测试新创意方向',
    '东南亚市场稳定投放，非洲市场测试阶段。尼日利亚询盘质量提升，埃塞俄比亚广告展示偏低需调整'
  ],
  optimize: [
    '提高询盘数量，调整客户精准度，减少无效客户，优化广告素材和落地页',
    '重点优化东南亚高转化市场，逐步加大非洲预算测试，持续AB测试广告创意',
    '降低客单价，提高广告CTR，优化表单内容减少无效填写，跟进老客户转化',
    '增加视频素材占比，定向优化高消费力人群，排除非目标国家流量',
    '提升广告相关性得分，调整出价策略控制成本，每日筛选无效关键词'
  ],
  txSummary: [
    '今天来的8个都是填写表单的客户，一个添加微信办公室需要家具，其他打不通',
    '今天表单客户质量一般，部分客户联系不上，需要优化表单筛选机制',
    '腾讯广告客户偏少，成本偏高，建议调整投放时段和目标人群',
    '今天客户转化较好，有效客户占比提升，继续保持当前投放策略',
    '部分客户电话不通，建议增加微信和WhatsApp联系方式，提高触达率'
  ]
}

const MY_TEMPLATE_KEY = 'pan_templates'
const myTemplates = ref(loadMyTemplates())
function loadMyTemplates() {
  try {
    const raw = localStorage.getItem(MY_TEMPLATE_KEY)
    return raw ? JSON.parse(raw) : { groupDetail:[], summary:[], optimize:[], txSummary:[] }
  } catch(e) { return { groupDetail:[], summary:[], optimize:[], txSummary:[] } }
}

function openTemplate(field) {
  templateField.value = field
  templateTab.value = 'preset'
  newTemplateText.value = ''
  templateVisible.value = true
}

function pickTemplate(text) {
  if (templateField.value === 'groupDetail') fb.groupDetail = text
  else if (templateField.value === 'summary') fb.summary = text
  else if (templateField.value === 'optimize') fb.optimize = text
  else if (templateField.value === 'txSummary') tx.summary = text
  templateVisible.value = false
  ElMessage.success('模版已填入')
}

function saveMyTemplate() {
  const text = newTemplateText.value.trim()
  if (!text) { ElMessage.warning('请输入模版内容'); return }
  if (!myTemplates.value[templateField.value]) myTemplates.value[templateField.value] = []
  myTemplates.value[templateField.value].unshift(text)
  localStorage.setItem(MY_TEMPLATE_KEY, JSON.stringify(myTemplates.value))
  newTemplateText.value = ''
  templateTab.value = 'custom'
  ElMessage.success('模版已保存')
}

function delMyTemplate(index) {
  myTemplates.value[templateField.value].splice(index, 1)
  localStorage.setItem(MY_TEMPLATE_KEY, JSON.stringify(myTemplates.value))
  ElMessage.success('已删除')
}

// ====== 监听日期变化，检测已有数据 ======
const skipAutoLoad = ref(false)
let loadSeq = 0 // 防止异步竞态：新请求覆盖旧结果
watch(reportDate, async (d) => {
  if (!d) return
  saveMsg.value = ''
  if (skipAutoLoad.value) { skipAutoLoad.value = false; return }
  const seq = ++loadSeq
  try {
    const res = await api.daily.get(d)
    // 竞态检查：如果loadSeq已变，说明日期又变了，丢弃本次结果
    if (seq !== loadSeq) return
    existingData.value = !!(res.success && res.data)
    if (res.success && res.data) {
      const payload = res.data
      reportCountry.value = payload.country || '综合'
      if (payload.fb) Object.keys(fb).forEach(k => { if (k in payload.fb) fb[k] = payload.fb[k] ?? null })
      if (payload.tx) Object.keys(tx).forEach(k => { if (k in payload.tx) tx[k] = payload.tx[k] ?? null })
      if (payload.work) Object.keys(work).forEach(k => { if (k in payload.work) work[k] = payload.work[k] })
    }
  } catch(e) { existingData.value = false }
}, { immediate: true })

// ====== 生成日报 ======
function generateReport() {
  const fbAvgVal = fbAvg.value > 0 ? fbAvg.value.toFixed(1) : '—'
  const txAvgVal = txAvg.value > 0 ? txAvg.value.toFixed(1) : '—'
  const gd = fb.groupDetail ? '3.已拉群：' + n(fb.grouped) + '个（' + fb.groupDetail + '）' : '3.已拉群：' + n(fb.grouped) + '个'

  reportText.value = `${formatDateCN(reportDate.value)}

FB IG 投流数据总结：
本日消耗预算：${n(fb.budget)}元
本日新客户：${n(fb.newCustomer)}个
平均客户单价：${fbAvgVal}元
1.发目录未回：${n(fb.catNoReply)}个
2.发信息未理会：${n(fb.msgIgnore)}个
${gd}
4.低预算：${n(fb.lowBudget)}
5.同行：${n(fb.competitor)}
6.骚扰：${n(fb.harass)}
7计划参观未定：${n(fb.visitPending)}
${fb.summary ? '\n总结：\n' + fb.summary : ''}
${fb.optimize ? '\n优化方向：' + fb.optimize : ''}
—————————
腾讯广告投流数据总结
本日消耗预算：${n(tx.budget)}元
本日新客户：${n(tx.newCustomer)}个
有效客户：${n(tx.effective)}个
平均有效成本：${txAvgVal}元
${tx.summary ? '\n总结：' + tx.summary : ''}
—————————
${work.today ? '\n今日工作，\n' + work.today : ''}
${work.tomorrow ? '\n第二天工作\n' + work.tomorrow : ''}
${work.daily ? '\n每日工作，\n' + work.daily : ''}`
}

async function copyReport() {
  await navigator.clipboard.writeText(reportText.value)
  ElMessage.success('已复制到剪贴板')
}

// ====== 保存 ======
async function saveData() {
  // 保存前对齐周年份，防跨年保存
  reportDate.value = alignToCurrentWeekYear(reportDate.value)
  const date = reportDate.value
  if (!date) { ElMessage.warning('请选择日期'); return }
  const data = {
    country: reportCountry.value,
    fb: { budget:n(fb.budget), newCustomer:n(fb.newCustomer), catNoReply:n(fb.catNoReply), msgIgnore:n(fb.msgIgnore), grouped:n(fb.grouped), lowBudget:n(fb.lowBudget), competitor:n(fb.competitor), harass:n(fb.harass), visitPending:n(fb.visitPending), groupDetail:fb.groupDetail, summary:fb.summary, optimize:fb.optimize },
    tx: { budget:n(tx.budget), newCustomer:n(tx.newCustomer), effective:n(tx.effective), summary:tx.summary },
    work: { today:work.today, tomorrow:work.tomorrow, daily:work.daily }
  }
  saveMsg.value = '保存中...'; saveOk.value = true
  try {
    const res = await api.daily.save(date, data)
    if (res.success) {
      saveMsg.value = '✅ 已保存到 ' + formatDateCN(date) + ' | 可在"历史查询"和"周计划"页面查看'
      saveOk.value = true; existingData.value = true
    } else { saveMsg.value = '❌ 保存失败: ' + (res.error||'未知错误'); saveOk.value = false }
  } catch(e) { saveMsg.value = '❌ 网络错误: ' + e.message; saveOk.value = false }
}

function clearForm() {
  Object.keys(fb).forEach(k => { fb[k] = (typeof fb[k] === 'number' || fb[k] === null) ? null : '' })
  Object.keys(tx).forEach(k => { tx[k] = (typeof tx[k] === 'number' || tx[k] === null) ? null : '' })
  Object.keys(work).forEach(k => { work[k] = '' })
  reportText.value = ''
  saveMsg.value = ''
  ElMessage.success('表单已清空')
}

// ====== 加载已存 ======
async function loadExisting() {
  const date = reportDate.value
  try {
    const res = await api.daily.get(date)
    if (res.success && res.data) {
      const d = res.data
      reportCountry.value = d.country||'综合'
      if (d.fb) Object.keys(fb).forEach(k => { if (k in d.fb) fb[k] = d.fb[k] ?? null })
      if (d.tx) Object.keys(tx).forEach(k => { if (k in d.tx) tx[k] = d.tx[k] ?? null })
      if (d.work) Object.keys(work).forEach(k => { if (k in d.work) work[k] = d.work[k] })
      ElMessage.success('已加载 ' + formatDateCN(date) + ' 数据')
    } else { ElMessage.warning(formatDateCN(date) + ' 暂无数据') }
  } catch(e) { ElMessage.error('加载失败') }
}

// ====== 粘贴识别 ======
function parsePasted() {
  const rawText = pasteInput.value.trim()
  if (!rawText) { ElMessage.warning('请先粘贴内容'); return }
  skipAutoLoad.value = true  // paste 不改日期不触发原数据覆盖
  const text = rawText.replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/：/g,':').replace(/\t/g,' ').replace(/ /g,' ')
  parseDetail.value = []

  // 日期
  const firstLine = text.split('\n')[0].trim()
  let dm = firstLine.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (!dm) dm = firstLine.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (!dm) dm = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (dm) {
    if (dm.length===4) reportDate.value = dm[1]+'-'+dm[2].padStart(2,'0')+'-'+dm[3].padStart(2,'0')
    else if (dm.length===3) {
      const m=parseInt(dm[1]), d=parseInt(dm[2])
      // 始终用当前周计划的年份，确保数据落在当前周
      const ws=useWeekStore()
      const y = ws.currentWeek ? parseInt(ws.currentWeek.startDate.substring(0,4)) : new Date().getFullYear()
      reportDate.value = y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')
    }
    parseDetail.value.push('日期: '+formatDateCN(reportDate.value))
  }

  const parts = text.split(/腾讯广告投流数据总结/), fbSec = parts[0]||'', txSec = parts[1]||''
  const fbFields = [['budget','本日消耗预算'],['newCustomer','本日新客户'],['catNoReply','1[\\.、]?\\s*发目录未回'],['msgIgnore','2[\\.、]?\\s*发信息未理会'],['grouped','3[\\.、]?\\s*已拉群'],['lowBudget','4[\\.、]?\\s*低预算'],['competitor','5[\\.、]?\\s*同行'],['harass','6[\\.、]?\\s*骚扰'],['visitPending','7[\\.、]?\\s*(计划)?参观未定']]
  for (const [key,label] of fbFields) {
    const m = fbSec.match(new RegExp(label+'\\s*[:]\\s*(\\d+\\.?\\d*)','i'))
    if (m) { fb[key] = parseFloat(m[1])||0; parseDetail.value.push('FB '+key+': '+m[1]) }
  }
  const gdM = fbSec.match(/已拉群\s*[:]\s*\d+\s*个?\s*[（(]([^)）]+)[)）]/)
  if (gdM) { fb.groupDetail = gdM[1].trim(); parseDetail.value.push('拉群详情: '+fb.groupDetail.substring(0,30)) }
  fb.summary = extractBetween(fbSec, /(?<!投流数据)总结\s*[:]/)
  if (fb.summary) parseDetail.value.push('FB总结: '+fb.summary.substring(0,25)+'...')
  const optM = fbSec.match(/优化方向\s*[:](.+?)(?:\n|$)/)
  if (optM) { fb.optimize = optM[1].trim(); parseDetail.value.push('优化方向: '+fb.optimize.substring(0,25)) }

  if (txSec) {
    for (const [key,label] of [['budget','本日消耗预算'],['newCustomer','本日新客户'],['effective','有效客户']]) {
      const m = txSec.match(new RegExp(label+'\\s*[:]\\s*(\\d+\\.?\\d*)','i'))
      if (m) { tx[key] = parseFloat(m[1])||0; parseDetail.value.push('TX '+key+': '+m[1]) }
    }
    tx.summary = extractBetween(txSec, /(?<!投流数据)总结\s*[:]/)
    if (tx.summary) parseDetail.value.push('TX总结: '+tx.summary.substring(0,25)+'...')
  }

  const todayI = text.search(/今日工作[，,\s]*\n?/), tomorrowI = text.search(/第二天工作/), dailyI = text.search(/每日工作[，,\s]*\n?/)
  if (todayI>=0) { const end=tomorrowI>=0?tomorrowI:(dailyI>=0?dailyI:text.length); work.today=text.substring(todayI,end).replace(/^今日工作[，,\s]*\n?/,'').replace(/[\s\n]+$/,'').trim(); if(work.today)parseDetail.value.push('今日工作: '+work.today.substring(0,25)) }
  if (tomorrowI>=0) { const end=dailyI>=0?dailyI:text.length; work.tomorrow=text.substring(tomorrowI,end).replace(/^第二天工作\s*\n?/,'').replace(/[\s\n]+$/,'').trim(); if(work.tomorrow)parseDetail.value.push('第二天工作: '+work.tomorrow.substring(0,25)) }
  if (dailyI>=0) { work.daily=text.substring(dailyI).replace(/^每日工作[，,\s]*\n?/,'').replace(/[\s\n]+$/,'').trim(); if(work.daily)parseDetail.value.push('每日工作: '+work.daily.substring(0,25)) }

  pasteVisible.value = false
  parseDetail.value.length ? ElMessage.success('识别 '+parseDetail.value.length+' 个字段') : ElMessage.warning('未识别到数据')
}

function extractBetween(text, startRe) {
  const sm = text.match(startRe); if (!sm) return ''
  const rest = text.substring(sm.index+sm[0].length)
  const endM = rest.match(/—————————|优化方向|腾讯广告|今日工作|第二天工作|每日工作|\n\n/)
  return (endM?rest.substring(0,endM.index):rest).replace(/^[\s\n]+/,'').replace(/[\s\n]+$/,'').replace(/—————————\s*$/,'').trim()
}

onMounted(async () => {
  const t = sessionStorage.getItem('targetDate')
  if (t) {
    reportDate.value = t
    sessionStorage.removeItem('targetDate')
  } else {
    // 非跳转进入：把今天对齐到当前周年份
    const d = reportDate.value
    if (d) { const aligned = alignToCurrentWeekYear(d); if (aligned !== d) reportDate.value = aligned }
  }
  const e = sessionStorage.getItem('editDaily')
  if (e) {
    try {
      const { date, data: d } = JSON.parse(e)
      reportDate.value = date
      reportCountry.value = d.country || '综合'
      if (d.fb) Object.keys(fb).forEach(k => { if (k in d.fb) fb[k] = d.fb[k] ?? null })
      if (d.tx) Object.keys(tx).forEach(k => { if (k in d.tx) tx[k] = d.tx[k] ?? null })
      if (d.work) Object.keys(work).forEach(k => { if (k in d.work) work[k] = d.work[k] })
    } catch {}
    sessionStorage.removeItem('editDaily')
  }
})
</script>

<style scoped>
.report-page { animation: fadeIn .3s ease; }
.page-header { margin-bottom:20px; }
.page-header h2 { font-size:22px; font-weight:700; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }
@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

.avg-cost-display {
  height:32px; display:flex; align-items:center;
  font-size:20px; font-weight:800; color:#9ca3af;
  border-bottom:2px solid #e5e7eb;
}
.avg-cost-display.highlight { color:#6366f1; border-bottom-color:#6366f1; }

.template-item {
  display:flex; align-items:center; gap:10px;
  padding:10px 12px; margin-bottom:6px;
  background:#f8fafc; border-radius:8px;
  border:1px solid #e2e8f0; cursor:pointer;
  transition:all 0.2s;
}
.template-item:hover { border-color:#6366f1; background:#eef2ff; }
.template-content { flex:1; font-size:12px; color:#374151; line-height:1.6; }
</style>
