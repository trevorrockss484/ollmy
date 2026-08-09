<template>
  <div class="dash-page enterprise-page enterprise-page--wide">
    <!-- 顶部概览 -->
    <div class="page-top">
      <div class="top-left">
        <h2><el-icon :size="24"><DataBoard /></el-icon> 仪表盘</h2>
        <p class="top-sub">{{ todayCN }} · {{ weekRange }}</p>
      </div>
      <div class="top-right">
        <el-select v-model="selectedAccountId" placeholder="选择账号" size="default" style="width:160px;margin-right:8px" @change="onAccountChange">
          <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
        </el-select>
        <el-button type="primary" class="btn-hero" @click="$router.push('/report')">
          <el-icon :size="16"><Edit /></el-icon>
          写日报
        </el-button>
      </div>
    </div>

    <!-- 数据加载错误提示 -->
    <el-alert v-if="loadErrors.length" type="warning" :closable="false" show-icon style="margin-bottom:16px">
      <template #title>
        部分数据加载失败：{{ loadErrors.join('、') }}，显示可能不准确。
        <el-button type="warning" size="small" text @click="load()">重试</el-button>
      </template>
    </el-alert>

    <!-- ====== 昨日数据修正提醒 ====== -->
    <div v-if="showYesterdayBanner && yesterdayData" class="yesterday-banner">
      <div class="yb-left">
        <el-icon :size="20"><WarningFilled /></el-icon>
        <span class="yb-title">昨日数据，需要修正吗？</span>
        <span class="yb-detail">
          昨日填报 · 消耗 <b>¥{{ fmtK(yesterdayData.budget) }}</b> ·
          新客户 <b>{{ yesterdayData.customer }}</b> ·
          拉群 <b>{{ yesterdayData.grouped }}</b>
        </span>
      </div>
      <div class="yb-right">
        <el-button type="primary" round size="small" @click="fixYesterday">修正</el-button>
        <el-button size="small" circle text @click="showYesterdayBanner = false"><el-icon :size="14"><Close /></el-icon></el-button>
      </div>
    </div>

    <!-- ====== 今日快照 ====== -->
    <div class="hero-strip">
      <div class="hero-card hero-budget">
        <div class="hero-left">
          <div class="hero-label">今日消耗</div>
          <div class="hero-val">¥{{ todayVal('budget') }}</div>
          <div class="hero-sub" :class="{ danger: budgetOver }">
            <el-icon v-if="budgetOver" :size="12"><WarningFilled /></el-icon>
            {{ budgetOver ? '超预算 ' + (budgets.dailyBudget||'?') + ' 元' : '日预算 ¥' + (budgets.dailyBudget||'—') }}
          </div>
        </div>
        <div class="hero-bg-icon"><el-icon :size="52"><Money /></el-icon></div>
      </div>

      <div class="hero-card hero-customer">
        <div class="hero-left">
          <div class="hero-label">新客户</div>
          <div class="hero-val accent">{{ todayVal('newCustomer') }}</div>
          <div class="hero-sub">客均 ¥{{ avgCostStr }}</div>
        </div>
        <div class="hero-bg-icon"><el-icon :size="52"><UserFilled /></el-icon></div>
      </div>

      <div class="hero-card hero-grouped">
        <div class="hero-left">
          <div class="hero-label">拉群</div>
          <div class="hero-val success">{{ todayVal('grouped') }}</div>
          <div class="hero-sub">{{ todayCatCount }} 个分类</div>
        </div>
        <div class="hero-bg-icon"><el-icon :size="52"><ChatDotRound /></el-icon></div>
      </div>

      <!-- VPS 告警 -->
      <div class="hero-card hero-vps" :class="{ clean: !vpsAlerts.length }" @click="$router.push('/monitor')">
        <div class="hero-left">
          <div class="hero-label">VPS 监控</div>
          <div class="hero-val" :class="{ danger: vpsAlerts.length }">{{ vpsAlerts.length || '✓' }}</div>
          <div class="hero-sub">{{ vpsAlerts.length ? vpsAlerts[0].name + ' ' + (vpsAlerts[0].severity === 'overdue' ? '已过期' : '剩' + vpsAlerts[0].days + '天') : '全部正常' }}</div>
        </div>
        <div class="hero-bg-icon"><el-icon :size="52"><Monitor /></el-icon></div>
      </div>
    </div>

    <!-- ====== 本周进度 + 趋势图 ====== -->
    <div class="mid-split">
      <div class="mid-card">
        <div class="mid-card-hd"><el-icon :size="16"><DataAnalysis /></el-icon> 本周进度</div>
        <div class="progress-chart-wrap">
          <div ref="donutRef" class="donut"></div>
          <div class="donut-center">
            <div class="dc-val">{{ weekStats.fbGrouped }}</div>
            <div class="dc-label">拉群 / {{ budgets.groupGoal || '—' }}</div>
          </div>
        </div>
        <div class="progress-bars">
          <div class="pb-item">
            <div class="pb-top"><span><span class="pb-dot" style="background:#6366f1;"></span> 消耗</span><span>¥{{ fmtK(weekStats.fbBudget) }} / ¥{{ fmtK(budgets.weekBudget||0) }}</span></div>
            <div class="pb-track"><div class="pb-fill blue" :style="{width: weekBudgetPct+'%'}"></div></div>
          </div>
          <div class="pb-item">
            <div class="pb-top"><span><span class="pb-dot" style="background:#10b981;"></span> 新客户</span><span>{{ weekStats.fbCustomer }} / {{ budgets.inquiryGoal||0 }}</span></div>
            <div class="pb-track"><div class="pb-fill green" :style="{width: inquiryPct+'%'}"></div></div>
          </div>
          <div class="pb-item">
            <div class="pb-top"><span><span class="pb-dot" style="background:#f59e0b;"></span> 拉群</span><span>{{ weekStats.fbGrouped }} / {{ budgets.groupGoal||0 }}</span></div>
            <div class="pb-track"><div class="pb-fill amber" :style="{width: groupPct+'%'}"></div></div>
          </div>
        </div>
      </div>

      <div class="mid-card chart-card">
        <div class="mid-card-hd">
          <el-icon :size="16"><TrendCharts /></el-icon> 近 7 天趋势
          <div class="chart-legend">
            <span class="cl-dot" style="background:#6366f1;"></span> 消耗
            <span class="cl-dot" style="background:#10b981;"></span> 新客户
          </div>
        </div>
        <div ref="trendRef" class="trend-chart"></div>
      </div>
    </div>

    <!-- ====== 快速入口 ====== -->
    <div class="quick-section">
      <div class="quick-head">快捷入口</div>
      <div class="quick-row">
        <div class="quick-card" @click="$router.push('/plan')" style="--qc-color:#6366f1;">
          <div class="qc-icon-wrap"><el-icon :size="22"><Calendar /></el-icon></div>
          <div class="qc-text">
            <div class="qc-title">周计划</div>
            <div class="qc-desc">{{ weekInfoShort }}</div>
          </div>
          <el-icon class="qc-arrow" :size="14"><ArrowRight /></el-icon>
        </div>
        <div class="quick-card" @click="$router.push('/report')" style="--qc-color:#059669;">
          <div class="qc-icon-wrap"><el-icon :size="22"><Edit /></el-icon></div>
          <div class="qc-text">
            <div class="qc-title">日报生成</div>
            <div class="qc-desc">投流数据填写</div>
          </div>
          <el-icon class="qc-arrow" :size="14"><ArrowRight /></el-icon>
        </div>
        <div class="quick-card" @click="$router.push('/history')" style="--qc-color:#d97706;">
          <div class="qc-icon-wrap"><el-icon :size="22"><TrendCharts /></el-icon></div>
          <div class="qc-text">
            <div class="qc-title">数据查询</div>
            <div class="qc-desc">历史·趋势·月报</div>
          </div>
          <el-icon class="qc-arrow" :size="14"><ArrowRight /></el-icon>
        </div>
        <div class="quick-card" @click="$router.push('/monitor')" style="--qc-color:#ea580c;">
          <div class="qc-icon-wrap"><el-icon :size="22"><Monitor /></el-icon></div>
          <div class="qc-text">
            <div class="qc-title">VPS 管理中心</div>
            <div class="qc-desc">到期·续费·成本</div>
          </div>
          <el-icon class="qc-arrow" :size="14"><ArrowRight /></el-icon>
        </div>
        <div class="quick-card" @click="$router.push('/prompts')" style="--qc-color:#4f46e5;">
          <div class="qc-icon-wrap"><el-icon :size="22"><Document /></el-icon></div>
          <div class="qc-text">
            <div class="qc-title">提示词模板</div>
            <div class="qc-desc">AI 流程管理</div>
          </div>
          <el-icon class="qc-arrow" :size="14"><ArrowRight /></el-icon>
        </div>
        <div class="quick-card" @click="$router.push('/assets')" style="--qc-color:#db2777;">
          <div class="qc-icon-wrap"><el-icon :size="22"><PictureFilled /></el-icon></div>
          <div class="qc-text">
            <div class="qc-title">资产管理</div>
            <div class="qc-desc">人物·场景·道具</div>
          </div>
          <el-icon class="qc-arrow" :size="14"><ArrowRight /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  DataBoard, Edit, WarningFilled, Money, UserFilled, ChatDotRound,
  Monitor, DataAnalysis, TrendCharts, Calendar, PictureFilled, Document,
  ArrowRight, Close
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useWeekStore } from '../stores/week'
import { api, formatDateCN, todayStr, daysBetween, formatDate, getDateRange } from '../api'
import { axisTheme } from '../utils/echarts-theme'

