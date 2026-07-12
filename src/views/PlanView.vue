<template>
  <div class="plan-page">
    <!-- 页头 + 周切换 -->
    <div class="plan-topbar">
      <div class="plan-top-left">
        <h2><el-icon :size="22"><Calendar /></el-icon> 周计划</h2>
        <div class="week-selector">
          <button
            v-for="w in visibleWeeks"
            :key="w.id"
            class="week-chip"
            :class="{ active: w.id === week?.id }"
            @click="switchToWeek(w.id)"
          >
            <span class="wc-dates">{{ shortDate(w.startDate) }} – {{ shortDate(w.endDate) }}</span>
            <span class="wc-meta">询{{ w.inquiryGoal }} · 拉{{ w.groupGoal }}</span>
          </button>
        </div>
      </div>
      <div class="plan-top-actions">
        <el-button size="small" @click="openCreateWeek"><el-icon :size="14"><Plus /></el-icon> 新增周</el-button>
        <el-button size="small" type="primary" @click="openSettings"><el-icon :size="14"><Setting /></el-icon> 设置</el-button>
        <el-button size="small" @click="manageOpen = true">管理周计划</el-button>
      </div>
    </div>

    <!-- 加载态 -->
    <div v-if="!week" class="empty-page">
      <el-icon :size="48" color="#d1d5db;"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-else>
      <!-- ====== 概览行 ====== -->
      <div class="overview-strip">
        <div class="ov-card">
          <div class="ov-icon-wrap" style="background:#eef2ff;color:#6366f1;"><el-icon :size="20"><Calendar /></el-icon></div>
          <div class="ov-info">
            <div class="ov-val">{{ days.length }}</div>
            <div class="ov-label">工作日</div>
          </div>
          <div class="ov-sub-done">{{ completedDays }}/{{ days.length }} 已填报</div>
        </div>
        <div class="ov-card">
          <div class="ov-icon-wrap" style="background:#fff7ed;color:#ea580c;"><el-icon :size="20"><TrendCharts /></el-icon></div>
          <div class="ov-info">
            <div class="ov-val">{{ s.fbCustomer }}<span class="ov-unit">/{{ week.inquiryGoal }}</span></div>
            <div class="ov-label">{{ goalLabel('inquiry') }}</div>
          </div>
        </div>
        <div class="ov-card">
          <div class="ov-icon-wrap" style="background:#ecfdf5;color:#059669;"><el-icon :size="20"><ChatDotRound /></el-icon></div>
          <div class="ov-info">
            <div class="ov-val success">{{ s.fbGrouped }}<span class="ov-unit">/{{ week.groupGoal }}</span></div>
            <div class="ov-label">{{ goalLabel('group') }}</div>
          </div>
        </div>
        <div class="ov-card">
          <div class="ov-icon-wrap" style="background:#fef2f2;color:#ef4444;"><el-icon :size="20"><Money /></el-icon></div>
          <div class="ov-info">
            <div class="ov-val" :class="bPct > 90 ? 'danger' : ''">¥{{ fmtK(s.fbBudget) }}<span class="ov-unit">/¥{{ fmtK(week.weekBudget) }}</span></div>
            <div class="ov-label">{{ goalLabel('budget') }}</div>
          </div>
        </div>
        <div class="ov-card">
          <div class="ov-icon-wrap" style="background:#eef2ff;color:#6366f1;"><el-icon :size="20"><TrendCharts /></el-icon></div>
          <div class="ov-info">
            <div class="ov-val">¥{{ s.fbCustomer > 0 ? (s.fbBudget / s.fbCustomer).toFixed(0) : '—' }}</div>
            <div class="ov-label">客均成本</div>
          </div>
        </div>
      </div>

      <!-- ====== 三栏：进度 + 消耗 + 每日表 ====== -->
      <div class="mid-layout">
        <!-- 左：环形图 -->
        <div class="mid-card mid-donut">
          <div class="mid-card-hd">拉群达成</div>
          <div class="donut-wrap">
            <div ref="donutRef" class="donut-chart"></div>
            <div class="donut-label">
              <div class="dl-val">{{ s.fbGrouped }}</div>
              <div class="dl-sub">/ {{ week.groupGoal }} 拉群</div>
            </div>
          </div>
          <div class="donut-footer">
            <div class="df-item">
              <span class="df-dot" style="background:#10b981;"></span>
              <span class="df-val">{{ animatedPct }}%</span>
              <span class="df-label">达成率</span>
            </div>
            <div class="df-item">
              <span class="df-dot" style="background:#f3f4f6;"></span>
              <span class="df-val">{{ Math.max(0, (week.groupGoal||0) - s.fbGrouped) }}</span>
              <span class="df-label">剩余</span>
            </div>
          </div>
        </div>

        <!-- 中：消耗进度 -->
        <div class="mid-card mid-spend">
          <div class="mid-card-hd">本周消耗</div>
          <div class="spend-meter">
            <div class="spend-big">¥{{ fmtK(s.fbBudget) }}</div>
            <div class="spend-sub">/ ¥{{ fmtK(week.weekBudget) }}</div>
          </div>
          <div class="spend-bar-wrap">
            <div class="spend-bar-track">
              <div class="spend-bar-fill" :class="bPct > 90 ? 'red' : bPct > 70 ? 'orange' : 'blue'" :style="{ width: bPct + '%' }"></div>
            </div>
          </div>
          <div class="spend-row">
            <div class="spend-item"><span>新客户</span><b>{{ s.fbCustomer }}</b></div>
            <div class="spend-item"><span>拉群</span><b>{{ s.fbGrouped }}</b></div>
            <div class="spend-item"><span>客均</span><b>¥{{ s.fbCustomer > 0 ? (s.fbBudget / s.fbCustomer).toFixed(0) : '—' }}</b></div>
          </div>
        </div>

        <!-- 右：覆盖国家 -->
        <div class="mid-card mid-countries">
          <div class="mid-card-hd">覆盖国家 <span class="mid-hd-sub">{{ week.countries?.length || 0 }} 个</span></div>
          <div class="country-list">
            <div v-for="c in week.countries" :key="c" class="country-row">
              <span class="country-flag-wrap">
                <span class="fi" :class="'fi-' + flagCode(c)"></span>
              </span>
              <span class="country-name">{{ c }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== 每日完成 ====== -->
      <div class="daily-section">
        <div class="daily-hd">
          <b><el-icon :size="16"><List /></el-icon> 每日完成情况</b>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:12px;color:#9ca3af;"><el-icon :size="13"><InfoFilled /></el-icon> 点击编辑或填写日报</span>
            <el-button size="small" round @click="copyWeekSummary">复制本周汇总</el-button>
          </div>
        </div>
        <div class="daily-table">
          <div class="dt-head">
            <div class="dt-th dt-th--date">日期</div>
            <div class="dt-th">FB消耗</div>
            <div class="dt-th">新客户</div>
            <div class="dt-th">拉群</div>
            <div class="dt-th dt-th--st">状态</div>
          </div>
          <div
            v-for="(d, i) in dayCards"
            :key="d.date"
            class="dt-row"
            :class="{ completed: d.completed, today: d.isToday }"
            @click="goToReport(d)"
          >
            <div class="dt-td dt-td--date">
              <span class="dt-day">{{ d.dayName }}</span>
              <span class="dt-date">{{ formatDayOnly(d.date) }}</span>
              <el-tag v-if="d.isToday" type="primary" size="small" effect="dark" class="dt-today">今天</el-tag>
            </div>
            <div class="dt-td price">{{ d.completed ? '¥' + Math.round(d.fbBudget) : '—' }}</div>
            <div class="dt-td">{{ d.completed ? (d.fbCustomer || '0') : '—' }}</div>
            <div class="dt-td highlight">{{ d.completed ? (d.fbGrouped || '0') : '—' }}</div>
            <div class="dt-td dt-td--st">
              <span class="st-dot" :class="d.completed ? 'done' : 'empty'"></span>
              {{ d.completed ? '已填报' : '待填写' }}
            </div>
          </div>
        </div>
      </div>

      <!-- ====== 设置弹窗 ====== -->
      <el-dialog v-model="settingsOpen" title="本周设置" width="620px" destroy-on-close>
        <el-form label-width="80px" size="default">
          <el-row :gutter="12">
            <el-col :span="12"><el-form-item label="开始日期"><el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="结束日期"><el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="日预算"><el-input-number v-model="form.dailyBudget" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="周预算"><el-input-number v-model="form.weekBudget" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="询盘目标"><el-input-number v-model="form.inquiryGoal" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="拉群目标"><el-input-number v-model="form.groupGoal" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="覆盖国家">
              <el-tree ref="treeRef" :data="countryTreeData" show-checkbox node-key="key" :props="{ label:'label', children:'children' }" default-expand-all @check="onTreeCheck" style="max-height:280px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;" />
            </el-form-item></el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button type="danger" @click="deleteThisWeek" style="margin-right:auto;"><el-icon :size="14"><Delete /></el-icon> 删除本周</el-button>
          <el-button @click="settingsOpen = false">取消</el-button>
          <el-button type="primary" @click="saveSettings"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
        </template>
      </el-dialog>

      <!-- ====== 管理周计划弹窗 ====== -->
      <el-dialog v-model="manageOpen" title="管理周计划" width="600px" destroy-on-close>
        <div class="manage-list">
          <div v-for="w in allWeeks" :key="w.id" class="manage-row" :class="{ current: w.id === week?.id }">
            <div class="manage-info">
              <span class="manage-dates">{{ shortDate(w.startDate) }} – {{ shortDate(w.endDate) }}</span>
              <span class="manage-meta">询{{ w.inquiryGoal }} · 拉{{ w.groupGoal }} · ¥{{ w.weekBudget }}</span>
              <el-tag v-if="w.id === week?.id" size="small" type="primary" effect="light">当前</el-tag>
            </div>
            <div class="manage-actions">
              <el-button v-if="w.id !== week?.id" size="small" text type="primary" @click="switchToWeek(w.id); manageOpen = false">切换到此周</el-button>
              <el-button size="small" text type="danger" @click="permDeleteWeek(w); manageOpen = false">删除</el-button>
            </div>
          </div>
        </div>
      </el-dialog>

      <!-- ====== 新增周弹窗 ====== -->
      <el-dialog v-model="newWeekOpen" title="新增周计划" width="560px" destroy-on-close>
        <div style="margin-bottom:14px;">
          <el-radio-group v-model="newWeekMode">
            <el-radio-button value="quick"><el-icon :size="14"><Calendar /></el-icon> 快速（下周）</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="newWeekMode === 'quick'" class="preview-card">
          <div class="preview-row">
            <div><label>日期</label><b>{{ newWeekForm.startDate }} — {{ newWeekForm.endDate }}</b></div>
            <div><label>日预算</label><b>¥{{ newWeekForm.dailyBudget }}</b></div>
            <div><label>周预算</label><b>¥{{ newWeekForm.weekBudget }}</b></div>
            <div><label>询盘/拉群</label><b>{{ newWeekForm.inquiryGoal }} / {{ newWeekForm.groupGoal }}</b></div>
          </div>
          <div style="margin-top:8px;"><label>覆盖国家</label><div class="chip-row"><el-tag v-for="c in newWeekForm.countries" :key="c" size="small">{{ c }}</el-tag></div></div>
          <el-alert style="margin-top:12px;" title="继承当前周全部设置，日期自动计算为下周" type="info" :closable="false" show-icon />
        </div>
        <el-form v-else label-width="80px" size="default">
          <el-row :gutter="12">
            <el-col :span="12"><el-form-item label="开始日期"><el-date-picker v-model="newWeekForm.startDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="结束日期"><el-date-picker v-model="newWeekForm.endDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="日预算"><el-input-number v-model="newWeekForm.dailyBudget" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="周预算"><el-input-number v-model="newWeekForm.weekBudget" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="询盘目标"><el-input-number v-model="newWeekForm.inquiryGoal" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="拉群目标"><el-input-number v-model="newWeekForm.groupGoal" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="覆盖国家">
              <el-tree :data="countryTreeData" show-checkbox node-key="key" :default-checked-keys="newWeekForm.countries" :props="{ label:'label', children:'children' }" default-expand-all @check="onNewTreeCheck" style="max-height:260px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;" />
            </el-form-item></el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button @click="newWeekOpen = false">取消</el-button>
          <el-button type="primary" @click="doCreateWeek"><el-icon :size="14"><Check /></el-icon> 创建</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useWeekStore } from '../stores/week'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import { api, formatDate, formatDateCN, getDateRange, getDayName, todayStr } from '../api'

