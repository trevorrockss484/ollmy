<template>
  <div class="data-page">
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h2><el-icon :size="22"><DataAnalysis /></el-icon> 数据查询</h2>
          <p class="sub">{{ pageSub }}</p>
        </div>
      </div>
    </div>

    <!-- ====== 筛选 & 操作栏 ====== -->
    <div class="query-toolbar">
      <div class="qt-row">
        <div class="qt-left">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="—"
            start-placeholder="开始"
            end-placeholder="结束"
            size="default"
            style="width:260px;"
            @change="onDateChange"
          />
          <el-select v-model="selectedAccountId" placeholder="广告账号" size="default" style="width:180px;" @change="onAccountChange">
            <el-option label="全部账号" value="all" />
            <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
          <el-select v-model="monthPicked" placeholder="月度汇总" clearable size="default" style="width:160px;" @change="loadMonthly">
            <el-option v-for="m in recentMonths" :key="m" :label="m" :value="m" />
          </el-select>
        </div>
        <div class="qt-right">
          <el-button size="small" @click="exportCSV" :disabled="!list.length"><el-icon :size="14"><Download /></el-icon> 导出CSV</el-button>
          <el-button type="primary" size="small" @click="doQuery" :loading="loading"><el-icon :size="14"><Search /></el-icon> 查询</el-button>
        </div>
      </div>
    </div>

    <!-- ====== 趋势图 ====== -->
    <div v-if="list.length >= 2" class="chart-card">
      <div class="chart-header">
        <span class="chart-title"><el-icon :size="16"><TrendCharts /></el-icon> 数据趋势</span>
        <el-radio-group v-model="chartMetric" size="small">
          <el-radio-button value="budget">消耗</el-radio-button>
          <el-radio-button value="customer">新客户</el-radio-button>
          <el-radio-button value="grouped">拉群</el-radio-button>
        </el-radio-group>
      </div>
      <div ref="chartRef" class="chart-body"></div>
    </div>

    <!-- ====== 数据报告展示区 ====== -->
    <div v-if="list.length" class="report-section">
      <!-- 操作栏 -->
      <div class="report-actions">
        <div class="report-meta">
          <span>{{ accountLabel }}</span>
          <span>{{ rangeAgg.days }} 天</span>
          <span>{{ rangeAgg.countries.length }} 个国家</span>
          <span>总费用 ¥{{ fmtMoney(rangeAgg.totalBudget) }}</span>
          <span>日均 ¥{{ fmtMoney(rangeAgg.dailyAvg) }}</span>
        </div>
        <div class="copy-actions">
          <el-button type="primary" plain size="default" @click="copyCompactReport"><el-icon :size="15"><DocumentCopy /></el-icon> 复制精简版</el-button>
          <el-button type="primary" size="default" @click="copyReportText"><el-icon :size="15"><DocumentCopy /></el-icon> 一键复制报告</el-button>
        </div>
      </div>

      <!-- 一、海外整体汇总 -->
      <div class="summary-card">
        <div class="summary-title"><span class="sec-badge">一</span> 海外整体汇总</div>
        <div class="summary-grid">
          <div class="sg-item"><div class="sg-val">¥{{ fmtMoney(rangeAgg.totalBudget) }}</div><div class="sg-label">1. 总费用</div></div>
          <div class="sg-item"><div class="sg-val">{{ rangeAgg.totalCustomer }} 个</div><div class="sg-label">2. 总客资</div></div>
          <div class="sg-item"><div class="sg-val">{{ rangeAgg.totalGrouped }} 个</div><div class="sg-label">3. 总拉群</div></div>
          <div class="sg-item accent"><div class="sg-val">¥{{ rangeAgg.avg }}</div><div class="sg-label">4. 询盘客价</div></div>
          <div class="sg-item accent"><div class="sg-val">¥{{ rangeAgg.eff }}</div><div class="sg-label">5. 有效客价</div></div>
        </div>
        <div v-if="rangeAgg.groupBreakdown.length" class="summary-breakdown">
          <span class="sb-label">拉群分布</span>
          <el-tag v-for="g in rangeAgg.groupBreakdown" :key="g.country" size="small" round effect="plain" class="sb-tag">{{ g.country }} +{{ g.count }}</el-tag>
        </div>
      </div>

      <!-- 二、每个国家明细 -->
      <div class="country-section">
        <div class="country-section-title"><span class="sec-badge alt">二</span> 每个国家明细 <span class="cs-sub">{{ rangeAgg.countries.length }} 个国家 · 按消耗排序</span></div>
        <div class="country-list">
          <div v-for="(c, index) in rangeAgg.countries" :key="c.name" class="country-item">
            <div class="ci-header">
              <div class="ci-title">
                <span class="ci-index">{{ index + 1 }}</span>
                <span class="ci-name">{{ c.name }}</span>
              </div>
              <span class="ci-mini">¥{{ fmtMoney(c.budget) }} · 拉群 {{ c.grouped }} 个</span>
            </div>
            <div class="ci-metrics">
              <div class="cm"><span class="cm-label">1. 费用</span><span class="cm-val">{{ c.budget > 0 ? '¥' + fmtMoney(c.budget) + ' 元' : '—' }}</span></div>
              <div class="cm"><span class="cm-label">2. 客资</span><span class="cm-val">{{ c.customer > 0 ? c.customer + ' 个' : '—' }}</span></div>
              <div class="cm"><span class="cm-label">3. 拉群</span><span class="cm-val">{{ c.grouped > 0 ? c.grouped + ' 个' : '—' }}</span></div>
              <div class="cm"><span class="cm-label">4. 询盘客价</span><span class="cm-val hl">{{ c.avg ? '¥' + c.avg + ' / 元' : '—' }}</span></div>
              <div class="cm"><span class="cm-label">5. 有效客价</span><span class="cm-val hl">{{ c.eff ? '¥' + c.eff + ' / 元' : '—' }}</span></div>
            </div>
            <div v-if="c.details.length" class="ci-details">
              <div class="ci-details-title">拉群及客户详情（{{ c.grouped }}）</div>
              <div v-for="(d, i) in c.details" :key="i" class="ci-detail-line">{{ d }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 报告预览 -->
      <div class="copy-preview-card">
        <div class="copy-preview-header">
          <div>
            <div class="copy-preview-title">报告预览</div>
            <div class="copy-preview-sub">下方内容会被一键复制，可直接粘贴发送</div>
          </div>
          <div class="copy-actions">
            <el-button type="primary" plain size="small" @click="copyCompactReport"><el-icon :size="14"><DocumentCopy /></el-icon> 复制精简版</el-button>
            <el-button type="primary" plain size="small" @click="copyReportText"><el-icon :size="14"><DocumentCopy /></el-icon> 一键复制</el-button>
          </div>
        </div>
        <div class="copy-preview-content">{{ displayReport }}</div>
      </div>
    </div>

    <!-- ====== 空状态 ====== -->
    <div v-if="!list.length && !loading" class="empty-state">
      <div style="font-size:48px;"><el-icon :size="48"><InfoFilled /></el-icon></div>
      <p>{{ dateRange ? '该范围暂无数据' : '选择日期范围后点击查询' }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { api, formatDateCN, todayStr } from '../api'

const route = useRoute()
const router = useRouter()

const accounts = ref([
  { id: 'lisa-office', name: '莉莎办公家具' },
  { id: 'zhenshan-office', name: '甄珊办公家具' },
  { id: 'xiege-office', name: '谢哥办公家具' },
])
const selectedAccountId = ref('lisa-office')
const accountLabel = computed(() => selectedAccountId.value === 'all' ? '全部账号' : (accounts.value.find(a => a.id === selectedAccountId.value)?.name || '莉莎办公家具'))


// ====== 筛选状态 — URL 优先 ======
const dateRange = ref(null)
const monthPicked = ref(todayStr().substring(0, 7))
const searchText = ref('')

// 最近 12 个月
const recentMonths = computed(() => {
  const now = new Date()
  const ms = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    ms.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))
  }
  return ms
})

