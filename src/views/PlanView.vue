<template>
  <div>
    <!-- 顶部栏 -->
    <div class="top-bar">
      <div class="week-tabs-scroll">
        <div
          v-for="w in visibleWeeks"
          :key="w.id"
          class="week-tab"
          :class="{ active: w.id === week?.id }"
          @click="switchToWeek(w.id)"
        >
          <span class="week-tab-dates">{{ shortDate(w.startDate) }} – {{ shortDate(w.endDate) }}</span>
          <span class="week-tab-target">询盘{{ w.inquiryGoal }} · 拉群{{ w.groupGoal }}</span>
          <span
            v-if="visibleWeeks.length > 1"
            class="week-tab-close"
            @click.stop="closeWeekTab(w)"
          >✕</span>
        </div>
      </div>

      <div class="top-bar-actions">
        <el-button size="small" @click="openCreateWeek">➕ 新增周</el-button>
        <el-button size="small" type="primary" @click="openSettings">⚙️ 设置</el-button>
      </div>
    </div>

    <!-- 已关闭的周 -->
    <div v-if="hiddenWeeks.length" class="hidden-weeks-bar">
      <span style="font-size:11px;color:#9ca3af;margin-right:8px;">📂 已关闭</span>
      <span
        v-for="w in hiddenWeeks"
        :key="w.id"
        class="hidden-week-chip"
      >
        <span class="hidden-week-link" @click="restoreWeekTab(w.id)">{{ shortDate(w.startDate) }} – {{ shortDate(w.endDate) }}</span>
        <span class="hidden-week-del" @click="permDeleteWeekTab(w)" title="永久删除">✕</span>
      </span>
    </div>

    <!-- 信息条 -->
    <div v-if="week" class="plan-info-bar">
      <div class="plan-info-left">
        <div class="plan-info-date">
          <span class="plan-info-month">{{ formatMonth(week.startDate) }}</span>
          <span class="plan-info-days">{{ formatDay(week.startDate) }} – {{ formatDay(week.endDate) }}</span>
        </div>
        <div class="plan-info-meta">
          <div class="plan-meta-item">
            <el-icon :size="14"><Calendar /></el-icon>
            <span>{{ days.length }} 天</span>
          </div>
          <div class="plan-meta-divider">|</div>
          <div class="plan-meta-item done">
            <div class="plan-meta-dot"></div>
            <span>{{ completedDays }}/{{ days.length }} 已完成</span>
          </div>
          <div class="plan-meta-divider">|</div>
          <div class="plan-meta-item">
            <span>🌍</span>
            <span>{{ week.countries?.length || 0 }} 个国家</span>
          </div>
        </div>
      </div>
      <div class="plan-info-countries">
        <el-tag v-for="c in week.countries" :key="c" type="primary" effect="light" round size="small">{{ c }}</el-tag>
      </div>
    </div>

    <div v-if="!week" style="text-align:center;padding:60px;">
      <el-icon :size="48" style="color:#ccc;"><Loading /></el-icon>
      <p style="color:#9ca3af;margin-top:12px;">加载中...</p>
    </div>

    <template v-else>
      <!-- 统计卡 -->
      <el-row :gutter="16" style="margin-bottom:20px;">
        <el-col :span="6"><div class="stat-card"><div class="stat-value">{{ s.fbCustomer }}</div><div class="stat-label">FB新客户 / 目标 {{ week.inquiryGoal }}</div></div></el-col>
        <el-col :span="6"><div class="stat-card"><div class="stat-value success">{{ s.fbGrouped }}</div><div class="stat-label">FB拉群 / {{ week.groupGoal }}</div></div></el-col>
        <el-col :span="6"><div class="stat-card"><div class="stat-value" :class="bPct>90?'danger':bPct>70?'warning':''">¥{{ Math.round(s.fbBudget) }}</div><div class="stat-label">FB消耗 / 周预算 ¥{{ week.weekBudget }}</div></div></el-col>
        <el-col :span="6"><div class="stat-card"><div class="stat-value" style="color:#6366f1;">¥{{ s.fbCustomer>0?(s.fbBudget/s.fbCustomer).toFixed(1):'—' }}</div><div class="stat-label">FB客均成本</div></div></el-col>
      </el-row>

      <!-- 进度 -->
      <el-card shadow="never" class="progress-card">
        <template #header><b>📊 目标进度</b></template>
        <div class="progress-section">
          <div class="progress-top"><span class="progress-title">📈 FB新客户</span><span class="progress-nums">{{ s.fbCustomer }} <span style="color:#9ca3af;font-weight:400;">/ {{ week.inquiryGoal }}</span></span></div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill theme-blue" :style="{width: iPct+'%'}"><span v-if="iPct>=12" class="progress-pct">{{ iPct }}%</span></div><span v-if="iPct<12" class="progress-pct outside">{{ iPct }}%</span></div>
        </div>
        <div class="progress-section">
          <div class="progress-top"><span class="progress-title">💬 FB拉群</span><span class="progress-nums">{{ s.fbGrouped }} <span style="color:#9ca3af;font-weight:400;">/ {{ week.groupGoal }}</span></span></div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill theme-green" :style="{width: gPct+'%'}"><span v-if="gPct>=12" class="progress-pct">{{ gPct }}%</span></div><span v-if="gPct<12" class="progress-pct outside">{{ gPct }}%</span></div>
        </div>
        <div class="progress-section last">
          <div class="progress-top"><span class="progress-title">💰 FB预算使用</span><span class="progress-nums">¥{{ Math.round(s.fbBudget) }} <span style="color:#9ca3af;font-weight:400;">/ ¥{{ week.weekBudget }}</span></span></div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" :class="bPct>90?'theme-red':bPct>70?'theme-orange':'theme-blue'" :style="{width: bPct+'%'}"><span v-if="bPct>=12" class="progress-pct">{{ bPct }}%</span></div><span v-if="bPct<12" class="progress-pct outside">{{ bPct }}%</span></div>
        </div>
      </el-card>
      <div class="day-list-card" style="margin-bottom:20px;">
        <div class="day-list-header">
          <b>📅 每日完成情况</b>
          <span style="font-size:12px;color:#9ca3af;">💡 在日报页面保存后自动更新 · 点击行查看/编辑</span>
        </div>
        <div class="day-table-wrap">
          <div class="day-table">
            <div class="day-thead">
              <div class="day-th day-th--date">日期</div>
              <div class="day-th">FB消耗</div>
              <div class="day-th">FB客户</div>
              <div class="day-th">FB拉群</div>
              <div class="day-th">TX消耗</div>
              <div class="day-th">TX客户</div>
              <div class="day-th">TX有效</div>
              <div class="day-th day-th--status">状态</div>
            </div>
            <div
              v-for="(d, i) in dayCards" :key="d.date"
              class="day-tr"
              :class="{
                completed: d.completed,
                today: d.isToday,
                first: i === 0,
                last: i === dayCards.length - 1
              }"
              @click="goToReport(d)"
            >
              <div class="day-td day-td--date">
                <div class="day-td-day">{{ d.dayName }}</div>
                <div class="day-td-date">{{ formatDate(d.date) }}</div>
                <el-tag v-if="d.isToday" type="primary" size="small" effect="dark" class="day-today-tag">今天</el-tag>
              </div>

              <template v-if="d.completed">
                <div class="day-td price">¥{{ Math.round(d.fbBudget) }}</div>
                <div class="day-td">{{ d.fbCustomer || '—' }}</div>
                <div class="day-td highlight">{{ d.fbGrouped || '—' }}</div>
                <div class="day-td price">¥{{ Math.round(d.txBudget) }}</div>
                <div class="day-td">{{ d.txCustomer || '—' }}</div>
                <div class="day-td">{{ d.txEffective || '—' }}</div>
                <div class="day-td day-td--status">
                  <span class="day-status-dot done"></span>
                  已填报
                </div>
              </template>
              <template v-else>
                <div class="day-td dim">—</div>
                <div class="day-td dim">—</div>
                <div class="day-td dim">—</div>
                <div class="day-td dim">—</div>
                <div class="day-td dim">—</div>
                <div class="day-td dim">—</div>
                <div class="day-td day-td--status">
                  <span class="day-status-dot empty"></span>
                  待填写
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 设置弹窗 -->
      <el-dialog v-model="settingsOpen" title="⚙️ 本周设置" width="620px" destroy-on-close>
        <el-form label-width="80px" size="default">
          <el-row :gutter="12">
            <el-col :span="12"><el-form-item label="开始日期"><el-date-picker :model-value="form.startDate" @update:model-value="onDateChange('startDate',$event)" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="结束日期"><el-date-picker :model-value="form.endDate" @update:model-value="onDateChange('endDate',$event)" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="日预算"><el-input-number v-model="form.dailyBudget" :min="0" style="width:100%" controls-position="right" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="周预算"><el-input-number v-model="form.weekBudget" :min="0" style="width:100%" controls-position="right" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="询盘目标"><el-input-number v-model="form.inquiryGoal" :min="0" style="width:100%" controls-position="right" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="拉群目标"><el-input-number v-model="form.groupGoal" :min="0" style="width:100%" controls-position="right" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="覆盖国家">
              <el-tree ref="countryTreeRef" :data="countryTreeData" show-checkbox node-key="key" :props="{ label:'label', children:'children' }" :default-checked-keys="form.countries" default-expand-all @check="onCountryCheck" style="max-height:280px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;" />
            </el-form-item></el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button type="danger" @click="deleteThisWeek" style="margin-right:auto;">🗑 删除本周</el-button>
          <el-button @click="settingsOpen = false">取消</el-button>
          <el-button type="primary" @click="saveSettings">💾 保存</el-button>
        </template>
      </el-dialog>

      <!-- 新增周弹窗 -->
      <el-dialog v-model="newWeekOpen" title="➕ 新增周计划" width="620px" destroy-on-close>
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <el-radio-group v-model="newWeekMode" size="default">
            <el-radio-button value="quick">📅 快速新增（下周）</el-radio-button>
            <el-radio-button value="custom">✏️ 自定义新增</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="newWeekMode === 'quick'" style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:12px;">
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div><span style="font-size:12px;color:#9ca3af;">日期</span><br><b>{{ newWeekForm.startDate }} — {{ newWeekForm.endDate }}</b></div>
            <div><span style="font-size:12px;color:#9ca3af;">日预算</span><br><b>¥{{ newWeekForm.dailyBudget }}</b></div>
            <div><span style="font-size:12px;color:#9ca3af;">周预算</span><br><b>¥{{ newWeekForm.weekBudget }}</b></div>
            <div><span style="font-size:12px;color:#9ca3af;">询盘目标</span><br><b>{{ newWeekForm.inquiryGoal }}</b></div>
            <div><span style="font-size:12px;color:#9ca3af;">拉群目标</span><br><b>{{ newWeekForm.groupGoal }}</b></div>
          </div>
          <div style="margin-top:10px;"><span style="font-size:12px;color:#9ca3af;">覆盖国家</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;"><el-tag v-for="c in newWeekForm.countries" :key="c" size="small">{{ c }}</el-tag></div></div>
          <el-alert style="margin-top:12px;" title="快速新增将继承当前周的全部设置，日期自动设为下一周" type="info" :closable="false" show-icon />
        </div>
        <el-form v-if="newWeekMode === 'custom'" label-width="80px" size="default">
          <el-row :gutter="12">
            <el-col :span="12"><el-form-item label="开始日期"><el-date-picker :model-value="newWeekForm.startDate" @update:model-value="onNewDateChange('startDate',$event)" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="结束日期"><el-date-picker :model-value="newWeekForm.endDate" @update:model-value="onNewDateChange('endDate',$event)" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="日预算"><el-input-number v-model="newWeekForm.dailyBudget" :min="0" style="width:100%" controls-position="right" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="周预算"><el-input-number v-model="newWeekForm.weekBudget" :min="0" style="width:100%" controls-position="right" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="询盘目标"><el-input-number v-model="newWeekForm.inquiryGoal" :min="0" style="width:100%" controls-position="right" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="拉群目标"><el-input-number v-model="newWeekForm.groupGoal" :min="0" style="width:100%" controls-position="right" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="覆盖国家">
              <el-tree :data="countryTreeData" show-checkbox node-key="key" :props="{ label:'label', children:'children' }" :default-checked-keys="newWeekForm.countries" default-expand-all @check="onNewWeekCountryCheck" style="max-height:260px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;" />
            </el-form-item></el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button @click="newWeekOpen = false">取消</el-button>
          <el-button type="primary" @click="doCreateWeek">💾 创建</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useWeekStore } from '../stores/week'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, formatDate, formatDateCN, getDateRange, getDayName, todayStr } from '../api'