const weekStore = useWeekStore()
const router = useRouter()
const week = computed(() => weekStore.currentWeek)
const donutRef = ref(null)
let donutChart = null

function shortDate(str) { return str ? formatDate(str) : '' }
function formatDayOnly(str) { if (!str) return ''; return parseInt(str.split('-')[2]) + '日' }

// ====== 周切换 ======
const visibleWeeks = computed(() => weekStore.weeks.filter(w => !w.hidden))
const allWeeks = computed(() => [...weekStore.weeks].sort((a, b) => b.id - a.id))
const manageOpen = ref(false)

// ====== 国家树 ======
const countryTreeData = [
  { key:'se-asia', label:'东南亚', children:['印度尼西亚','越南','菲律宾','泰国','马来西亚','新加坡','缅甸','柬埔寨'].map(c=>({key:c,label:c})) },
  { key:'africa', label:'非洲', children:['尼日利亚','埃塞俄比亚','南非','肯尼亚','加纳','埃及'].map(c=>({key:c,label:c})) },
  { key:'latam', label:'拉美', children:['巴西','墨西哥','哥伦比亚','阿根廷'].map(c=>({key:c,label:c})) },
  { key:'mid-east', label:'中东', children:['阿联酋','沙特阿拉伯','土耳其','卡塔尔'].map(c=>({key:c,label:c})) },
  { key:'s-asia', label:'南亚', children:['印度','巴基斯坦','孟加拉国'].map(c=>({key:c,label:c})) },
  { key:'e-asia', label:'东亚', children:['日本','韩国'].map(c=>({key:c,label:c})) },
  { key:'emea', label:'欧美', children:['美国','英国','德国','法国','澳大利亚','俄罗斯'].map(c=>({key:c,label:c})) }
]
const allLeafKeys = countryTreeData.flatMap(g => g.children.map(c => c.key))
const treeRef = ref(null)