const weekStore = useWeekStore()
const router = useRouter()
const week = computed(() => weekStore.currentWeek)

// 当前账号的预算解析（优先 accountBudgets，fallback 全局值）
const budgets = computed(() => {
  const w = week.value
  if (!w || !selectedAccountId.value) return w || {}
  const ab = (w.accountBudgets && w.accountBudgets[selectedAccountId.value]) || {}
  return {
    dailyBudget: ab.dailyBudget != null ? ab.dailyBudget : (w.dailyBudget || 300),
    weekBudget: ab.weekBudget != null ? ab.weekBudget : (w.weekBudget || 1500),
    inquiryGoal: ab.inquiryGoal != null ? ab.inquiryGoal : (w.inquiryGoal || 400),
    groupGoal: ab.groupGoal != null ? ab.groupGoal : (w.groupGoal || 20),
  }
})

const todayData = ref(null)
const yesterdayData = ref(null)
const weekStats = reactive({ fbBudget: 0, fbCustomer: 0, fbGrouped: 0 })
const vpsAlerts = ref([])
const trendData = ref([])
const loadErrors = ref([])
const accounts = ref([])
const selectedAccountId = ref(localStorage.getItem('dash_accountId') || '')
const showYesterdayBanner = ref(true)
const weekInfoShort = computed(() => {
  if (!week.value) return ''
  const remaining = Math.max(0, daysBetween(todayStr(), week.value.endDate) + 1)
  return `剩余 ${remaining} 天`
})