// 页面副标题
const pageSub = computed(() => {
  if (dateRange.value?.[0]) return formatDateCN(dateRange.value[0]) + ' — ' + formatDateCN(dateRange.value[1])
  if (monthPicked.value) return monthPicked.value + ' 月度数据'
  return '选择日期范围查询数据'
})

// ====== 加载 / 查询 ======
const loading = ref(false)
const list = ref([])

async function doQuery() {
  if (!dateRange.value?.[0]) {
    // 默认查本月
    const now = new Date()
    dateRange.value = [
      now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01',
      todayStr()
    ]
  }
  loading.value = true
  try {
    const params = { startDate: dateRange.value[0], endDate: dateRange.value[1], accountId: selectedAccountId.value }
    const res = await api.daily.list(params)
    if (res.success) {
      const entries = Object.entries(res.data).sort(([a], [b]) => b.localeCompare(a))
      list.value = []
      for (const [date, d] of entries) {
        const accountEntries = selectedAccountId.value === 'all' && d.accounts
          ? Object.values(d.accounts)
          : [{ accountId: d.accountId || selectedAccountId.value, accountName: d.accountName || accountLabel.value, countries: d.countries || {}, summary: d.summary || '', optimize: d.optimize || '' }]
        for (const acc of accountEntries) {
          const countries = acc.countries || {}
          const gSummary = acc.summary || ''
          const gOptimize = acc.optimize || ''
          for (const [cname, fb] of Object.entries(countries)) {
            const budget = fb.budget || 0
            const customer = fb.newCustomer || 0
            const grouped = fb.grouped || 0
            list.value.push({
              key: date + '|' + (acc.accountId || '') + '|' + cname,
              rawDate: date,
              label: formatDateCN(date),
              accountId: acc.accountId || selectedAccountId.value,
              accountName: acc.accountName || accountLabel.value,
              country: cname,
              fbBudget: budget,
              fbCustomer: customer,
              fbGrouped: grouped,
              avgCost: customer > 0 ? (budget / customer).toFixed(0) : '—',
              conversion: customer > 0 ? Math.round(grouped / customer * 100) : -1,
              _fb: { ...fb, summary: gSummary, optimize: gOptimize },
              _data: d
            })
          }
          if (!Object.keys(countries).length) {
            list.value.push({
              key: date + '|' + (acc.accountId || '') + '|—',
              rawDate: date,
              label: formatDateCN(date),
              accountId: acc.accountId || selectedAccountId.value,
              accountName: acc.accountName || accountLabel.value,
              country: '—',
              fbBudget: 0, fbCustomer: 0, fbGrouped: 0,
              avgCost: '—', conversion: -1,
              _fb: { summary: gSummary, optimize: gOptimize },
              _data: d
            })
          }
        }
      }
      if (list.value.length) {
        await nextTick()
        updateChart()
      }
    }
  } catch (e) { ElMessage.error('查询失败') }
  loading.value = false
}