function onTreeCheck(_n, checked) { form.value.countries = checked.checkedKeys.filter(k => allLeafKeys.includes(k)) }
function onNewTreeCheck(_n, checked) { newWeekForm.value.countries = checked.checkedKeys.filter(k => allLeafKeys.includes(k)) }

// ====== 数据 ======
const s = reactive({ fbBudget: 0, fbCustomer: 0, fbGrouped: 0, totalBudget: 0 })
const dailyData = ref({})
const days = computed(() => {
  try { return week.value ? getDateRange(week.value.startDate, week.value.endDate) : [] }
  catch { return [] }
})
const completedDays = computed(() => days.value.filter(d => dailyData.value[d]).length)

const iPct = computed(() => week.value?.inquiryGoal ? Math.min(100, Math.round(s.fbCustomer / week.value.inquiryGoal * 100)) : 0)
const groupPct = computed(() => week.value?.groupGoal ? Math.min(100, Math.round(s.fbGrouped / week.value.groupGoal * 100)) : 0)
const bPct = computed(() => week.value?.weekBudget ? Math.min(100, Math.round(s.fbBudget / week.value.weekBudget * 100)) : 0)

function goalLabel(key) {
  const pct = key === 'inquiry' ? iPct.value : key === 'group' ? groupPct.value : bPct.value
  return (key === 'inquiry' ? '新客户' : key === 'group' ? '拉群' : '消耗') + ' · ' + (pct || 0) + '%'
}