const todayCN = computed(() => formatDateCN(todayStr()))
const weekRange = computed(() => {
  if (!week.value) return ''
  return formatDate(week.value.startDate) + ' — ' + formatDate(week.value.endDate)
})
// weekNum computed removed - unused

// 汇总所有国家数据
function sumCountries(d, key) {
  if (!d?.countries) return 0
  let total = 0
  Object.values(d.countries).forEach(c => { total += c[key] || 0 })
  return total
}

function todayVal(key) {
  if (!todayData.value) return 0
  return Math.round(sumCountries(todayData.value, key))
}

const avgCost = computed(() => {
  if (!todayData.value) return 0
  const b = sumCountries(todayData.value, 'budget')
  const c = sumCountries(todayData.value, 'newCustomer')
  return c > 0 ? b / c : 0
})
const avgCostStr = computed(() => avgCost.value > 0 ? avgCost.value.toFixed(0) : '—')

const budgetOver = computed(() => {
  if (!todayData.value || !week.value) return false
  return sumCountries(todayData.value, 'budget') > budgets.value.dailyBudget
})

const todayCatCount = computed(() => {
  if (!todayData.value?.countries) return 0
  let count = 0
  const fields = ['catNoReply', 'msgIgnore', 'grouped', 'lowBudget', 'competitor', 'harass', 'visitPending']
  Object.values(todayData.value.countries).forEach(c => {
    fields.forEach(f => { if (c[f] > 0) count++ })
  })
  return count
})

const inquiryPct = computed(() => budgets.value.inquiryGoal ? Math.min(100, Math.round(weekStats.fbCustomer / budgets.value.inquiryGoal * 100)) : 0)
const groupPct = computed(() => budgets.value.groupGoal ? Math.min(100, Math.round(weekStats.fbGrouped / budgets.value.groupGoal * 100)) : 0)
const weekBudgetPct = computed(() => budgets.value.weekBudget ? Math.min(100, Math.round(weekStats.fbBudget / budgets.value.weekBudget * 100)) : 0)