const weekStore = useWeekStore()
const router = useRouter()
const week = computed(() => weekStore.currentWeek)

function shortDate(str) { return str ? formatDate(str) : '' }
function formatMonth(str) {
  if (!str) return ''
  const p = str.split('-')
  return p[0] + '年' + parseInt(p[1]) + '月'
}
function formatDay(str) {
  if (!str) return ''
  return parseInt(str.split('-')[2]) + '日'
}

function dateToStr(v) {
  if (!v) return ''
  if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : (new Date(v)).getFullYear()+'-'+String(new Date(v).getMonth()+1).padStart(2,'0')+'-'+String(new Date(v).getDate()).padStart(2,'0')
  if (v instanceof Date) return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0')
  return ''
}
function onDateChange(field, v) { form.value[field] = dateToStr(v) }
function onNewDateChange(field, v) { newWeekForm.value[field] = dateToStr(v) }

const countryTreeData = [
  { key:'southeast-asia', label:'🌏 东南亚', children:['印度尼西亚','越南','菲律宾','泰国','马来西亚','新加坡','缅甸','柬埔寨','老挝'].map(c=>({key:c,label:c})) },
  { key:'africa', label:'🌍 非洲', children:['尼日利亚','埃塞俄比亚','南非','肯尼亚','加纳','坦桑尼亚','埃及','摩洛哥','乌干达'].map(c=>({key:c,label:c})) },
  { key:'latin-america', label:'🌎 拉美', children:['巴西','墨西哥','哥伦比亚','阿根廷','秘鲁','智利'].map(c=>({key:c,label:c})) },
  { key:'middle-east', label:'🌍 中东', children:['阿联酋','沙特阿拉伯','土耳其','卡塔尔','阿曼','科威特'].map(c=>({key:c,label:c})) },
  { key:'south-asia', label:'🌏 南亚', children:['印度','巴基斯坦','孟加拉国','斯里兰卡'].map(c=>({key:c,label:c})) },
  { key:'central-asia', label:'🌍 中亚/独联体', children:['哈萨克斯坦','乌兹别克斯坦','俄罗斯'].map(c=>({key:c,label:c})) },
  { key:'east-asia', label:'🌏 东亚', children:['日本','韩国'].map(c=>({key:c,label:c})) },
  { key:'other', label:'🌍 其他', children:['美国','英国','德国','法国','澳大利亚','加拿大'].map(c=>({key:c,label:c})) }
]
const allLeafKeys = countryTreeData.flatMap(g => g.children.map(c => c.key))
const countryTreeRef = ref(null)
function onCountryCheck(_node, checked) { form.value.countries = checked.checkedKeys.filter(k => allLeafKeys.includes(k)) }