const flagMap = { 印度尼西亚:"id", 印尼:"id", 越南:"vn", 泰国:"th", 菲律宾:"ph", 马来西亚:"my", 新加坡:"sg", 缅甸:"mm", 柬埔寨:"kh", 尼日利亚:"ng", 埃塞俄比亚:"et", 南非:"za", 肯尼亚:"ke", 加纳:"gh", 埃及:"eg", 阿联酋:"ae", 沙特阿拉伯:"sa", 沙特:"sa", 土耳其:"tr", 卡塔尔:"qa", 印度:"in", 巴基斯坦:"pk", 孟加拉国:"bd", 孟加拉:"bd", 日本:"jp", 韩国:"kr", 巴西:"br", 墨西哥:"mx", 哥伦比亚:"co", 阿根廷:"ar", 美国:"us", 英国:"gb", 德国:"de", 法国:"fr", 澳大利亚:"au", 俄罗斯:"ru" }
function flagCode(name) { return flagMap[name] || "" }

async function copyWeekSummary() {
  if (!week.value) { ElMessage.warning('暂无数据'); return }
  const w = week.value
  const start = formatDate(w.startDate), end = formatDate(w.endDate)
  const daysCnt = days.value.length
  const t = s // reactive stats
  const effCost = t.fbGrouped > 0 ? (t.fbBudget / t.fbGrouped).toFixed(1) : '—'
  const avgDaily = t.fbBudget > 0 ? Math.round(t.fbBudget / daysCnt) : '—'
  const inquiryCost = t.fbCustomer > 0 ? (t.fbBudget / t.fbCustomer).toFixed(0) : '—'
  const countries = (w.countries||[]).join('-')
  const text = `⭐${start} — ${end}（${Math.floor(daysCnt)}天）：
国家：${countries}
1.总询盘客户：${t.fbCustomer}个
2.已拉群客户：${t.fbGrouped}个
3.总消耗：${t.fbBudget}元
4.有效客户成本：${effCost}元
5.日均成本：${avgDaily}元
6.询盘客户成本：${inquiryCost}元`
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('周报汇总已复制')
  } catch {
    const ta = document.createElement('textarea'); ta.value = text
    document.body.appendChild(ta); ta.select(); document.execCommand('copy')
    document.body.removeChild(ta); ElMessage.success('周报汇总已复制')
  }
}