function fmtK(n) {
  const v = Math.round(n || 0)
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return v.toLocaleString('en-US')
}

// ====== ECharts ======
const donutRef = ref(null)
const trendRef = ref(null)
let donutChart = null
let trendChart = null

function initDonut() {
  if (!donutRef.value) return
  donutChart = echarts.init(donutRef.value)
  donutChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: ['70%', '90%'], center: ['50%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6 },
      data: [
        { name: '拉群', value: weekStats.fbGrouped, itemStyle: { color: '#10b981' } },
        { name: '剩余', value: Math.max(0, (budgets.value.groupGoal || 1) - weekStats.fbGrouped), itemStyle: { color: document.documentElement.classList.contains('dark') ? '#24243a' : '#f3f4f6' } }
      ]
    }]
  })
}

function initTrend() {
  if (!trendRef.value || !trendData.value.length) return
  trendChart = echarts.init(trendRef.value)

  const dates = trendData.value.map(d => d.date.substring(5))
  const budgetData = trendData.value.map(d => d.budget)
  const customerData = trendData.value.map(d => d.customer)

  trendChart.setOption({
    tooltip: { trigger: 'axis', ...(axisTheme().tooltip || {}) },
    grid: axisTheme().grid,
    legend: { show: false },
    xAxis: { type: 'category', data: dates, ...axisTheme().xAxis || axisTheme() },
    yAxis: [
      { type: 'value', name: '元', ...axisTheme() },
      { type: 'value', name: '个', ...axisTheme(), splitLine: { show: false } }
    ],
    series: [
      {
        data: budgetData, type: 'bar', barWidth: 14,
        itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
        yAxisIndex: 0
      },
      {
        data: customerData, type: 'line', smooth: true,
        symbol: 'circle', symbolSize: 5,
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' },
        yAxisIndex: 1
      }
    ]
  })
}

function fixYesterday() {
  if (!yesterdayData.value) return
  sessionStorage.setItem('targetDate', yesterdayData.value.date)
  sessionStorage.setItem('editDaily', JSON.stringify({ date: yesterdayData.value.date, data: yesterdayData.value.data }))
  router.push({ path: '/report', query: { t: Date.now() } })
}

// ====== 加载 ======
async function loadAccounts() {
  try {
    const r = await api.daily.accounts()
    if (r.success && Array.isArray(r.data) && r.data.length) {
      accounts.value = r.data
      if (!selectedAccountId.value || !accounts.value.find(a => a.id === selectedAccountId.value)) {
        selectedAccountId.value = accounts.value[0].id
      }
      localStorage.setItem('dash_accountId', selectedAccountId.value)
    }
  } catch (e) { console.error('加载账号列表失败:', e) }
}

function onAccountChange() {
  localStorage.setItem('dash_accountId', selectedAccountId.value)
  load()
}

