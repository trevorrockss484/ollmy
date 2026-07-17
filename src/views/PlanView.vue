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
        <el-select v-model="selectedAccountId" placeholder="选择账号" size="small" style="width:150px;margin-right:6px" @change="onAccountChange">
          <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
        </el-select>
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
            <div class="ov-val">{{ s.fbCustomer }}<span class="ov-unit">/{{ budgets.inquiryGoal }}</span></div>
            <div class="ov-label">{{ goalLabel('inquiry') }}</div>
          </div>
        </div>
        <div class="ov-card">
          <div class="ov-icon-wrap" style="background:#ecfdf5;color:#059669;"><el-icon :size="20"><ChatDotRound /></el-icon></div>
          <div class="ov-info">
            <div class="ov-val success">{{ s.fbGrouped }}<span class="ov-unit">/{{ budgets.groupGoal }}</span></div>
            <div class="ov-label">{{ goalLabel('group') }}</div>
          </div>
        </div>
        <div class="ov-card">
          <div class="ov-icon-wrap" style="background:#fef2f2;color:#ef4444;"><el-icon :size="20"><Money /></el-icon></div>
          <div class="ov-info">
            <div class="ov-val" :class="bPct > 90 ? 'danger' : ''">¥{{ fmtK(s.fbBudget) }}<span class="ov-unit">/¥{{ fmtK(budgets.weekBudget) }}</span></div>
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
              <div class="dl-sub">/ {{ budgets.groupGoal }} 拉群</div>
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
              <span class="df-val">{{ Math.max(0, (budgets.groupGoal||0) - s.fbGrouped) }}</span>
              <span class="df-label">剩余</span>
            </div>
          </div>
        </div>

        <!-- 中：消耗进度 -->
        <div class="mid-card mid-spend">
          <div class="mid-card-hd">本周消耗</div>
          <div class="spend-meter">
            <div class="spend-big">¥{{ fmtK(s.fbBudget) }}</div>
            <div class="spend-sub">/ ¥{{ fmtK(budgets.weekBudget) }}</div>
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
        <div class="daily-table-v2">
          <div class="dv-head">
            <span class="dv-hcell dv-hcell--date">日期</span>
            <span class="dv-hcell">美金 $</span>
            <span class="dv-hcell">消耗 ¥</span>
            <span class="dv-hcell">新客户</span>
            <span class="dv-hcell">拉群</span>
            <span class="dv-hcell dv-hcell--st">状态</span>
          </div>
          <div
            v-for="d in dayCards"
            :key="d.date"
            class="dv-row"
            :class="{ 'dv--done': d.completed, 'dv--today': d.isToday }"
            @click="goToReport(d)"
          >
            <div class="dv-cell dv-cell--date">
              <div class="dv-date-box" :class="{ 'dv-date-box--today': d.isToday }">
                <span class="dv-day-name">{{ d.dayName }}</span>
                <span class="dv-day-num">{{ formatDayOnly(d.date) }}</span>
              </div>
              <el-tag v-if="d.isToday" type="primary" size="small" effect="dark" round>今天</el-tag>
            </div>
            <div class="dv-cell dv-cell--usd">
              <span v-if="d.completed" class="dv-val">${{ fmtK(d.fbUsdBudget) }}</span>
              <span v-else class="dv-na">—</span>
            </div>
            <div class="dv-cell dv-cell--budget">
              <span v-if="d.completed" class="dv-val">¥{{ Math.round(d.fbBudget) }}</span>
              <span v-else class="dv-na">—</span>
            </div>
            <div class="dv-cell">
              <span v-if="d.completed" class="dv-stat">{{ d.fbCustomer || '0' }}</span>
              <span v-else class="dv-na">—</span>
            </div>
            <div class="dv-cell dv-cell--grouped">
              <span v-if="d.completed" class="dv-stat dv-stat--green">{{ d.fbGrouped || '0' }}</span>
              <span v-else class="dv-na">—</span>
            </div>
            <div class="dv-cell dv-cell--st">
              <span v-if="d.completed" class="dv-badge dv-badge--done">✓ 已填报</span>
              <span v-else class="dv-badge dv-badge--todo">待填写</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== 设置弹窗 ====== -->
      <el-dialog v-model="settingsOpen" title="本周设置" width="620px" @opened="onSettingsOpened">
        <el-alert :title="'当前编辑账号：' + (selectedAccountId ? (accounts.find(a=>a.id===selectedAccountId)||{}).name||selectedAccountId : '未选择')" type="info" :closable="false" show-icon style="margin-bottom:12px" />
        <el-form label-width="80px" size="default">
          <el-row :gutter="12">
            <el-col :span="12"><el-form-item label="开始日期"><el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="结束日期"><el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="日预算"><el-input-number v-model="form.dailyBudget" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="周预算"><el-input-number v-model="form.weekBudget" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="询盘目标"><el-input-number v-model="form.inquiryGoal" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="拉群目标"><el-input-number v-model="form.groupGoal" :min="0" style="width:100%" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="覆盖国家">
              <el-tree ref="treeRef" :data="countryTreeData" show-checkbox node-key="key" :default-checked-keys="form.countries" :props="{ label:'label', children:'children' }" default-expand-all @check="onTreeCheck" style="max-height:280px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;" />
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