function fmtK(n) {
  const v = Math.round(n || 0)
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v)
}

const dayCards = computed(() =>
  days.value.map(date => {
    const d = dailyData.value[date]
    return {
      date, dayName: getDayName(date), completed: !!d, isToday: date === todayStr(),
      fbBudget: d?.fb?.budget || 0, fbCustomer: d?.fb?.newCustomer || 0, fbGrouped: d?.fb?.grouped || 0
    }
  })
)

const animatedPct = ref(0)

function animateNumber(from, to, duration) {
  const start = performance.now()
  const step = (ts) => {
    const elapsed = ts - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 4)
    animatedPct.value = Math.round(from + (to - from) * eased)
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function initDonut() {
  const el = donutRef.value
  if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) return
  const prevVal = animatedPct.value
  if (donutChart) { donutChart.dispose(); donutChart = null }
  donutChart = echarts.init(el, null, { devicePixelRatio: 2 })
  donutChart.setOption({
    animation: true,
    animationDuration: 1400,
    animationEasing: 'cubicInOut',
    animationDelay(idx) { return idx * 200 },
    series: [{
      type: 'pie', radius: ['72%', '92%'], silent: true,
      animationType: 'scale',
      animationDelay: 300,
      itemStyle: { borderColor: 'transparent', borderWidth: 0 },
      data: [
        { value: s.fbGrouped, itemStyle: { color: '#10b981' } },
        { value: Math.max(0, (week.value?.groupGoal || 0) - s.fbGrouped), itemStyle: { color: '#f3f4f6' } }
      ]
    }]
  })
  animateNumber(prevVal || 0, groupPct.value, 1400)
}

// ====== 加载 ======
async function loadWeekData(w) {
  try {
    const [sumRes, dailyRes] = await Promise.all([
      api.summary.weekly({ startDate: w.startDate, endDate: w.endDate }),
      api.daily.list({ startDate: w.startDate, endDate: w.endDate })
    ])
    if (sumRes.success) { s.fbBudget = sumRes.data.fbBudget || 0; s.fbCustomer = sumRes.data.fbCustomer || 0; s.fbGrouped = sumRes.data.fbGrouped || 0; s.totalBudget = sumRes.data.totalBudget || 0 }
    if (dailyRes.success) dailyData.value = dailyRes.data
  } catch { ElMessage.error('加载本周数据失败') }
}

function goToReport(d) {
  sessionStorage.setItem('targetDate', d.date)
  // 如果已有数据，传过去预填表单（修正模式）
  if (d.completed) {
    const existing = dailyData.value[d.date]
    if (existing) {
      sessionStorage.setItem('editDaily', JSON.stringify({ date: d.date, data: existing }))
    }
  }
  router.push({ path: '/report', query: { t: Date.now() } })
}

// ====== 设置 ======
const settingsOpen = ref(false)
const form = ref({ startDate: '', endDate: '', dailyBudget: 300, weekBudget: 1500, inquiryGoal: 400, groupGoal: 20, countries: [] })

function openSettings() {
  if (week.value) {
    // 确保从 store 拿到最新的当前周数据
    const w = weekStore.currentWeek
    if (!w) return
    form.value = { startDate: w.startDate, endDate: w.endDate, dailyBudget: w.dailyBudget, weekBudget: w.weekBudget, inquiryGoal: w.inquiryGoal, groupGoal: w.groupGoal, countries: [...(w.countries || [])] }
    nextTick(() => { if (treeRef.value) treeRef.value.setCheckedKeys(w.countries || []) })
  }
  settingsOpen.value = true
}