async function load() {
  loadErrors.value = []
  // 本周
  if (!weekStore.currentWeek) await weekStore.load()
  if (!weekStore.currentWeek) await weekStore.createWeek()
  weekStats.fbBudget = 0; weekStats.fbCustomer = 0; weekStats.fbGrouped = 0
  const w = weekStore.currentWeek
  if (!w) return

  const aid = selectedAccountId.value || undefined

  // 今日
  try {
    const r = await api.daily.get(todayStr(), aid ? { accountId: aid } : {})
    if (r.success && r.data) todayData.value = r.data
  } catch (e) { console.error('加载今日数据失败:', e); loadErrors.value.push('今日数据') }

  // 昨日（修正提醒）
  try {
    const d = new Date(); d.setDate(d.getDate() - 1)
    const yStr = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
    const r = await api.daily.get(yStr, aid ? { accountId: aid } : {})
    if (r.success && r.data) {
      const totalBudget = sumCountries(r.data, 'budget')
      const totalCustomer = sumCountries(r.data, 'newCustomer')
      const totalGrouped = sumCountries(r.data, 'grouped')
      yesterdayData.value = { date: yStr, budget: totalBudget, customer: totalCustomer, grouped: totalGrouped, data: r.data }
    }
  } catch (e) { console.error('加载昨日数据失败:', e); loadErrors.value.push('昨日数据') }


  // 本周汇总
  try {
    const params = { startDate: w.startDate, endDate: w.endDate }
    if (aid) params.accountId = aid
    const r = await api.summary.weekly(params)
    if (r.success) {
      weekStats.fbBudget = r.data.fbBudget || 0
      weekStats.fbCustomer = r.data.fbCustomer || 0
      weekStats.fbGrouped = r.data.fbGrouped || 0
    }
  } catch (e) { console.error('加载本周汇总失败:', e); loadErrors.value.push('本周汇总') }

  // VPS
  try {
    const r = await api.vps.list()
    if (r.success) {
      const today = todayStr()
      vpsAlerts.value = r.data
        .filter(v => daysBetween(today, v.expire) <= 14)
        .map(v => {
          const d = daysBetween(today, v.expire)
          return { name: v.name, days: Math.abs(d), severity: d < 0 ? 'overdue' : d <= 7 ? 'urgent' : 'warning' }
        })
        .sort((a, b) => {
          const o = { overdue: 0, urgent: 1, warning: 2 }
          const bySeverity = (o[a.severity] || 3) - (o[b.severity] || 3)
          if (bySeverity !== 0) return bySeverity
          return a.days - b.days
        })
    }
  } catch (e) { console.error('加载VPS数据失败:', e); loadErrors.value.push('VPS状态') }

  // 近 7 天趋势（过去7个完整天，不含今天）
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().split('T')[0]
  const d7 = new Date(yesterday)
  d7.setDate(d7.getDate() - 6)         // 昨天往前6天 = 共7天
  const start7 = d7.toISOString().split('T')[0]
  try {
    const listParams = { startDate: start7, endDate: yStr }
    if (aid) listParams.accountId = aid
    const r = await api.daily.list(listParams)
    if (r.success) {
      const dates = getDateRange(start7, yStr)
      const map = {}
      Object.entries(r.data).forEach(([date, d]) => {
        map[date] = { budget: sumCountries(d, 'budget'), customer: sumCountries(d, 'newCustomer') }
      })
      trendData.value = dates.map(d => ({
        date: d,
        budget: Math.round((map[d]?.budget || 0)),
        customer: map[d]?.customer || 0
      }))
    }
  } catch (e) { console.error('加载趋势数据失败:', e); loadErrors.value.push('7天趋势') }

  await nextTick()
  initDonut()
  if (trendData.value.length) initTrend()
}

// resize
let resizeTimer
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    donutChart?.resize()
    trendChart?.resize()
  }, 200)
}

onMounted(async () => { await loadAccounts(); load(); window.addEventListener('resize', onResize) })
onUnmounted(() => {
  donutChart?.dispose()
  trendChart?.dispose()
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.dash-page { animation: fadeIn .3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }

/* ====== 顶部 ====== */
.page-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-5); }
.page-top h2 { font-size:var(--text-2xl); font-weight:800; display:flex; align-items:center; gap:var(--space-3); color:var(--text-primary); letter-spacing:-.3px; }
.top-sub { font-size:var(--text-sm); color:var(--text-tertiary); margin-top:var(--space-1); }
.btn-hero { font-weight:700; border-radius:10px; padding:10px 22px; font-size:var(--text-base); }
.btn-hero:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.3); }