const s = ref({ fbBudget:0, fbCustomer:0, fbGrouped:0, txBudget:0, txCustomer:0, txEffective:0, totalBudget:0 })
const dailyData = ref({})
const days = computed(() => week.value ? getDateRange(week.value.startDate,week.value.endDate) : [])
const completedDays = computed(() => days.value.filter(d => dailyData.value[d]).length)
const iPct = computed(() => week.value ? Math.min(100,Math.round(s.value.fbCustomer/week.value.inquiryGoal*100)) : 0)
const gPct = computed(() => week.value ? Math.min(100,Math.round(s.value.fbGrouped/week.value.groupGoal*100)) : 0)
const bPct = computed(() => week.value ? Math.min(100,Math.round(s.value.fbBudget/week.value.weekBudget*100)) : 0)

const dayCards = computed(() => days.value.map(date => {
  const d = dailyData.value[date]
  return { date, dayName:getDayName(date), completed:!!d, isToday:date===todayStr(), fbBudget:d?.fb?.budget||0, fbCustomer:d?.fb?.newCustomer||0, fbGrouped:d?.fb?.grouped||0, txBudget:d?.tx?.budget||0, txCustomer:d?.tx?.newCustomer||0, txEffective:d?.tx?.effective||0 }
}))

// 可见/隐藏周
const visibleWeeks = computed(() => weekStore.weeks.filter(w => !w.hidden))
const hiddenWeeks = computed(() => weekStore.weeks.filter(w => w.hidden))