// ====== 按国家聚合（供卡片与区间日报共用）======
const rangeAgg = computed(() => {
  const agg = {}
  for (const r of list.value) {
    const c = r.country
    if (!c || c === '—') continue
    if (!agg[c]) agg[c] = { budget: 0, customer: 0, grouped: 0, details: [], budgetNote: '', customerNote: '', avgOverride: '', effOverride: '' }
    agg[c].budget += r.fbBudget || 0
    agg[c].customer += r.fbCustomer || 0
    agg[c].grouped += r.fbGrouped || 0
    if (r._fb) {
      // 优先 groupEntries，fallback groupDetail
      if (r._fb.groupEntries && Array.isArray(r._fb.groupEntries)) {
        for (const entry of r._fb.groupEntries) {
          if (entry.text) agg[c].details.push('【' + entry.text + (entry.status ? '，' + entry.status : '') + '】')
        }
      } else if (r._fb.groupDetail) {
        agg[c].details.push(r._fb.groupDetail)
      }
      if (r._fb.budgetNote) agg[c].budgetNote = r._fb.budgetNote
      if (r._fb.customerNote) agg[c].customerNote = r._fb.customerNote
      if (r._fb.avgCostOverride) agg[c].avgOverride = r._fb.avgCostOverride
      if (r._fb.effCostOverride) agg[c].effOverride = r._fb.effCostOverride
    }
  }
  const names = Object.keys(agg).sort((a, b) => (agg[b].budget - agg[a].budget) || (agg[b].grouped - agg[a].grouped))
  let tB = 0, tC = 0, tG = 0
  const gb = []
  for (const c of names) {
    tB += agg[c].budget; tC += agg[c].customer; tG += agg[c].grouped
    if (agg[c].grouped > 0) gb.push({ country: c, count: agg[c].grouped })
    // 去重：多天同一客户只保留一条
    const seen = new Set()
    agg[c].details = agg[c].details.filter(d => {
      const key = d.replace(/，到现场|，未到现场|，待确认/g, '').trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  tB = Math.round(tB * 100) / 100
  const days = new Set(list.value.map(r => r.rawDate)).size
  const countries = names.map(c => {
    const a = agg[c]
    const b = Math.round(a.budget * 100) / 100
    return {
      name: c, budget: b, customer: a.customer, grouped: a.grouped,
      details: splitDetails(a.details.join('')),
      budgetNote: a.budgetNote,
      customerNote: a.customerNote,
      avg: a.avgOverride || ((b && a.customer) ? (b / a.customer).toFixed(1) : ''),
      eff: a.effOverride || ((b && a.grouped) ? (b / a.grouped).toFixed(1) : '')
    }
  })
  return {
    countries, totalBudget: tB, totalCustomer: tC, totalGrouped: tG, groupBreakdown: gb,
    avg: (tB && tC) ? (tB / tC).toFixed(1) : '0',
    eff: (tB && tG) ? (tB / tG).toFixed(1) : '0',
    days, dailyAvg: days ? Math.round(tB / days) : 0
  }
})

// ====== ECharts ======
const chartRef = ref(null)
const chartMetric = ref('budget')
let chartInstance = null

watch(chartMetric, () => updateChart())

function updateChart() {
  if (!chartRef.value || !list.value.length) return
  if (!chartInstance) chartInstance = echarts.init(chartRef.value)

  const dates = [...new Set(list.value.map(r => r.rawDate))].sort()
  const key = chartMetric.value
  const labelMap = { budget: 'FB消耗(元)', customer: '新客户', grouped: '拉群' }
  const colorMap = { budget: '#6366f1', customer: '#10b981', grouped: '#f59e0b' }

  const data = dates.map(d => {
    const rows = list.value.filter(r => r.rawDate === d)
    let val = 0
    if (key === 'budget') val = rows.reduce((s, r) => s + r.fbBudget, 0)
    else if (key === 'customer') val = rows.reduce((s, r) => s + r.fbCustomer, 0)
    else val = rows.reduce((s, r) => s + r.fbGrouped, 0)
    return val
  })

  chartInstance.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 10, right: 20, top: 10, bottom: 5, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates.map(d => d.substring(5)),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#9ca3af', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      axisLabel: { color: '#9ca3af', fontSize: 10 }
    },
    series: [{
      data, type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
      lineStyle: { color: colorMap[key], width: 2 },
      itemStyle: { color: colorMap[key] },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: colorMap[key] + '30' },
        { offset: 1, color: colorMap[key] + '05' }
      ]) }
    }]
  }, true)
}