/* ====== 昨日修正提醒 ====== */
.yesterday-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 20px; margin-bottom: 16px; background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fde68a; border-radius: 14px; }
.yb-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.yb-title { font-size: 14px; font-weight: 700; color: #92400e; }
.yb-detail { font-size: 13px; color: #a16207; }
.yb-detail b { color: #92400e; }
.yb-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
html.dark .yesterday-banner { background: rgba(251, 191, 36, .08); border-color: rgba(251, 191, 36, .15); }
html.dark .yb-title { color: #fbbf24; }
html.dark .yb-detail { color: #fcd34d; }
html.dark .yb-detail b { color: #fde68a; }

/* ====== 今日快照条 ====== */
.hero-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--space-3); margin-bottom:var(--space-5); }
.hero-card { display:flex; align-items:center; justify-content:space-between; padding:var(--space-5) var(--space-6); border-radius:var(--radius-xl); position:relative; overflow:hidden; cursor:default; transition:all var(--transition-normal); }
.hero-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); }
.hero-budget { background:linear-gradient(135deg, var(--brand-50), #ede9fe); }
.hero-customer { background:linear-gradient(135deg, var(--success-light), #d1fae5); }
.hero-grouped { background:linear-gradient(135deg, var(--warning-light), #fef3c7); }
.hero-vps { background:linear-gradient(135deg, var(--danger-light), #fee2e2); cursor:pointer; }
.hero-vps.clean { background:linear-gradient(135deg, var(--success-light), #d1fae5); }
.hero-left { position:relative; z-index:1; }
.hero-label { font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.6px; margin-bottom:4px; }
.hero-val { font-size:32px; font-weight:800; color:var(--text-primary); line-height:1.1; }
.hero-val.accent { color:var(--brand-600); }
.hero-val.success { color:var(--success); }
.hero-val.danger { color:var(--danger); }
.hero-sub { font-size:11px; color:var(--text-tertiary); margin-top:3px; font-weight:600; display:flex; align-items:center; gap:3px; }
.hero-sub.danger { color:var(--danger); }
.hero-bg-icon { position:absolute; right:14px; bottom:-4px; opacity:.08; color:var(--text-primary); z-index:0; }

/* ====== 中部双栏 ====== */
.mid-split { display:grid; grid-template-columns:320px 1fr; gap:var(--space-3); margin-bottom:var(--space-5); }
.mid-card { background:var(--surface-card); border:1px solid var(--border-default); border-radius:var(--radius-xl); padding:var(--space-5) var(--space-5); box-shadow:var(--shadow-xs); }
.mid-card-hd { font-size:var(--text-base); font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:var(--space-2); margin-bottom:14px; }

.progress-chart-wrap { position:relative; display:flex; justify-content:center; margin-bottom:14px; }
.donut { width:160px; height:160px; }
.donut-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; }
.dc-val { font-size:var(--text-3xl); font-weight:800; color:var(--success); }
.dc-label { font-size:11px; color:var(--text-tertiary); margin-top:2px; }

.progress-bars { display:flex; flex-direction:column; gap:10px; }
.pb-top { display:flex; justify-content:space-between; font-size:12px; color:var(--text-secondary); font-weight:600; margin-bottom:4px; }
.pb-top span { display:flex; align-items:center; gap:4px; }
.pb-dot { width:8px; height:8px; border-radius:50%; }
.pb-track { height:8px; background:var(--border-subtle); border-radius:4px; overflow:hidden; }
.pb-fill { height:100%; border-radius:4px; transition:width .6s cubic-bezier(.4,0,.2,1); }
.pb-fill.blue { background:linear-gradient(90deg,var(--brand-500),var(--brand-400)); }
.pb-fill.green { background:linear-gradient(90deg,var(--success),#34d399); }
.pb-fill.amber { background:linear-gradient(90deg,var(--warning),#fbbf24); }

.chart-card { overflow:hidden; }
.chart-legend { display:flex; align-items:center; gap:12px; margin-left:auto; font-size:11px; color:var(--text-tertiary); font-weight:600; }
.cl-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:3px; }
.trend-chart { height:260px; width:100%; }

/* ====== 快捷入口 ====== */
.quick-section { margin-top:var(--space-1); }
.quick-head { font-size:var(--text-base); font-weight:700; color:var(--text-primary); margin-bottom:var(--space-3); }
.quick-row { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--space-2); }
.quick-card { display:flex; align-items:center; gap:14px; background:var(--surface-card); border:1px solid var(--border-default); border-radius:var(--radius-lg); border-left:3px solid color-mix(in srgb,var(--qc-color,#6366f1) 30%,#fff); padding:var(--space-4) var(--space-4); cursor:pointer; transition:all var(--transition-normal); box-shadow:var(--shadow-xs); }
.quick-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); border-left-color:var(--qc-color,#6366f1); }
.qc-icon-wrap { width:44px; height:44px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; flex-shrink:0; background:color-mix(in srgb,var(--qc-color,#6366f1) 12%,#fff); color:var(--qc-color,#6366f1); }
.qc-text { flex:1; min-width:0; }
.qc-title { font-size:var(--text-base); font-weight:700; color:var(--text-primary); }
.qc-desc { font-size:11px; color:var(--text-tertiary); margin-top:2px; }
.qc-arrow { color:var(--border-strong); flex-shrink:0; transition:color var(--transition-fast); }
.quick-card:hover .qc-arrow { color:var(--qc-color,#6366f1); }

@media (max-width:900px) { .hero-strip{grid-template-columns:repeat(2,1fr)} .mid-split{grid-template-columns:1fr} .quick-row{grid-template-columns:repeat(2,1fr)} }
</style>