// 账号选择
const accounts = ref([])
const selectedAccountId = ref(localStorage.getItem('plan_accountId') || '')

// 当前账号的预算解析
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

const iPct = computed(() => budgets.value.inquiryGoal ? Math.min(100, Math.round(s.fbCustomer / budgets.value.inquiryGoal * 100)) : 0)
const groupPct = computed(() => budgets.value.groupGoal ? Math.min(100, Math.round(s.fbGrouped / budgets.value.groupGoal * 100)) : 0)
const bPct = computed(() => budgets.value.weekBudget ? Math.min(100, Math.round(s.fbBudget / budgets.value.weekBudget * 100)) : 0)

function goalLabel(key) {
  const pct = key === 'inquiry' ? iPct.value : key === 'group' ? groupPct.value : bPct.value
  return (key === 'inquiry' ? '新客户' : key === 'group' ? '拉群' : '消耗') + ' · ' + (pct || 0) + '%'
}

const flagMap = { 印度尼西亚:"id", 印尼:"id", 越南:"vn", 泰国:"th", 菲律宾:"ph", 马来西亚:"my", 新加坡:"sg", 缅甸:"mm", 柬埔寨:"kh", 尼日利亚:"ng", 埃塞俄比亚:"et", 南非:"za", 肯尼亚:"ke", 加纳:"gh", 埃及:"eg", 阿联酋:"ae", 沙特阿拉伯:"sa", 沙特:"sa", 土耳其:"tr", 卡塔尔:"qa", 印度:"in", 巴基斯坦:"pk", 孟加拉国:"bd", 孟加拉:"bd", 日本:"jp", 韩国:"kr", 巴西:"br", 墨西哥:"mx", 哥伦比亚:"co", 阿根廷:"ar", 美国:"us", 英国:"gb", 德国:"de", 法国:"fr", 澳大利亚:"au", 俄罗斯:"ru" }
function flagCode(name) { return flagMap[name] || "" }

function fmtReportMoney(n) {
  const v = Number(n || 0)
  return v ? (Math.round(v * 100) / 100).toFixed(2) : '0.00'
}
function fmtReportCost(n) {
  const v = Number(n || 0)
  return v ? (Math.round(v * 100) / 100).toFixed(2) : '0.00'
}
function splitDetails(text) {
  const t = (text || '').trim()
  if (!t) return []
  const m = t.match(/【[^】]*】/g)
  if (m && m.length) return m
  return ['【' + t + '】']
}
function buildWeekReportText() {
  if (!week.value) return ''
  const countryAgg = {}
  for (const record of Object.values(dailyData.value || {})) {
    const countries = record?.countries || {}
    for (const [name, fb] of Object.entries(countries)) {
      if (!countryAgg[name]) countryAgg[name] = { budget: 0, customer: 0, grouped: 0, details: [] }
      countryAgg[name].budget += Number(fb.budget || 0)
      countryAgg[name].customer += Number(fb.newCustomer || 0)
      countryAgg[name].grouped += Number(fb.grouped || 0)
      if (fb.groupDetail) countryAgg[name].details.push(fb.groupDetail)
      // 新格式 groupEntries
      if (fb.groupEntries && Array.isArray(fb.groupEntries)) {
        for (const entry of fb.groupEntries) {
          if (entry.text) countryAgg[name].details.push('【' + entry.text + (entry.status ? '，' + entry.status : '') + '】')
        }
      }
    }
  }
  const countries = Object.entries(countryAgg)
    .map(([name, v]) => ({
      name,
      budget: Math.round(v.budget * 100) / 100,
      customer: v.customer,
      grouped: v.grouped,
      details: splitDetails(v.details.join('')),
    }))
    .sort((a, b) => (b.budget - a.budget) || (b.grouped - a.grouped))
  if (!countries.length) return ''

  const totalBudget = countries.reduce((sum, c) => sum + c.budget, 0)
  const totalCustomer = countries.reduce((sum, c) => sum + c.customer, 0)
  const totalGrouped = countries.reduce((sum, c) => sum + c.grouped, 0)
  const groupBreakdown = countries.filter(c => c.grouped > 0).map(c => `${c.name}+${c.grouped}`).join('  ')
  const title = `${shortDate(week.value.startDate)} - ${shortDate(week.value.endDate)} 海外投流数据总结`

  let text = `${title}

一、今日海外整体汇总

1. 总费用：${fmtReportMoney(totalBudget)}
2. 总客资：${totalCustomer}
3. 总拉群及客户详情：${totalGrouped}`
  if (groupBreakdown) text += `
▷
（${groupBreakdown}）
▷`
  text += `
4. 询盘客价：${fmtReportCost(totalCustomer ? totalBudget / totalCustomer : 0)} 元
5. 有效客价：${fmtReportCost(totalGrouped ? totalBudget / totalGrouped : 0)} 元

二、每个国家明细`

  for (const c of countries) {
    const avg = c.customer ? c.budget / c.customer : 0
    const eff = c.grouped ? c.budget / c.grouped : 0
    text += `

----------

▌${c.name}

1. 费用：${fmtReportMoney(c.budget)} 元
2. 客资：${c.customer} 个
3. 总拉群及客户详情：${c.grouped} 个`
    if (c.details.length) text += `
▷
${c.details.join('\n')}
▷`
    text += `
4. 询盘客价：${fmtReportCost(avg)} / 元
5. 有效客价：${fmtReportCost(eff)} / 元`
  }
  text += `

----------`
  return text
}