const settingsOpen = ref(false)
const form = ref({ startDate:'', endDate:'', dailyBudget:300, weekBudget:1500, inquiryGoal:400, groupGoal:20, countries:[] })

const newWeekOpen = ref(false)
const newWeekMode = ref('quick')
const newWeekForm = ref(getNextWeekDefaults())

function getNextWeekDefaults() {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now); monday.setDate(now.getDate() + (8 - day))
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4)
  const fmt = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
  return { startDate:fmt(monday), endDate:fmt(friday), dailyBudget:week.value?.dailyBudget||300, weekBudget:week.value?.weekBudget||1500, inquiryGoal:week.value?.inquiryGoal||400, groupGoal:week.value?.groupGoal||20, countries:[...(week.value?.countries||[])] }
}

function onNewWeekCountryCheck(_node, checked) { newWeekForm.value.countries = checked.checkedKeys.filter(k => allLeafKeys.includes(k)) }

watch(week, async (w) => {
  if (!w) return
  form.value = { startDate:w.startDate, endDate:w.endDate, dailyBudget:w.dailyBudget, weekBudget:w.weekBudget, inquiryGoal:w.inquiryGoal, groupGoal:w.groupGoal, countries:[...(w.countries||[])] }
  await nextTick()
  if (countryTreeRef.value) countryTreeRef.value.setCheckedKeys(w?.countries||[])
  const [sumRes, dailyRes] = await Promise.all([
    api.summary.weekly({ startDate:w.startDate, endDate:w.endDate }),
    api.daily.list({ startDate:w.startDate, endDate:w.endDate })
  ])
  if (sumRes.success) s.value = sumRes.data
  if (dailyRes.success) dailyData.value = dailyRes.data
}, { immediate: true })