async function saveSettings() {
  if (!week.value?.id) { ElMessage.error('未找到当前周计划'); return }
  const res = await weekStore.updateWeek(week.value.id, form.value)
  if (res.success) { settingsOpen.value = false; ElMessage.success('已保存') }
  else { ElMessage.error(res.error || '保存失败') }
}

// ====== 新增周 ======
const newWeekOpen = ref(false)
const newWeekMode = ref('quick')
const newWeekForm = ref(getNextWeekDefaults())

function getNextWeekDefaults() {
  const now = new Date()
  const day = now.getDay() || 7
  const mon = new Date(now); mon.setDate(now.getDate() + (8 - day))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  return { startDate: fmt(mon), endDate: fmt(sun), dailyBudget: week.value?.dailyBudget || 300, weekBudget: week.value?.weekBudget || 1500, inquiryGoal: week.value?.inquiryGoal || 400, groupGoal: week.value?.groupGoal || 20, countries: [...(week.value?.countries || [])] }
}

function openCreateWeek() { newWeekForm.value = getNextWeekDefaults(); newWeekMode.value = 'quick'; newWeekOpen.value = true }

async function doCreateWeek() {
  const res = await weekStore.createWeek(newWeekForm.value)
  if (res.success) {
    newWeekOpen.value = false
    ElMessage.success('新周计划已创建')
    const w = week.value || res.data
    if (w && w.startDate && w.endDate) {
      form.value = { startDate:w.startDate,endDate:w.endDate,dailyBudget:w.dailyBudget,weekBudget:w.weekBudget,inquiryGoal:w.inquiryGoal,groupGoal:w.groupGoal,countries:[...(w.countries||[])] }
      await loadWeekData(w)
      await nextTick(); initDonut()
    }
  } else {
    ElMessage.error(res.error || '创建失败')
  }
}

// ====== 切换 / 删除 ======
async function switchToWeek(id) {
  try {
    const switched = await weekStore.switchWeek(id)
    if (!switched) return ElMessage.error('切换失败')
    const w = week.value
    if (!w) return ElMessage.error('切换失败')
    form.value = { startDate:w.startDate,endDate:w.endDate,dailyBudget:w.dailyBudget,weekBudget:w.weekBudget,inquiryGoal:w.inquiryGoal,groupGoal:w.groupGoal,countries:[...(w.countries||[])] }
    await loadWeekData(w)
    await nextTick()
    initDonut()
    ElMessage.success('已切换')
  } catch { ElMessage.error("切换失败") }
}

async function closeWeekTab(w) {
  if (visibleWeeks.value.length <= 1) return
  await weekStore.deleteWeek(w.id)
}

async function permDeleteWeek(w) {
  try {
    await ElMessageBox.confirm(
      '永久删除「' + shortDate(w.startDate) + ' – ' + shortDate(w.endDate) + '」？\n周计划配置将永久丢失，日报数据保留。',
      '永久删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'error' }
    )
  } catch { return }
  await api.config.permDeleteWeek(w.id)
  await weekStore.load()
  ElMessage.success('已删除')
}

async function deleteThisWeek() {
  try { await ElMessageBox.confirm('确定删除本周？', '确认', { type: 'warning' }) } catch { return }
  settingsOpen.value = false
  await weekStore.deleteWeek(week.value.id)
  ElMessage.success('已删除')
}

// 数据变化时更新图表
watch([() => s.fbGrouped, () => week.value?.groupGoal], () => {
  nextTick(() => initDonut())
})

function onResize() { donutChart?.resize() }

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await weekStore.load()
  if (!week.value) await weekStore.createWeek()
  const w = week.value
  if (!w) return
  form.value = {
    startDate: w.startDate, endDate: w.endDate, dailyBudget: w.dailyBudget,
    weekBudget: w.weekBudget, inquiryGoal: w.inquiryGoal, groupGoal: w.groupGoal,
    countries: [...(w.countries || [])]
  }
  await loadWeekData(w)
  await nextTick()
  initDonut()
})

onUnmounted(() => { window.removeEventListener('resize', onResize); donutChart?.dispose(); donutChart = null })
</script>

<style scoped>
.plan-page { animation: fadeIn .3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }

/* ====== 顶部 ====== */
.plan-topbar {
  display:flex; justify-content:space-between; align-items:flex-start; gap:12px;
  margin-bottom:16px; flex-wrap:wrap;
}
.plan-topbar h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }
.plan-top-left { display:flex; flex-direction:column; gap:10px; }
.plan-top-actions { display:flex; gap:6px; flex-shrink:0; padding-top:4px; }

