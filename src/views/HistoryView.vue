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
          <el-select v-model="filterCountry" placeholder="全部国家" clearable size="default" style="width:140px;" @change="onFilterChange">
            <el-option v-for="c in countries" :key="c" :label="c" :value="c" />
          </el-select>
          <el-select v-model="monthPicked" placeholder="月度汇总" clearable size="default" style="width:160px;" @change="loadMonthly">
            <el-option v-for="m in recentMonths" :key="m" :label="m" :value="m" />
          </el-select>
        </div>
        <div class="qt-right">
          <el-button size="small" @click="exportCSV" :disabled="!list.length"><el-icon :size="14"><Download /></el-icon> 导出CSV</el-button>
          <el-button size="small" @click="generateAndCopy" :disabled="!monthSummary"><el-icon :size="14"><DocumentCopy /></el-icon> 生成并复制月报</el-button>
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

    <!-- ====== 统计卡片 ====== -->
    <div class="summary-section">
      <div class="summary-top">
        <span class="summary-title">📊 数据汇总</span>
        <el-button size="small" round @click="copySummary">一键复制汇总数据</el-button>
      </div>
      <div class="summary-row">
        <div class="summary-card">
          <div class="sc-icon" style="background:#eef2ff;color:#6366f1;"><el-icon :size="20"><Calendar /></el-icon></div>
          <div class="sc-info"><div class="sc-val">{{ list.length }}</div><div class="sc-label">记录数</div></div>
        </div>
        <div class="summary-card">
          <div class="sc-icon" style="background:#fff7ed;color:#ea580c;"><el-icon :size="20"><Money /></el-icon></div>
          <div class="sc-info"><div class="sc-val">¥{{ fmtNum(totals.fbBudget) }}</div><div class="sc-label">总消耗</div></div>
        </div>
        <div class="summary-card">
          <div class="sc-icon" style="background:#ecfdf5;color:#059669;"><el-icon :size="20"><UserFilled /></el-icon></div>
          <div class="sc-info"><div class="sc-val">{{ totals.fbCustomer }}</div><div class="sc-label">总询盘客户</div></div>
        </div>
        <div class="summary-card">
          <div class="sc-icon" style="background:#ecfdf5;color:#059669;"><el-icon :size="20"><ChatDotRound /></el-icon></div>
          <div class="sc-info"><div class="sc-val success">{{ totals.fbGrouped }}</div><div class="sc-label">已拉群客户</div></div>
        </div>
        <div class="summary-card">
          <div class="sc-icon" style="background:#fef2f2;color:#ef4444;"><el-icon :size="20"><TrendCharts /></el-icon></div>
          <div class="sc-info"><div class="sc-val" style="color:#ef4444;">¥{{ effectiveCost }}</div><div class="sc-label">有效客户成本</div></div>
        </div>
        <div class="summary-card">
          <div class="sc-icon" style="background:#f3e8ff;color:#9333ea;"><el-icon :size="20"><DataAnalysis /></el-icon></div>
          <div class="sc-info"><div class="sc-val">¥{{ dailyAvgCost }}</div><div class="sc-label">日均成本</div></div>
        </div>
        <div class="summary-card">
          <div class="sc-icon" style="background:#e0f2fe;color:#0284c7;"><el-icon :size="20"><CollectionTag /></el-icon></div>
          <div class="sc-info"><div class="sc-val">¥{{ costPerInquiry }}</div><div class="sc-label">询盘客户成本</div></div>
        </div>
      </div>
    </div>

    <!-- ====== 月报快照 ====== -->
    <transition name="fade">
      <div v-if="reportText" class="report-snack">
        <div class="report-snack-left">
          <el-icon :size="16"><CircleCheckFilled /></el-icon>
          <span>{{ monthPicked }} 月报已生成并复制到剪贴板</span>
        </div>
        <el-button size="small" text @click="reportText = ''"><el-icon><Close /></el-icon></el-button>
      </div>
    </transition>

    <!-- ====== 空状态 ====== -->
    <div v-if="!list.length && !loading" class="empty-state">
      <div style="font-size:48px;"><el-icon :size="48"><InfoFilled /></el-icon></div>
      <p>{{ dateRange ? '该范围暂无数据' : '选择日期范围后点击查询' }}</p>
    </div>

    <!-- ====== 数据表格 ====== -->
    <div v-else class="table-shell">
      <div class="table-thead">
        <div class="th th-date">日期</div>
        <div class="th">国家</div>
        <div class="th">FB消耗</div>
        <div class="th">FB新客户</div>
        <div class="th">FB拉群</div>
        <div class="th">客均成本</div>
        <div class="th">转化率</div>
        <div class="th th-act">操作</div>
      </div>

      <template v-for="row in pagedList" :key="row.key">
        <div class="table-tr" :class="{ expanded: expandedKey === row.key }" @click="toggleRow(row)">
          <div class="td td-date">{{ row.label }}</div>
          <div class="td"><el-tag size="small" effect="plain" round>{{ row.country }}</el-tag></div>
          <div class="td price">¥{{ fmtNum(row.fbBudget) }}</div>
          <div class="td">{{ row.fbCustomer }}</div>
          <div class="td highlight">{{ row.fbGrouped }}</div>
          <div class="td">¥{{ row.avgCost }}</div>
          <div class="td" :class="{ 'conv-good': row.conversion >= 50, 'conv-warn': row.conversion < 30 && row.conversion >= 0 }">{{ row.conversion >= 0 ? row.conversion + '%' : '—' }}</div>
          <div class="td td-act" @click.stop>
            <el-button link type="primary" size="small" @click="editRow(row)"><el-icon :size="13"><View /></el-icon></el-button>
            <el-button link type="danger" size="small" @click="delRow(row)"><el-icon :size="13"><Delete /></el-icon></el-button>
          </div>
        </div>

        <!-- 展开详情 -->
        <transition name="slide">
          <div v-if="expandedKey === row.key" class="table-detail">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">消耗预算</span>
                <span class="detail-val">¥{{ fmtNum(row.fbBudget) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">新客户</span>
                <span class="detail-val">{{ row.fbCustomer }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">拉群</span>
                <span class="detail-val">{{ row.fbGrouped }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">客均成本</span>
                <span class="detail-val">¥{{ row.avgCost }}</span>
              </div>
              <div class="detail-item" v-if="row._fb">
                <span class="detail-label">发目录未回</span>
                <span class="detail-val">{{ row._fb.catNoReply || 0 }}</span>
              </div>
              <div class="detail-item" v-if="row._fb">
                <span class="detail-label">发信息未理会</span>
                <span class="detail-val">{{ row._fb.msgIgnore || 0 }}</span>
              </div>
              <div class="detail-item" v-if="row._fb">
                <span class="detail-label">低预算</span>
                <span class="detail-val">{{ row._fb.lowBudget || 0 }}</span>
              </div>
              <div class="detail-item" v-if="row._fb">
                <span class="detail-label">同行/骚扰/参观未定</span>
                <span class="detail-val">{{ (row._fb.competitor||0) + (row._fb.harass||0) + (row._fb.visitPending||0) }}</span>
              </div>
            </div>
            <div class="detail-notes" v-if="row._fb">
              <template v-if="row._fb.groupDetail">
                <span class="detail-label">拉群详情</span>
                <p>{{ row._fb.groupDetail }}</p>
              </template>
              <template v-if="row._fb.summary">
                <span class="detail-label">总结</span>
                <p>{{ row._fb.summary }}</p>
              </template>
              <template v-if="row._fb.optimize">
                <span class="detail-label">优化方向</span>
                <p>{{ row._fb.optimize }}</p>
              </template>
            </div>
          </div>
        </transition>
      </template>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="table-pager">
        <el-pagination
          v-model:current-page="curPage"
          :page-size="pageSize"
          :total="list.length"
          layout="prev, pager, next, total"
          size="small"
          background
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import { api, formatDateCN, todayStr } from '../api'

const route = useRoute()
const router = useRouter()

const countries = ['综合', '印度尼西亚', '越南', '埃塞俄比亚', '尼日利亚', '南非']


// ====== 筛选状态 — URL 优先 ======
const dateRange = ref(null)
const filterCountry = ref('')
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
const monthSummary = ref(null)
const reportText = ref('')

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
  expandedKey.value = null
  curPage.value = 1
  try {
    const params = { startDate: dateRange.value[0], endDate: dateRange.value[1] }
    if (filterCountry.value) params.country = filterCountry.value
    const res = await api.daily.list(params)
    if (res.success) {
      const entries = Object.entries(res.data).sort(([a], [b]) => b.localeCompare(a))
      list.value = entries.map(([date, d]) => {
        const fb = d.fb || {}
        const budget = fb.budget || 0
        const customer = fb.newCustomer || 0
        const grouped = fb.grouped || 0
        return {
          key: date + (d.country || ''),
          rawDate: date,
          label: formatDateCN(date),
          country: d.country || '—',
          fbBudget: budget,
          fbCustomer: customer,
          fbGrouped: grouped,
          avgCost: customer > 0 ? (budget / customer).toFixed(0) : '—',
          conversion: customer > 0 ? Math.round(grouped / customer * 100) : -1,
          _fb: fb,
          _work: d.work,
          _data: d
        }
      })
      if (list.value.length) {
        await nextTick()
        updateChart()
      }
    }
  } catch (e) { ElMessage.error('查询失败') }
  loading.value = false
}

// ====== 分页 ======
const pageSize = 20
const curPage = ref(1)
const totalPages = computed(() => Math.ceil(list.value.length / pageSize))
const pagedList = computed(() => {
  const start = (curPage.value - 1) * pageSize
  return list.value.slice(start, start + pageSize)
})

// ====== 展开行 ======
const expandedKey = ref(null)
function toggleRow(row) {
  expandedKey.value = expandedKey.value === row.key ? null : row.key
}

// ====== 统计 ======
const totals = computed(() => {
  const t = { fbBudget: 0, fbCustomer: 0, fbGrouped: 0 }
  list.value.forEach(r => { t.fbBudget += r.fbBudget; t.fbCustomer += r.fbCustomer; t.fbGrouped += r.fbGrouped })
  return t
})

const effectiveCost = computed(() =>
  totals.value.fbGrouped > 0 ? (totals.value.fbBudget / totals.value.fbGrouped).toFixed(0) : '—'
)
const dailyAvgCost = computed(() =>
  list.value.length > 0 ? Math.round(totals.value.fbBudget / list.value.length) : '—'
)
const costPerInquiry = computed(() =>
  totals.value.fbCustomer > 0 ? (totals.value.fbBudget / totals.value.fbCustomer).toFixed(1) : '—'
)
const conversion = computed(() =>
  totals.value.fbCustomer > 0 ? Math.round(totals.value.fbGrouped / totals.value.fbCustomer * 100) : 0
)

function fmtNum(n) { return Math.round(n).toLocaleString() }

async function copySummary() {
  if (!list.value.length) { ElMessage.warning('暂无数据可复制'); return }
  const t = totals.value
  const rangeLabel = dateRange.value?.[0]
    ? dateRange.value[0] + ' — ' + dateRange.value[1]
    : '全部'
  const days = list.value.length
  const text = `⭐${rangeLabel}数据汇总：
1. 总询盘客户：${t.fbCustomer} 个
2. 已拉群客户：${t.fbGrouped} 个
3. 总消耗：¥${fmtNum(t.fbBudget)}
4. 有效客户成本：¥${effectiveCost.value}/个
5. 日均成本：¥${dailyAvgCost.value}
6. 询盘客户成本：¥${costPerInquiry.value}
7. 统计天数：${days} 天`
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('汇总数据已复制')
  } catch {
    const ta = document.createElement('textarea'); ta.value = text
    document.body.appendChild(ta); ta.select(); document.execCommand('copy')
    document.body.removeChild(ta); ElMessage.success('已复制')
  }
}

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

// ====== 月度汇总 ======
async function loadMonthly() {
  if (!monthPicked.value) return
  reportText.value = ''
  try {
    const res = await api.summary.monthly(monthPicked.value)
    if (res.success) monthSummary.value = res.data
    else { monthSummary.value = null; ElMessage.warning('该月份暂无数据') }
  } catch (e) { monthSummary.value = null }
}

async function generateAndCopy() {
  if (!monthSummary.value) { ElMessage.warning('请先选择月份加载月度汇总'); return }
  const s = monthSummary.value
  const [y, m] = monthPicked.value.split('-')
  const lastDay = new Date(+y, +m, 0).getDate()
  const validRate = s.fbCustomer > 0 ? (s.fbGrouped / s.fbCustomer * 100).toFixed(1) : '0'

  reportText.value = `【海外运营月度总结】${y}年${parseInt(m)}月
━━━━━━━━━━━━━━━━━━
周期：${y}年${parseInt(m)}月1日 - ${y}年${parseInt(m)}月${lastDay}日
工作天数：${s.days} 天

预算使用：
· FB IG 总消耗：¥${Math.round(s.fbBudget)}
· 合计消耗：¥${Math.round(s.totalBudget)}
· 日均消耗：¥${Math.round(s.totalBudget / s.days)}

客户数据：
· FB IG 新客户：${s.fbCustomer} 个（客均 ¥${s.fbAvgCost}）
· FB IG 拉群：${s.fbGrouped} 个（转化率 ${validRate}%）

FB IG 客户分类：
· 发目录未回：${s.fbCatNoReply} 个
· 发信息未理会：${s.fbMsgIgnore} 个
· 已拉群：${s.fbGrouped} 个
· 低预算：${s.fbLowBudget} 个
· 同行：${s.fbCompetitor} 个
· 骚扰：${s.fbHarass} 个
· 计划参观未定：${s.fbVisitPending} 个

优化建议：
· 提高客户精准度，降低无效客户比例
· 高预算重点投放东南亚市场
· 小预算测试非洲市场
━━━━━━━━━━━━━━━━━━
海外运营部`

  try {
    await navigator.clipboard.writeText(reportText.value)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = reportText.value
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
  }
  ElMessage.success('月报已复制到剪贴板')
}

// ====== 操作 ======
function editRow(row) {
  if (row._data) {
    sessionStorage.setItem('editDaily', JSON.stringify({ date: row.rawDate, data: row._data }))
    router.push('/report')
  }
}

async function delRow(row) {
  try { await ElMessageBox.confirm('确定删除该日报？', '确认', { type: 'warning' }) } catch { return }
  await api.daily.delete(row.rawDate)
  ElMessage.success('已删除')
  doQuery()
}

function exportCSV() {
  const headers = ['日期', '国家', 'FB消耗', 'FB新客户', 'FB拉群', '客均成本', '转化率',
    '发目录未回', '发信息未理会', '低预算', '同行', '骚扰', '参观未定', '拉群详情', '总结', '优化方向']
  let csv = '﻿' + headers.join(',') + '\n'
  list.value.forEach(r => {
    const fb = r._fb || {}
    csv += [r.rawDate, r.country, r.fbBudget, r.fbCustomer, r.fbGrouped,
      typeof r.avgCost === 'string' ? 0 : r.avgCost, r.conversion,
      fb.catNoReply || 0, fb.msgIgnore || 0, fb.lowBudget || 0,
      fb.competitor || 0, fb.harass || 0, fb.visitPending || 0,
      '"' + (fb.groupDetail || '').replace(/"/g, '""') + '"',
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
function onFilterChange() { doQuery() }

function restoreFromURL() {
  const q = new URLSearchParams(window.location.search)
  if (q.get('start')) dateRange.value = [q.get('start'), q.get('end') || q.get('start')]
  if (q.get('country')) filterCountry.value = q.get('country')
  if (q.get('month')) monthPicked.value = q.get('month')
}

watch([dateRange, filterCountry], () => {
  const q = {}
  if (dateRange.value?.[0]) { q.start = dateRange.value[0]; q.end = dateRange.value[1] }
  if (filterCountry.value) q.country = filterCountry.value
}, { deep: true })

// ====== 初始化 ======
onMounted(() => {
  restoreFromURL()
  window.addEventListener('resize', handleResize)
  // 确保有默认日期并自动查询
  if (!dateRange.value) {
    const now = new Date()
    dateRange.value = [now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01', todayStr()]
  }
  nextTick(() => doQuery())
  if (monthPicked.value) loadMonthly()
})

onUnmounted(() => {
  chartInstance?.dispose()
  window.removeEventListener('resize', handleResize)
})

function handleResize() { chartInstance?.resize() }
</script>

<style scoped>
.data-page { animation: fadeIn .3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
.page-header { margin-bottom:20px; }
.page-header h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }
.header-right { display:flex; align-items:center; gap:10px; }

/* ====== 筛选栏 ====== */
.query-toolbar {
  background:#fff; border:1px solid #e5e7eb; border-radius:14px;
  padding:14px 18px; margin-bottom:20px;
  box-shadow:0 1px 3px rgba(0,0,0,.03);
}
.qt-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:space-between; }
.qt-left { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.qt-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

/* ====== 趋势图 ====== */
.chart-card {
  background:#fff; border:1px solid #e5e7eb; border-radius:14px;
  margin-bottom:20px; overflow:hidden;
  box-shadow:0 1px 3px rgba(0,0,0,.03);
}
.chart-header {
  display:flex; justify-content:space-between; align-items:center;
  padding:14px 18px; border-bottom:1px solid #f3f4f6;
}
.chart-title { font-size:14px; font-weight:700; color:#374151; display:flex; align-items:center; gap:6px; }
.chart-body { height:260px; }

/* ====== 统计卡 ====== */
.summary-section { margin-bottom:20px; }
.summary-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.summary-title { font-size:15px; font-weight:700; color:#111827; }
.summary-row { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; }
.summary-card {
  display:flex; align-items:center; gap:14px;
  background:#fff; border-radius:16px; padding:18px 20px;
  border:1px solid #e5e7eb;
  box-shadow:0 1px 3px rgba(0,0,0,.03);
  transition:all 0.2s;
}
.summary-card:hover {
  box-shadow:0 4px 16px rgba(0,0,0,.06);
  transform:translateY(-2px);
}
.sc-icon {
  width:48px; height:48px; border-radius:14px;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.sc-val { font-size:24px; font-weight:800; color:#1f2937; line-height:1.2; }
.sc-val.success { color:#059669; }
.sc-label { font-size:12px; color:#9ca3af; font-weight:600; margin-top:3px; }

/* ====== 月报提示条 ====== */
.report-snack {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 16px; margin-bottom:16px;
  background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px;
  font-size:13px; font-weight:600; color:#047857;
}
.report-snack-left { display:flex; align-items:center; gap:8px; }

/* ====== 空状态 ====== */
.empty-state { text-align:center; padding:60px 20px; color:#9ca3af; }
.empty-state p { margin-top:8px; }

/* ====== 表格 ====== */
.table-shell {
  background:#fff; border:1px solid #e5e7eb; border-radius:14px;
  overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.03);
}

.table-thead {
  display:grid;
  grid-template-columns:130px 90px repeat(3,1fr) 80px 70px 90px;
  background:#f9fafb; border-bottom:1px solid #e5e7eb;
  position:sticky; top:0; z-index:2;
}
.th {
  padding:12px 12px; font-size:11px; font-weight:800; color:#9ca3af;
  letter-spacing:.3px; text-align:right; display:flex; align-items:center; justify-content:flex-end;
}
.th-date { text-align:left; justify-content:flex-start; padding-left:20px; }
.th-act { text-align:center; justify-content:center; }

.table-tr {
  display:grid;
  grid-template-columns:130px 90px repeat(3,1fr) 80px 70px 90px;
  border-bottom:1px solid #f3f4f6; cursor:pointer;
  transition:background 0.1s; background:#fff;
}
.table-tr:hover { background:#fafaff; }
.table-tr.expanded { background:#f8faff; border-color:#e0e7ff; }
.table-tr:last-of-type { border-bottom:none; }

.td {
  padding:13px 12px; font-size:13px; font-weight:600; color:#1f2937;
  text-align:right; display:flex; align-items:center; justify-content:flex-end;
}
.td-date { justify-content:flex-start; padding-left:20px; font-weight:700; }
.td.price { color:#6366f1; font-weight:700; }
.td.highlight { color:#059669; font-weight:700; }
.td.conv-good { color:#059669; }
.td.conv-warn { color:#f59e0b; }
.td-act { justify-content:center; gap:2px; }

/* 展开详情 */
.table-detail {
  padding:16px 24px 18px;
  background:#fafbff; border-bottom:1px solid #e0e7ff;
}
.detail-grid {
  display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr));
  gap:10px; margin-bottom:12px;
}
.detail-item {
  display:flex; flex-direction:column; gap:2px;
  padding:8px 12px; background:#fff; border-radius:8px;
  border:1px solid #e5e7eb;
}
.detail-label { font-size:10px; color:#9ca3af; font-weight:600; text-transform:uppercase; }
.detail-val { font-size:14px; font-weight:700; color:#1f2937; }
.detail-notes { margin-top:6px; }
.detail-notes p {
  margin:4px 0 10px; font-size:13px; color:#6b7280; line-height:1.6;
  padding:8px 12px; background:#fff; border-radius:8px; border:1px solid #f3f4f6;
}

/* 分页 */
.table-pager {
  display:flex; justify-content:center;
  padding:14px 20px; border-top:1px solid #f3f4f6;
}

/* ====== 过渡 ====== */
.fade-enter-active, .fade-leave-active { transition:opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity:0; }
.slide-enter-active, .slide-leave-active { transition:all .25s ease; }
.slide-enter-from, .slide-leave-to { opacity:0; max-height:0; }
.slide-enter-to, .slide-leave-from { max-height:600px; }
</style>