async function copyWeekSummary() {
  const text = buildWeekReportText()
  if (!text) { ElMessage.warning('本周暂无可复制数据'); return }
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('本周汇总已复制')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy'); ElMessage.success('本周汇总已复制') }
    catch { ElMessage.error('复制失败，请手动复制') }
    document.body.removeChild(ta)
  }
}

function fmtK(n) {
  const v = Math.round(n || 0)
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v)
}

const dayCards = computed(() =>
  days.value.map(date => {
    const d = dailyData.value[date]
    let fbBudget = 0, fbUsdBudget = 0, fbCustomer = 0, fbGrouped = 0
    if (d?.countries) {
      Object.values(d.countries).forEach(c => {
        fbBudget += c.budget || 0
        fbUsdBudget += c.usdBudget || 0
        fbCustomer += c.newCustomer || 0
        fbGrouped += c.grouped || 0
      })
    }
    return {
      date, dayName: getDayName(date), completed: !!d, isToday: date === todayStr(),
      fbBudget, fbUsdBudget, fbCustomer, fbGrouped
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
        { value: Math.max(0, (budgets.value.groupGoal || 0) - s.fbGrouped), itemStyle: { color: '#f3f4f6' } }
      ]
    }]
  })
  animateNumber(prevVal || 0, groupPct.value, 1400)
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
      localStorage.setItem('plan_accountId', selectedAccountId.value)
    }
  } catch (e) { console.error('加载账号列表失败:', e) }
}

function onAccountChange() {
  localStorage.setItem('plan_accountId', selectedAccountId.value)
  const w = week.value
  if (!w) return
  loadWeekData(w)
  nextTick(() => initDonut())
}