function goToReport(d) { sessionStorage.setItem('targetDate', d.date); router.push('/report') }

function openSettings() {
  if (week.value) {
    form.value = { startDate:week.value.startDate, endDate:week.value.endDate, dailyBudget:week.value.dailyBudget, weekBudget:week.value.weekBudget, inquiryGoal:week.value.inquiryGoal, groupGoal:week.value.groupGoal, countries:[...(week.value.countries||[])] }
    nextTick(() => { if (countryTreeRef.value) countryTreeRef.value.setCheckedKeys(week.value.countries||[]) })
  }
  settingsOpen.value = true
}

function openCreateWeek() { newWeekForm.value = getNextWeekDefaults(); newWeekMode.value = 'quick'; newWeekOpen.value = true }
async function doCreateWeek() {
  const data = { ...newWeekForm.value }; data.startDate = dateToStr(data.startDate); data.endDate = dateToStr(data.endDate)
  const res = await weekStore.createWeek(data)
  if (res.success) { newWeekOpen.value = false; ElMessage.success('新周计划已创建') }
}
async function switchToWeek(id) { await weekStore.switchWeek(id) }
async function saveSettings() {
  const data = { ...form.value }; data.startDate = dateToStr(data.startDate); data.endDate = dateToStr(data.endDate)
  const res = await weekStore.updateWeek(week.value.id, data)
  if (res.success) { settingsOpen.value = false; ElMessage.success('已保存') }
}

async function closeWeekTab(w) {
  if (visibleWeeks.value.length <= 1) return
  await ElMessageBox.confirm('关闭「'+shortDate(w.startDate)+' – '+shortDate(w.endDate)+'」？可在下方"已关闭的周"中恢复。', '关闭周', { confirmButtonText:'关闭', type:'warning' })
  await weekStore.deleteWeek(w.id)
  ElMessage.success('已关闭，可在下方恢复')
}

async function restoreWeekTab(id) {
  await weekStore.restoreWeek(id)
  ElMessage.success('已恢复')
}