// ====== 月份快选：选中某月即查询整月 ======
function loadMonthly() {
  if (!monthPicked.value) return
  const [y, m] = monthPicked.value.split('-')
  const lastDay = new Date(+y, +m, 0).getDate()
  dateRange.value = [`${y}-${m}-01`, `${y}-${m}-${String(lastDay).padStart(2, '0')}`]
  doQuery()
}

const displayReport = computed(() => buildRangeReport())
const compactReport = computed(() => buildCompactReport())


// 金额格式：千分位，固定保留 2 位小数
function fmtMoney(v) { const r = Math.round((v || 0) * 100) / 100; return r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
// 把「【…】【…】」文本拆成一条一行；无【】则整体包一层
function splitDetails(text) { const t = (text || '').trim(); if (!t) return []; const m = t.match(/【[^】]*】/g); if (m && m.length) return m; return ['【' + t + '】'] }

function getDateLabel() {
  const s = dateRange.value?.[0], e = dateRange.value?.[1] || s
  if (!s) return ''
  const sp = s.split('-'), ep = e.split('-')
  let dateLabel = `${+sp[0]}.${+sp[1]}.${+sp[2]}`
  if (s !== e) dateLabel += (sp[0] === ep[0] ? ` - ${+ep[1]}.${+ep[2]}` : ` - ${+ep[0]}.${+ep[1]}.${+ep[2]}`)
  return dateLabel
}

function formatCount(v, unit = '个') { return Number(v) > 0 ? `${v}${unit}` : (Number(v) === 0 ? '0' : '') }
function formatMoneyText(v) { return Number(v) > 0 ? `${fmtMoney(v)} 元` : '' }
function formatBudgetLine(c) { return `${formatMoneyText(c.budget)}${c.budgetNote || ''}` }
function formatCustomerLine(c) { return `${Number(c.customer) > 0 ? c.customer + ' 个' : ''}${c.customerNote || ''}` }
function formatCostText(v) { return v !== '' && v != null ? `${v} / 元` : '' }

// 生成用户指定格式的区间报告（读取 rangeAgg，与卡片同源）
function buildRangeReport() {
  const ra = rangeAgg.value
  if (!ra.countries.length) return ''
  const groupSummary = ra.groupBreakdown.map(g => `${g.country} ${g.count}`).join(' + ')
  const dateLabel = getDateLabel()

  let text = `${dateLabel} 海外投流数据总结

一、海外整体汇总

1. 总费用：${fmtMoney(ra.totalBudget)} 元
2. 总客资：${ra.totalCustomer} 个
3. 总拉群及客户详情：${ra.totalGrouped}个`
  if (groupSummary) text += `
（${groupSummary}）`
  text += `
4. 询盘客价：${ra.avg} 元
5. 有效客价：${ra.eff} 元

二、每个国家明细`

  ra.countries.forEach((c) => {
    text += `

----------

▌${c.name}

1. 费用：${formatBudgetLine(c)}
2. 客资：${formatCustomerLine(c)}
3. 总拉群及客户详情：${formatCount(c.grouped)}`
    if (c.details.length) text += `
▷
${c.details.join('\n')}
▷`
    text += `
4. 询盘客价：${formatCostText(c.avg)}
5. 有效客价：${formatCostText(c.eff)}`
  })

  text += `

----------`
  return text
}

function buildCompactReport() {
  return buildRangeReport()
}

async function copyText(text, successMsg = '报告已复制，可直接粘贴') {
  if (!text) {
    ElMessage.warning('暂无可复制的报告')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(successMsg)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    ta.style.top = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    try {
      const ok = document.execCommand('copy')
      if (ok) ElMessage.success(successMsg)
      else ElMessage.error('复制失败，请手动复制')
    } catch {
      ElMessage.error('复制失败，请手动复制')
    } finally {
      document.body.removeChild(ta)
    }
  }
}

async function copyCompactReport() {
  await copyText(compactReport.value, '精简版已复制，可直接粘贴')
}

async function copyReportText() {
  await copyText(displayReport.value)
}

function exportCSV() {
  const headers = ['日期', '账号', '国家', '美金', '费用(元)', '新客户', '拉群', '询盘客价', '有效客价', '拉群详情', '总结', '优化方向']
  let csv = '﻿' + headers.join(',') + '\n'
  list.value.forEach(r => {
    const fb = r._fb || {}
    // 优先 groupEntries，fallback groupDetail
    let detailStr = ''
    if (fb.groupEntries && Array.isArray(fb.groupEntries)) {
      detailStr = fb.groupEntries.filter(e => e.text).map(e => '【' + e.text + (e.status ? '，' + e.status : '') + '】').join('')
    } else {
      detailStr = fb.groupDetail || ''
    }
    const budget = r.fbBudget || 0
    const customer = r.fbCustomer || 0
    const grouped = r.fbGrouped || 0
    const avgCost = customer > 0 ? Math.round(budget / customer) : 0
    const effCost = grouped > 0 ? Math.round(budget / grouped) : 0
    csv += [
      r.rawDate, r.accountName || '', r.country, fb.usdBudget || 0,
      budget, customer, grouped, avgCost, effCost,
      '"' + detailStr.replace(/"/g, '""') + '"',
      '"' + (fb.summary || '').replace(/"/g, '""') + '"',
      '"' + (fb.optimize || '').replace(/"/g, '""') + '"'
    ].join(',') + '\n'
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = '运营数据_' + (dateRange.value?.[0] || 'all') + '_' + (dateRange.value?.[1] || '') + '.csv'
  a.click()
  ElMessage.success('CSV 已下载')
}

// ====== URL 状态持久化 ======
function onDateChange() { doQuery() }
function onAccountChange() { doQuery() }

async function loadAccounts() {
  try {
    const res = await api.daily.accounts()
    if (res.success && Array.isArray(res.data) && res.data.length) accounts.value = res.data
  } catch {}
}

function restoreFromURL() {
  const q = new URLSearchParams(window.location.search)
  if (q.get('start')) dateRange.value = [q.get('start'), q.get('end') || q.get('start')]
  if (q.get('month')) monthPicked.value = q.get('month')
}

watch([dateRange], () => {
  const q = {}
  if (dateRange.value?.[0]) { q.start = dateRange.value[0]; q.end = dateRange.value[1] }
  router.replace({ query: q })
}, { deep: true })

// ====== 初始化 ======
onMounted(async () => {
  restoreFromURL()
  await loadAccounts()
  window.addEventListener('resize', handleResize)
  // 确保有默认日期并自动查询
  if (!dateRange.value) {
    const now = new Date()
    dateRange.value = [now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01', todayStr()]
  }
  nextTick(() => doQuery())
})

onUnmounted(() => {
  chartInstance?.dispose()
  window.removeEventListener('resize', handleResize)
})

function handleResize() { chartInstance?.resize() }
</script>

<style scoped>
.data-page {
  animation: fadeIn .4s cubic-bezier(.4,0,.2,1);
  max-width: 1280px;
  margin: 0 auto;
  padding-bottom: 40px;
}
@keyframes fadeIn { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
.page-header { margin-bottom:24px; }
.page-header h2 { font-size:24px; font-weight:800; display:flex; align-items:center; gap:10px; color:#1e1b4b; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:6px; letter-spacing:.3px; }
.header-right { display:flex; align-items:center; gap:10px; }

/* ====== 筛选栏 ====== */
.query-toolbar {
  background:#fff; border:1px solid #e5e7eb; border-radius:16px;
  padding:16px 20px; margin-bottom:24px;
  box-shadow:0 2px 8px rgba(0,0,0,.04), 0 0 0 1px rgba(99,102,241,.04);
  backdrop-filter:blur(8px);
}
.qt-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; justify-content:space-between; }
.qt-left { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.qt-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

/* ====== 趋势图 ====== */
.chart-card {
  background:#fff; border:1px solid #e5e7eb; border-radius:16px;
  margin-bottom:24px; overflow:hidden;
  box-shadow:0 2px 8px rgba(0,0,0,.04);
}
.chart-header {
  display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;
  padding:16px 20px; border-bottom:1px solid #f3f4f6;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}
.chart-title { font-size:14px; font-weight:700; color:#374151; display:flex; align-items:center; gap:6px; }
.chart-body { height:280px; }

/* ====== 数据报告展示区 ====== */
.report-section { display:flex; flex-direction:column; gap:18px; }
.report-actions {
  display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap;
  padding:16px 18px; border:1px solid #e0e7ff; border-radius:16px;
  background:linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  box-shadow:0 2px 10px rgba(99,102,241,.08);
}
.report-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; color:#4b5563; font-size:13px; font-weight:600; }
.report-meta span {
  padding:6px 10px; border-radius:999px; background:rgba(255,255,255,.78);
  border:1px solid rgba(224,231,255,.9);
}
.summary-card, .country-section, .copy-preview-card {
  background:#fff; border:1px solid #e5e7eb; border-radius:18px;
  box-shadow:0 2px 12px rgba(15,23,42,.05); overflow:hidden;
}
.summary-card { padding:20px; }
.summary-title, .country-section-title {
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  font-size:16px; font-weight:800; color:#111827; margin-bottom:16px;
}
.sec-badge {
  display:inline-flex; align-items:center; justify-content:center;
  width:26px; height:26px; border-radius:9px;
  color:#fff; background:linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  font-size:13px; box-shadow:0 8px 18px rgba(99,102,241,.24);
}
.sec-badge.alt { background:linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow:0 8px 18px rgba(16,185,129,.2); }
.cs-sub { font-size:12px; font-weight:600; color:#9ca3af; }
.summary-grid { display:grid; grid-template-columns:repeat(5, minmax(120px, 1fr)); gap:12px; }
.sg-item {
  min-height:92px; padding:14px; border-radius:14px;
  background:linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
  border:1px solid #eef2f7;
}
.sg-item.accent { background:linear-gradient(135deg, #eef2ff 0%, #ffffff 100%); border-color:#c7d2fe; }
.sg-val { font-size:22px; font-weight:850; color:#111827; line-height:1.2; word-break:break-word; }
.sg-item.accent .sg-val { color:#4f46e5; }
.sg-label { margin-top:8px; font-size:12px; color:#6b7280; font-weight:700; }
.summary-breakdown {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  margin-top:16px; padding:12px 14px; border-radius:14px;
  background:#f8fafc; border:1px dashed #dbe4f0;
}
.sb-label { font-size:13px; font-weight:800; color:#374151; margin-right:2px; }
.sb-tag { border-color:#c7d2fe; color:#4f46e5; background:#eef2ff; }

.country-section { padding:20px; }
.country-list { display:grid; grid-template-columns:1fr; gap:14px; }
.country-item {
  border:1px solid #e5e7eb; border-radius:16px; padding:16px;
  background:linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}
.ci-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
.ci-title { display:flex; align-items:center; gap:10px; min-width:0; }
.ci-index {
  display:inline-flex; align-items:center; justify-content:center;
  width:26px; height:26px; border-radius:50%; background:#eef2ff; color:#4f46e5;
  font-size:13px; font-weight:800; flex:0 0 auto;
}
.ci-name { font-size:17px; font-weight:850; color:#1f2937; }
.ci-mini { font-size:12px; color:#6b7280; font-weight:700; background:#f3f4f6; padding:6px 10px; border-radius:999px; }
.ci-metrics { display:grid; grid-template-columns:repeat(5, minmax(110px, 1fr)); gap:10px; }
.cm {
  display:flex; flex-direction:column; gap:6px; min-height:72px;
  padding:12px; border-radius:12px; background:#f9fafb; border:1px solid #eef2f7;
}
.cm-label { font-size:12px; color:#6b7280; font-weight:700; }
.cm-val { font-size:15px; color:#111827; font-weight:800; word-break:break-word; }
.cm-val.hl { color:#4f46e5; }
.ci-details {
  margin-top:12px; padding:12px; border-radius:14px;
  background:#f8fafc; border:1px solid #e5e7eb;
}
.ci-details-title { font-size:13px; font-weight:800; color:#374151; margin-bottom:8px; }
.ci-detail-line {
  display: block; line-height:1.7; font-size:13px; color:#374151;
  background:#fff; border:1px solid #e5e7eb; border-radius:8px;
  padding:10px 14px; margin-top:4px;
}

.copy-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

.copy-preview-card { margin-bottom:4px; }
.copy-preview-header {
  display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  padding:16px 18px; border-bottom:1px solid #eef2f7;
  background:linear-gradient(135deg, #fafafa 0%, #f8fafc 100%);
}
.copy-preview-title { font-size:15px; font-weight:850; color:#111827; }
.copy-preview-sub { margin-top:4px; font-size:12px; color:#6b7280; }
.copy-preview-content {
  white-space:pre-wrap; line-height:1.9; font-size:13px; color:#1f2937;
  padding:16px 18px; max-height:360px; overflow-y:auto; background:#fff;
}

/* ====== 空状态 ====== */
.empty-state { text-align:center; padding:80px 20px; color:#9ca3af; }
.empty-state p { margin-top:10px; font-size:14px; }

/* ====== 过渡 ====== */
.fade-enter-active, .fade-leave-active { transition: all .25s ease; }
.fade-enter-from, .fade-leave-to { opacity:0; transform:translateY(8px); }

@media (max-width: 900px) {
  .summary-grid, .ci-metrics { grid-template-columns:repeat(2, minmax(0, 1fr)); }
  .qt-row, .chart-header, .report-actions { align-items:stretch; }
  .qt-left, .qt-right { width:100%; }
  .qt-right { justify-content:flex-end; }
}

@media (max-width: 700px) {
  .data-page { padding-bottom:24px; }
  .query-toolbar, .summary-card, .country-section { padding:14px; }
  .report-actions, .copy-preview-header { padding:14px; }
  .copy-preview-content { padding:14px 16px; font-size:13px; }
}

@media (max-width: 560px) {
  .summary-grid, .ci-metrics { grid-template-columns:1fr; }
  .qt-left :deep(.el-date-editor), .qt-left :deep(.el-select) { width:100% !important; }
  .qt-right { justify-content:stretch; }
  .qt-right :deep(.el-button) { flex:1; }
  .sg-val { font-size:20px; }
}
</style>