async function loadWeekData(w) {
  const aid = selectedAccountId.value || undefined
  const params = { startDate: w.startDate, endDate: w.endDate }
  if (aid) params.accountId = aid
  try {
    const [sumRes, dailyRes] = await Promise.all([
      api.summary.weekly(params),
      api.daily.list(params)
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
    const w = weekStore.currentWeek
    if (!w) return
    const b = budgets.value
    form.value = { startDate: w.startDate, endDate: w.endDate, dailyBudget: b.dailyBudget, weekBudget: b.weekBudget, inquiryGoal: b.inquiryGoal, groupGoal: b.groupGoal, countries: [...(w.countries || [])] }
  }
  settingsOpen.value = true
}

function onSettingsOpened() {
  if (treeRef.value && form.value.countries.length) {
    treeRef.value.setCheckedKeys(form.value.countries)
  }
}

async function saveSettings() {
  if (!week.value?.id) { ElMessage.error('未找到当前周计划'); return }
  const w = week.value
  const aid = selectedAccountId.value
  // 构建 accountBudgets
  const accountBudgets = { ...(w.accountBudgets || {}) }
  accountBudgets[aid] = {
    dailyBudget: form.value.dailyBudget,
    weekBudget: form.value.weekBudget,
    inquiryGoal: form.value.inquiryGoal,
    groupGoal: form.value.groupGoal,
  }
  const res = await weekStore.updateWeek(w.id, {
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    countries: form.value.countries,
    accountBudgets,
  })
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
  const b = budgets.value
  return { startDate: fmt(mon), endDate: fmt(sun), dailyBudget: b.dailyBudget || 300, weekBudget: b.weekBudget || 1500, inquiryGoal: b.inquiryGoal || 400, groupGoal: b.groupGoal || 20, countries: [...(week.value?.countries || [])], accountBudgets: week.value?.accountBudgets ? JSON.parse(JSON.stringify(week.value.accountBudgets)) : {} }
}

function openCreateWeek() { newWeekForm.value = getNextWeekDefaults(); newWeekMode.value = 'quick'; newWeekOpen.value = true }

async function doCreateWeek() {
  const data = { ...newWeekForm.value }
  // 移除临时预算字段，只保留 accountBudgets
  delete data.dailyBudget; delete data.weekBudget; delete data.inquiryGoal; delete data.groupGoal
  const res = await weekStore.createWeek(data)
  if (res.success) {
    newWeekOpen.value = false
    ElMessage.success('新周计划已创建')
    const w = week.value || res.data
    if (w && w.startDate && w.endDate) {
      const b = budgets.value
      form.value = { startDate:w.startDate,endDate:w.endDate,dailyBudget:b.dailyBudget,weekBudget:b.weekBudget,inquiryGoal:b.inquiryGoal,groupGoal:b.groupGoal,countries:[...(w.countries||[])] }
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
    const b = budgets.value
    form.value = { startDate:w.startDate,endDate:w.endDate,dailyBudget:b.dailyBudget,weekBudget:b.weekBudget,inquiryGoal:b.inquiryGoal,groupGoal:b.groupGoal,countries:[...(w.countries||[])] }
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
watch([() => s.fbGrouped, () => budgets.value.groupGoal], () => {
  nextTick(() => initDonut())
})

function onResize() { donutChart?.resize() }

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await loadAccounts()
  await weekStore.load()
  if (!week.value) await weekStore.createWeek()
  const w = week.value
  if (!w) return
  const b = budgets.value
  form.value = {
    startDate: w.startDate, endDate: w.endDate, dailyBudget: b.dailyBudget,
    weekBudget: b.weekBudget, inquiryGoal: b.inquiryGoal, groupGoal: b.groupGoal,
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

/* ====== 每日完成表格 V2 ====== */
.daily-table-v2 {
  display: flex; flex-direction: column;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  overflow: hidden;
}
.dv-head {
  display: grid; grid-template-columns: 110px 0.8fr 1fr 0.7fr 0.7fr 80px;
  gap: 4px; padding: 6px 10px; align-items: center;
  background: #f9fafb; border-bottom: 1px solid #e5e7eb;
}
.dv-hcell {
  font-size: 10px; font-weight: 700; color: #9ca3af;
  text-transform: uppercase; letter-spacing: .3px; text-align: right;
}
.dv-hcell--date { text-align: left; }
.dv-hcell--st { text-align: center; }

.dv-row {
  display: grid; grid-template-columns: 110px 0.8fr 1fr 0.7fr 0.7fr 80px;
  gap: 4px; align-items: center;
  padding: 8px 10px; border-bottom: 1px solid #f3f4f6;
  cursor: pointer; transition: all .12s; background: #fff;
}
.dv-row:hover { background: #fafaff; }
.dv-row:last-of-type { border-bottom: none; }
.dv-row.dv--today {
  background: linear-gradient(90deg, #eef2ff 0%, #f5f3ff 30%, #fff 100%);
}
.dv-row.dv--done {
  border-left: 3px solid #10b981;
}

/* 日期格 */
.dv-cell--date { display: flex; align-items: center; gap: 6px; }
.dv-date-box {
  display: flex; align-items: center; gap: 8px;
  padding: 3px 0; min-width: 68px;
}
.dv-day-name { font-size: 10px; font-weight: 700; color: #9ca3af; width: 28px; line-height: 1; }
.dv-row.dv--today .dv-day-name { color: #6366f1; }
.dv-day-num { font-size: 15px; font-weight: 800; color: #111827; line-height: 1; }
.dv-row.dv--today .dv-day-num { color: #6366f1; }

/* 数据格 */
.dv-cell {
  display: flex; align-items: center; justify-content: flex-end;
  padding: 0 2px;
}
.dv-cell--date { justify-content: flex-start; }
.dv-cell--st { justify-content: center; }
.dv-val { font-size: 14px; font-weight: 700; color: #1f2937; }
.dv-cell--usd .dv-val { color: #a16207; }
.dv-cell--budget .dv-val { color: #6366f1; }
.dv-stat { font-size: 14px; font-weight: 700; color: #1f2937; }
.dv-stat--green { color: #059669; }
.dv-na { font-size: 14px; color: #d1d5db; font-weight: 600; }

/* 状态徽章 */
.dv-badge {
  display: inline-flex; align-items: center;
  padding: 3px 8px; border-radius: 10px;
  font-size: 10px; font-weight: 700; white-space: nowrap;
}
.dv-badge--done { background: #ecfdf5; color: #059669; }
.dv-badge--todo { background: #f3f4f6; color: #9ca3af; }

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
  .dv-head, .dv-row { grid-template-columns: 100px 1fr 1fr 60px 50px 70px; }
}
</style>