async function permDeleteWeekTab(w) {
  await ElMessageBox.confirm('永久删除「'+shortDate(w.startDate)+' – '+shortDate(w.endDate)+'」？数据不清除，但周计划配置将丢失。', '永久删除', { confirmButtonText:'删除', type:'error' })
  await api.config.permDeleteWeek(w.id)
  weekStore.weeks = weekStore.weeks.filter(x => x.id !== w.id)
  ElMessage.success('已删除')
}

async function deleteThisWeek() {
  await ElMessageBox.confirm('确定删除本周？', '确认', { type:'warning' })
  settingsOpen.value = false
  await weekStore.deleteWeek(week.value.id)
  ElMessage.success('已删除')
}
</script>

<style scoped>
/* 顶部栏 */
.top-bar { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
/* 展开态 */
.week-tabs-scroll { display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; flex:1; }
.week-tab {
  padding:8px 26px 8px 14px; border-radius:8px; cursor:pointer;
  border:1.5px solid #e5e7eb; background:#fff;
  transition:all 0.15s; user-select:none; flex-shrink:0;
  display:flex; flex-direction:column; gap:2px; position:relative;
}
.week-tab:hover { border-color:#6366f1; background:#eef2ff; }
.week-tab.active { background:#6366f1; border-color:#6366f1; }
.week-tab-dates { font-size:13px; font-weight:700; color:#374151; }
.week-tab.active .week-tab-dates { color:#fff; }
.week-tab-target { font-size:10px; color:#9ca3af; }
.week-tab.active .week-tab-target { color:rgba(255,255,255,.7); }

.week-tab-close {
  position:absolute; top:3px; right:4px;
  width:18px; height:18px; border-radius:4px;
  display:flex; align-items:center; justify-content:center;
  font-size:10px; color:#9ca3af; cursor:pointer;
  opacity:0; transition:opacity 0.15s;
}
.week-tab:hover .week-tab-close { opacity:1; }
.week-tab-close:hover { background:rgba(0,0,0,.08); color:#ef4444; }
.week-tab.active .week-tab-close { color:rgba(255,255,255,.5); }
.week-tab.active .week-tab-close:hover { color:#fff; background:rgba(255,255,255,.2); }

.top-bar-actions { display:flex; gap:6px; flex-shrink:0; }

/* 已关闭的周 */
.hidden-weeks-bar {
  display:flex; align-items:center; gap:4px; flex-wrap:wrap;
  padding:6px 10px; margin-bottom:16px;
  background:#f8fafc; border-radius:8px; border:1px dashed #e5e7eb;
}
.hidden-week-chip {
  display:inline-flex; align-items:center; gap:2px;
  padding:2px 8px; background:#fff; border-radius:12px;
  border:1px solid #e5e7eb; font-size:11px;
}
.hidden-week-link { color:#6366f1; cursor:pointer; }
.hidden-week-link:hover { text-decoration:underline; }
.hidden-week-del { color:#9ca3af; cursor:pointer; padding:0 2px; }
.hidden-week-del:hover { color:#ef4444; }

/* 信息条 */
.plan-info-bar {
  display:flex; align-items:flex-start; justify-content:space-between; gap:16px;
  padding:16px 20px; margin-bottom:20px;
  background:#fff; border-radius:14px; border:1px solid #e5e7eb;
  box-shadow:0 1px 3px rgba(0,0,0,.04); flex-wrap:wrap;
}
.plan-info-left { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.plan-info-date { display:flex; align-items:baseline; gap:10px; }
.plan-info-month { font-size:18px; font-weight:800; color:#1f2937; }
.plan-info-days { font-size:14px; font-weight:600; color:#6366f1; }

.plan-info-meta { display:flex; align-items:center; gap:8px; font-size:12px; color:#6b7280; }
.plan-meta-item { display:flex; align-items:center; gap:4px; }
.plan-meta-item.done { color:#059669; font-weight:600; }
.plan-meta-dot { width:6px; height:6px; border-radius:50%; background:#10b981; }
.plan-meta-divider { color:#d1d5db; }

.plan-info-countries { display:flex; flex-wrap:wrap; gap:4px; padding-top:2px; }

.progress-card { margin-bottom:20px; }
.progress-section { padding:18px 0; border-bottom:1px solid #f3f4f6; }
.progress-section.last { border-bottom:none; padding-bottom:6px; }
.progress-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px; }
.progress-title { font-size:14px; font-weight:600; color:#374151; }
.progress-nums { font-size:14px; font-weight:700; color:#1f2937; }
.progress-bar-wrap { position:relative; height:36px; background:#f3f4f6; border-radius:18px; overflow:hidden; }
.progress-bar-fill { height:100%; border-radius:18px; min-width:0; transition:width 0.8s cubic-bezier(.4,0,.2,1); display:flex; align-items:center; position:relative; }
.progress-bar-fill.theme-blue   { background:linear-gradient(90deg,#6366f1,#818cf8); }
.progress-bar-fill.theme-green  { background:linear-gradient(90deg,#10b981,#34d399); }
.progress-bar-fill.theme-orange { background:linear-gradient(90deg,#f59e0b,#fbbf24); }
.progress-bar-fill.theme-red    { background:linear-gradient(90deg,#ef4444,#f87171); animation:pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.7;} }
.progress-pct { font-size:14px; font-weight:800; color:#fff; margin-left:auto; margin-right:14px; text-shadow:0 1px 2px rgba(0,0,0,.15); white-space:nowrap; }
.progress-pct.outside { position:absolute; right:14px; top:50%; transform:translateY(-50%); font-size:14px; font-weight:800; color:#6b7280; }

.day-list-card { margin-bottom:20px; }
.day-list-header {
  display:flex; justify-content:space-between; align-items:center;
  padding:14px 0;
}

.day-table-wrap {
  background:#fff; border-radius:14px;
  border:1px solid #e5e7eb;
  overflow:hidden;
  box-shadow:0 1px 2px rgba(0,0,0,.03);
}

.day-table { width:100%; }

.day-thead {
  display:grid;
  grid-template-columns:160px repeat(6,1fr) 100px;
  background:#f9fafb;
  border-bottom:1px solid #e5e7eb;
}
.day-th {
  padding:12px 14px;
  font-size:11px; font-weight:800; color:#9ca3af;
  text-transform:uppercase; letter-spacing:.5px;
  text-align:right;
}
.day-th--date { text-align:left; padding-left:24px; }
.day-th--status { text-align:center; }

.day-tr {
  display:grid;
  grid-template-columns:160px repeat(6,1fr) 100px;
  cursor:pointer;
  transition:all 0.12s;
  border-bottom:1px solid #f3f4f6;
  background:#fff;
}
.day-tr:hover { background:#fafaff; }
.day-tr.today {
  background:linear-gradient(90deg,#eef2ff 0%,#fafaff 60%,#fff 100%);
}
.day-tr.completed { border-left:3px solid #10b981; }
.day-tr.completed.today { border-left:3px solid #6366f1; }
.day-tr.last { border-bottom:none; border-radius:0 0 14px 14px; }

.day-td {
  padding:16px 14px;
  font-size:14px; font-weight:600; color:#1f2937;
  text-align:right;
  display:flex; align-items:center; justify-content:flex-end;
  font-variant-numeric:tabular-nums;
}
.day-td.price { color:#6366f1; font-weight:700; }
.day-td.highlight { color:#10b981; font-weight:700; }
.day-td.dim { color:#d1d5db; font-weight:500; }

.day-td--date {
  flex-direction:row; justify-content:flex-start;
  gap:8px; padding-left:24px;
}
.day-td-day { font-size:15px; font-weight:800; color:#111827; }
.day-td-date { font-size:12px; color:#9ca3af; font-weight:500; }

.day-td--status {
  justify-content:center; gap:6px;
  font-size:12px; font-weight:600; color:#6b7280;
}

.day-status-dot {
  width:8px; height:8px; border-radius:50%; flex-shrink:0;
}
.day-status-dot.done { background:#10b981; box-shadow:0 0 6px rgba(16,185,129,.3); }
.day-status-dot.empty { background:#d1d5db; }

@media (max-width:900px) {
  .day-thead, .day-tr { grid-template-columns:120px repeat(6,minmax(60px,1fr)) 80px; }
  .day-th, .day-td { padding:10px 8px; font-size:12px; }
  .day-td--date { padding-left:12px; }
  .day-td-day { font-size:13px; }
}
</style>