/* 周 chips */
.week-selector { display:flex; gap:6px; flex-wrap:wrap; max-height:84px; overflow-y:auto; }
.week-selector::-webkit-scrollbar { width:3px; }
.week-selector::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:3px; }
.week-chip {
  display:inline-flex; align-items:center; gap:8px;
  padding:7px 14px; border-radius:10px;
  border:1.5px solid #e5e7eb; background:#fff;
  cursor:pointer; transition:all .15s;
  font-size:13px; user-select:none;
}
.week-chip:hover { border-color:#6366f1; background:#f5f3ff; }
.week-chip.active { background:#6366f1; border-color:#6366f1; }
.wc-dates { font-weight:700; }
.week-chip.active .wc-dates { color:#fff; }
.wc-meta { font-size:10px; color:#9ca3af; }
.week-chip.active .wc-meta { color:rgba(255,255,255,.65); }

/* ====== 管理弹窗 ====== */
.manage-list { display:flex; flex-direction:column; gap:8px; }
.manage-row {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 16px; border-radius:12px;
  border:1px solid #e5e7eb; background:#fff;
  transition:all .15s;
}
.manage-row:hover { border-color:#c7d2fe; }
.manage-row.current { border-color:#6366f1; background:#eef2ff; }
.manage-info { display:flex; align-items:center; gap:12px; }
.manage-dates { font-size:14px; font-weight:700; color:#111827; }
.manage-meta { font-size:12px; color:#6b7280; }
.manage-actions { display:flex; gap:6px; }

.empty-page { text-align:center; padding:60px; color:#9ca3af; }

/* ====== 概览行 ====== */
.overview-strip { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:16px; }

.ov-card {
  background:#fff; border:1px solid #e5e7eb; border-radius:14px;
  padding:16px; box-shadow:0 1px 3px rgba(0,0,0,.03);
  transition:all .15s;
}
.ov-card:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,.06); }
.ov-icon-wrap {
  width:36px; height:36px; border-radius:10px;
  display:flex; align-items:center; justify-content:center; margin-bottom:8px;
}
.ov-val { font-size:24px; font-weight:800; color:#1f2937; line-height:1.2; }
.ov-val.success { color:#059669; }
.ov-val.danger { color:#ef4444; }
.ov-unit { font-size:13px; font-weight:600; color:#9ca3af; margin-left:2px; }
.ov-label { font-size:11px; color:#9ca3af; font-weight:600; margin-top:2px; }
.ov-sub-done { font-size:10px; color:#059669; font-weight:700; margin-top:4px; }

/* ====== 中部三栏 ====== */
.mid-layout { display:grid; grid-template-columns:260px 1fr 260px; gap:14px; margin-bottom:20px; }

.mid-card {
  background:#fff; border-radius:16px;
  padding:18px 20px; box-shadow: 0 0 0 1px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.06);
}
.mid-card-hd { font-size:14px; font-weight:700; color:#374151; margin-bottom:14px; }

/* 环形图 */
.mid-donut { display:flex; flex-direction:column; align-items:center; }
.donut-wrap { position:relative; display:flex; justify-content:center; align-items:center; }
.donut-chart { width:180px; height:180px; }
.donut-label {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  text-align:center; pointer-events:none;
}
.dl-val { font-size:38px; font-weight:800; color:#10b981; line-height:1; }
.dl-sub { font-size:12px; color:#9ca3af; margin-top:4px; font-weight:600; }

.donut-footer { display:flex; gap:20px; margin-top:14px; }
.df-item { display:flex; align-items:center; gap:6px; }
.df-dot { width:10px; height:10px; border-radius:50%; }
.df-val { font-size:16px; font-weight:700; color:#1f2937; }
.df-label { font-size:11px; color:#9ca3af; }

/* 消耗计量 */
.mid-spend { display:flex; flex-direction:column; }
.spend-meter { margin-bottom:12px; }
.spend-big { font-size:28px; font-weight:800; color:#6366f1; line-height:1.1; }
.spend-sub { font-size:12px; color:#9ca3af; font-weight:600; margin-top:2px; }
.spend-bar-wrap { margin-bottom:14px; }
.spend-bar-track { height:10px; background:#f3f4f6; border-radius:5px; overflow:hidden; }
.spend-bar-fill {
  height:100%; border-radius:5px;
  transition:width .6s cubic-bezier(.4,0,.2,1);
}
.spend-bar-fill.blue { background:linear-gradient(90deg,#6366f1,#818cf8); }
.spend-bar-fill.orange { background:linear-gradient(90deg,#f59e0b,#fbbf24); }
.spend-bar-fill.red { background:linear-gradient(90deg,#ef4444,#f87171); animation:pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
.spend-row { display:flex; gap:8px; margin-top:auto; }
.spend-item { flex:1; text-align:center; padding:8px 4px; background:#f9fafb; border-radius:8px; }
.spend-item span { display:block; font-size:10px; color:#9ca3af; font-weight:600; }
.spend-item b { font-size:15px; color:#1f2937; }

/* 国家 */
.mid-countries { display:flex; flex-direction:column; }
.mid-hd-sub { font-size:11px; color:#9ca3af; font-weight:500; margin-left:4px; }
.country-list { display:flex; flex-direction:column; gap:4px; flex:1; }
.country-row {
  display:flex; align-items:center; gap:10px;
  padding:8px 12px; border-radius:8px;
  transition:background .12s;
}
.country-row:hover { background:#f3f4f6; }
.country-flag-wrap {
  width:28px; height:20px; border-radius:3px; flex-shrink:0;
  box-shadow:0 1px 3px rgba(0,0,0,.12); overflow:hidden;
}
.country-flag-wrap :deep(.fi) { width:100% !important; height:100% !important; }
.country-name { font-size:13px; font-weight:600; color:#374151; }

/* ====== 每日完成 ====== */
.daily-section { margin-top:4px; }
.daily-hd {
  display:flex; justify-content:space-between; align-items:center;
  padding:10px 0; margin-bottom:6px;
}

.daily-table {
  background:#fff; border:1px solid #e5e7eb; border-radius:14px;
  overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.03);
}
.dt-head {
  display:grid; grid-template-columns:150px repeat(3,1fr) 100px;
  background:#f9fafb; border-bottom:1px solid #e5e7eb;
}
.dt-th {
  padding:11px 14px; font-size:11px; font-weight:800; color:#9ca3af;
  letter-spacing:.3px; text-align:right;
}
.dt-th--date { text-align:left; padding-left:22px; }
.dt-th--st { text-align:center; }

.dt-row {
  display:grid; grid-template-columns:150px repeat(3,1fr) 100px;
  border-bottom:1px solid #f3f4f6; cursor:pointer;
  transition:background .12s; background:#fff;
}
.dt-row:hover { background:#fafaff; }
.dt-row.completed { border-left:3px solid #10b981; }
.dt-row.today { background:linear-gradient(90deg,#eef2ff,#fafaff 50%,#fff); }
.dt-row:last-of-type { border-bottom:none; }

.dt-td {
  padding:14px 14px; font-size:14px; font-weight:600; color:#1f2937;
  text-align:right; display:flex; align-items:center; justify-content:flex-end;
  font-variant-numeric:tabular-nums;
}
.dt-td.price { color:#6366f1; font-weight:700; }
.dt-td.highlight { color:#059669; font-weight:700; }
.dt-td--date { justify-content:flex-start; padding-left:22px; gap:8px; }
.dt-day { font-size:15px; font-weight:800; color:#111827; }
.dt-date { font-size:12px; color:#9ca3af; font-weight:500; }
.dt-td--st { justify-content:center; gap:6px; font-size:12px; font-weight:600; color:#6b7280; }
.st-dot { width:7px; height:7px; border-radius:50%; }
.st-dot.done { background:#10b981; box-shadow:0 0 5px rgba(16,185,129,.4); }
.st-dot.empty { background:#d1d5db; }

/* ====== 弹窗 ====== */
.preview-card {
  background:#f8fafc; border-radius:12px; padding:16px;
  border:1px solid #e5e7eb;
}
.preview-row { display:flex; gap:16px; flex-wrap:wrap; }
.preview-row label { display:block; font-size:11px; color:#9ca3af; margin-bottom:2px; }
.preview-row b { font-size:13px; color:#1f2937; }
.chip-row { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }

@media (max-width:900px) {
  .overview-strip { grid-template-columns:repeat(2,1fr); }
  .mid-layout { grid-template-columns:1fr; }
  .dt-head, .dt-row { grid-template-columns:120px repeat(3,1fr) 80px; }
}
</style>
