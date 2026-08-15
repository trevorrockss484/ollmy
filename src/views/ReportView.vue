<template>
  <div class="report-page enterprise-page enterprise-page--wide">
    <!-- ====== 顶部栏 ====== -->
    <div class="top-bar">
      <div class="top-row">
        <div class="top-left">
          <h2><el-icon :size="24"><Edit /></el-icon> 每日汇报</h2>
          <el-date-picker v-model="reportDate" type="date" value-format="YYYY-MM-DD" size="default" style="width:148px;" />
          <el-select v-model="selectedAccountId" size="default" style="width:180px;" placeholder="选择广告账号" @change="onAccountChange">
            <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
          <div class="rate-box" title="输入今日汇率，填写美金后自动换算费用">
            <span class="rate-label">汇率</span>
            <el-input-number v-model="exchangeRate" :min="0" :precision="4" :controls="false" size="default" style="width:104px;" placeholder="今日汇率" :disabled="!authStore.canEdit(PAGE)" />
            <el-button v-if="authStore.canEdit(PAGE)" size="default" text type="primary" @click="applyRateAll" :disabled="!exchangeRate">一键换算</el-button>
          </div>
          <el-tag v-if="existingData" type="success" effect="dark" size="small" round>已有数据</el-tag>
          <el-tag v-else type="info" effect="plain" size="small" round>新日期</el-tag>
        </div>
      </div>
      <div class="country-chip-bar">
        <el-tag
          v-for="c in activeCountries" :key="c"
          size="default"
          effect="plain"
          class="country-chip"
          closable
          @close="removeCountry(c)"
        >
          <span class="fi" :class="'fi-' + flagCode(c)" style="margin-right:5px;border-radius:2px;"></span>
          {{ c }}
        </el-tag>
        <el-popover
          v-if="addableCountries.length"
          v-model:visible="popVisible"
          placement="bottom-end"
          :width="280"
          trigger="click"
          :show-arrow="false"
        >
          <template #reference>
            <span class="add-country-btn">
              <el-icon :size="14"><Plus /></el-icon> 添加国家
            </span>
          </template>
          <div class="tree-pop-header">选择国家（可多选）</div>
          <el-tree
            ref="countryTreeRef"
            :data="countryTreeData"
            show-checkbox
            node-key="key"
            :props="{ label: 'label', children: 'children' }"
            default-expand-all
            @check="onCountryTreeCheck"
            style="max-height:320px;overflow-y:auto;"
          />
          <div class="tree-pop-actions">
            <el-button size="small" @click="popVisible=false">取消</el-button>
            <el-button size="small" type="primary" @click="confirmAddCountries">确定添加</el-button>
          </div>
        </el-popover>
      </div>
    </div>

    <!-- ====== 操作栏 ====== -->
    <div class="action-bar">
      <el-button type="success" size="default" @click="copyReport" :disabled="!reportText"><el-icon :size="15"><DocumentCopy /></el-icon> 一键复制</el-button>
      <el-button size="default" @click="pasteVisible = true"><el-icon :size="15"><Files /></el-icon> 粘贴识别</el-button>
      <el-button v-if="authStore.canAdd(PAGE)" size="default" @click="syncFromStats"><el-icon :size="15"><Refresh /></el-icon> 从统计同步</el-button>
      <el-button v-if="authStore.canEdit(PAGE)" size="default" @click="saveData"><el-icon :size="15"><Check /></el-icon> 保存</el-button>
      <el-button v-if="authStore.canEdit(PAGE)" size="default" @click="clearForm" type="danger" plain><el-icon :size="15"><Delete /></el-icon> 清空</el-button>
      <span v-if="saveMsg" class="save-msg" :class="{ ok: saveOk, err: !saveOk }">{{ saveMsg }}</span>
    </div>

    <div class="main-layout" v-if="activeCountries.length" v-loading="dataLoading">
      <!-- ====== 左侧：国家表单 ====== -->
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
          <div class="gd-global-val">
            <div v-if="overallTotal.allEntries.length">
              <span v-for="(e, idx) in overallTotal.allEntries" :key="idx" class="gd-entry-pill">【{{ e }}】</span>
            </div>
            <span v-else>—</span>
          </div>
        </div>

        <!-- 二、每个国家明细 -->
        <div class="section-header">
          <span class="section-num">二</span> 每个国家明细
          <div class="sort-bar">
            <span class="sort-label">排序</span>
            <button class="sort-btn" :class="{ active: sortMode === 'az' }" @click="sortCountries('az')">A→Z</button>
            <button class="sort-btn" :class="{ active: sortMode === 'customer' }" @click="sortCountries('customer')">客资<span v-if="sortMode==='customer'"> ↓</span></button>
            <button class="sort-btn" :class="{ active: sortMode === 'budget' }" @click="sortCountries('budget')">消耗<span v-if="sortMode==='budget'"> ↓</span></button>
            <button class="sort-btn" :class="{ active: sortMode === 'grouped' }" @click="sortCountries('grouped')">拉群<span v-if="sortMode==='grouped'"> ↓</span></button>
          </div>
        </div>

        <!-- 每个国家卡片 -->
        <div class="country-cards">
          <div
            v-for="(c, i) in activeCountries"
            :key="c"
            class="country-card"
            :class="{ 'country-card--expanded': expandedCountries.has(c) }"
            :style="{ '--row-color': countryColors[i], '--row-color-light': countryColors[i] + '12' }"
          >
            <!-- 卡片头部 -->
            <div class="cc-header">
              <div class="cc-header-left">
                <span class="cc-seq" :style="{ background: countryColors[i] }">{{ i + 1 }}</span>
                <span class="fi" :class="'fi-' + flagCode(c)" style="border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.1);"></span>
                <span class="cc-name">{{ c }}</span>
                <span class="cc-summary">¥{{ fmtNum(countryData[c].budget) }} · {{ n(countryData[c].newCustomer) }}客 · {{ n(countryData[c].grouped) }}拉群</span>
              </div>
              <div class="cc-header-right">
                <button class="cc-act-btn" :disabled="i===0" @click="moveCountry(i,-1)" title="上移"><el-icon :size="12"><Top /></el-icon></button>
                <button class="cc-act-btn" :disabled="i===activeCountries.length-1" @click="moveCountry(i,1)" title="下移"><el-icon :size="12"><Bottom /></el-icon></button>
                <button class="cc-act-btn cc-act-btn--expand" @click="toggleExpand(c)" :title="expandedCountries.has(c)?'收起详情':'展开详情'">
                  <el-icon :size="12"><ArrowDown v-if="expandedCountries.has(c)" /><ArrowRight v-else /></el-icon>
                  <span v-if="n(countryData[c].grouped) > 0" class="cc-expand-badge">{{ n(countryData[c].grouped) }}</span>
                </button>
                <button class="cc-act-btn cc-act-btn--del" @click="removeCountry(c)" :disabled="activeCountries.length<=1" title="移除"><el-icon :size="12"><Close /></el-icon></button>
              </div>
            </div>

            <!-- 指标输入行 -->
            <div class="cc-inputs">
              <div class="cc-input-item">
                <label class="cc-input-label">费用(元)</label>
                <el-input-number v-model="countryData[c].budget" :min="0" :precision="2" :controls="false" placeholder="0" class="cc-input-num" :disabled="!authStore.canEdit(PAGE)" />
              </div>
              <div class="cc-input-item" :class="{ collapsed: usdCollapsed }">
                <label class="cc-input-label">
                  美金
                  <button class="cc-usd-toggle" @click="usdCollapsed = !usdCollapsed" :title="usdCollapsed ? '展开' : '收起'" aria-label="切换美金列">
                    <el-icon :size="10"><ArrowRight v-if="usdCollapsed" /><ArrowDown v-else /></el-icon>
                  </button>
                </label>
                <el-input-number v-model="countryData[c].usdBudget" :min="0" :precision="2" :controls="false" placeholder="$" class="cc-input-num cc-input-num--usd" :disabled="!authStore.canEdit(PAGE)" @change="onUsdChange(c)" />
              </div>
              <div class="cc-input-item">
                <label class="cc-input-label">客资</label>
                <el-input-number v-model="countryData[c].newCustomer" :min="0" :controls="false" placeholder="0" class="cc-input-num" :disabled="!authStore.canEdit(PAGE)" />
              </div>
              <div class="cc-input-item">
                <label class="cc-input-label">拉群 <span v-if="n(countryData[c].grouped) > 0 && n(countryData[c].grouped) !== validEntryCount(c)" class="cc-required-tag">待补全</span></label>
                <el-input-number v-model="countryData[c].grouped" :min="0" :controls="false" placeholder="0" class="cc-input-num" @change="onGroupedChange(c)" :disabled="!authStore.canEdit(PAGE)" />
              </div>
              <div class="cc-input-item cc-input-item--cost">
                <label class="cc-input-label">客价(询盘/有效)</label>
                <div class="cc-cost-pair">
                  <span class="cc-cost-val">{{ countryAvg(c) > 0 ? '¥' + countryAvg(c).toFixed(1) : '—' }}</span>
                  <span class="cc-cost-sep">/</span>
                  <span class="cc-cost-val cc-cost-val--eff">{{ countryEffCost(c) > 0 ? '¥' + countryEffCost(c).toFixed(1) : '—' }}</span>
                </div>
              </div>
            </div>

            <!-- 拉群详情（卡片内展开） -->
            <div v-if="expandedCountries.has(c)" class="cc-details">
              <div class="cc-details-hd">
                <span class="cc-details-title">拉群及客户详情</span>
                <span class="cc-details-meta" :class="{ 'cc-details-meta--warn': n(countryData[c].grouped) > 0 && validEntryCount(c) !== n(countryData[c].grouped) }">
                  {{ validEntryCount(c) }}/{{ n(countryData[c].grouped) }} 条已填
                  <template v-if="n(countryData[c].grouped) > 0 && validEntryCount(c) !== n(countryData[c].grouped)"> — 需填满 {{ n(countryData[c].grouped) }} 条</template>
                </span>
              </div>
              <div v-for="entry in countryData[c].groupEntries" :key="entry.id" class="cc-detail-row">
                <el-input v-model="entry.text" placeholder="如：印度x2，平面图" size="small" class="cc-detail-text" :disabled="!authStore.canEdit(PAGE)" />
                <el-select v-model="entry.status" placeholder="状态" size="small" class="cc-detail-status" clearable :disabled="!authStore.canEdit(PAGE)">
                  <el-option label="到现场" value="到现场" />
                  <el-option label="未到现场" value="未到现场" />
                  <el-option label="待确认" value="待确认" />
                </el-select>
                <el-button v-if="authStore.canEdit(PAGE)" size="small" text type="danger" class="cc-detail-del" @click="removeGroupEntry(c, entry.id)">
                  <el-icon :size="14"><Close /></el-icon>
                </el-button>
              </div>
              <el-button v-if="authStore.canEdit(PAGE) && n(countryData[c].grouped) > 0 && (countryData[c].groupEntries||[]).length >= n(countryData[c].grouped)" size="small" text type="info" class="cc-detail-add" disabled>
                已达 {{ n(countryData[c].grouped) }} 条上限
              </el-button>
              <el-button v-else-if="authStore.canEdit(PAGE)" size="small" text type="primary" class="cc-detail-add" @click="addGroupEntry(c)">
                <el-icon :size="13"><Plus /></el-icon> 添加客户详情
              </el-button>
            </div>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWeekStore } from '../stores/week'
import { useAuthStore } from '../stores/auth'
import { api, formatDateCN, todayStr } from '../api'

const authStore = useAuthStore()
const PAGE = '/report'
import { countryTreeData as sharedCountryTree, allLeafKeys, flagMap } from '../data/countryTree'
import { ACCOUNTS } from '../data/accounts'
const countryTreeData = sharedCountryTree

const weekStore = useWeekStore()

// 每个页面实例唯一 ID（不持久化），用于实时更新时忽略自己发起的广播。
// 不用 sessionStorage：复制标签页会继承 sessionStorage，导致两个标签页 clientId 相同而互相忽略。
const clientId = 'c-' + Math.random().toString(36).slice(2) + '-' + Date.now()

// ====== 国家数据（使用共享模块 src/data/countryTree.js） ======
const activeCountries = ref([])
const addableCountries = computed(() => allLeafKeys.filter(c => !activeCountries.value.includes(c)))
const countrySearch = ref('')
const popVisible = ref(false)
const countryTreeRef = ref(null)
const pendingCountryChecks = ref([])

// 弹出时回显已选国家
watch(popVisible, (v) => {
  if (v) {
    nextTick(() => {
      if (countryTreeRef.value) {
        countryTreeRef.value.setCheckedKeys(activeCountries.value)
      }
    })
  }
})

// countryTreeData 来自共享模块 src/data/countryTree.js

function onCountryTreeCheck(_n, checked) {
  pendingCountryChecks.value = checked.checkedKeys.filter(k => allLeafKeys.includes(k))
}

function confirmAddCountries() {
  for (const c of pendingCountryChecks.value) {
    if (!activeCountries.value.includes(c)) {
      activeCountries.value = [...activeCountries.value, c]
      if (!(c in countryData)) countryData[c] = defaultCountryFb()
    }
  }
  pendingCountryChecks.value = []
  popVisible.value = false
}

const filteredAddable = computed(() => {
  const q = countrySearch.value.trim().toLowerCase()
  if (!q) return addableCountries.value
  return addableCountries.value.filter(c => c.toLowerCase().includes(q))
})

function flagCode(name) { return flagMap[name] || "" }

// 国家卡片颜色调色板
const countryColors = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
  '#84cc16', '#e11d48', '#7c3aed', '#0891b2', '#d946ef',
  '#65a30d', '#2563eb', '#db2777', '#0d9488', '#ea580c',
  '#4f46e5', '#059669', '#d97706', '#dc2626', '#9333ea',
  '#0284c7', '#be185d', '#0f766e', '#c2410c', '#1d4ed8',
  '#a3e635', '#9d174d', '#6d28d9', '#155e75', '#a21caf',
  '#4d7c0f', '#1e40af', '#9f1239', '#115e59', '#9a3412',
]

function addCountry(c) {
  if (!activeCountries.value.includes(c)) {
    activeCountries.value = [...activeCountries.value, c]
    if (!(c in countryData)) countryData[c] = defaultCountryFb()
  }
}

function removeCountry(c) {
  if (activeCountries.value.length <= 1) { ElMessage.warning('至少保留一个国家'); return }
  const d = countryData[c]
  const hasData = d && (n(d.budget) > 0 || n(d.newCustomer) > 0 || n(d.grouped) > 0 || (d.groupEntries || []).some(e => e.text))
  const doRemove = () => { activeCountries.value = activeCountries.value.filter(x => x !== c); delete countryData[c]; expandedCountries.value.delete(c) }
  if (hasData) {
    ElMessageBox.confirm(`「${c}」已有填写数据，确定移除？`, '确认移除', { confirmButtonText: '移除', cancelButtonText: '取消', type: 'warning' })
      .then(doRemove).catch(() => {})
  } else {
    doRemove()
  }
}

// 表格视图中展开/收起拉群详情
const expandedCountries = ref(new Set())
const usdCollapsed = ref(false)

function toggleExpand(c) {
  const s = expandedCountries.value
  if (s.has(c)) s.delete(c); else s.add(c)
  expandedCountries.value = new Set(s) // 触发响应式更新
}

// 拉群数变化时自动调整详情条目
let _groupedChanging = false
function onGroupedChange(c) {
  if (_groupedChanging) return
  nextTick(() => {
    const d = countryData[c]; if (!d) return
    const grouped = n(d.grouped)
    const entries = d.groupEntries || []
    const validCount = entries.filter(e => e.text && e.text.trim()).length

    if (grouped > entries.length) {
      // 增加：自动追加空条目
      const add = grouped - entries.length
      for (let i = 0; i < add; i++) d.groupEntries.push({ id: ++entryIdSeq, text: '', status: '' })
      if (!expandedCountries.value.has(c)) toggleExpand(c)
    } else if (grouped < entries.length && entries.some(e => e.text && e.text.trim())) {
      // 减少且有数据：弹确认
      const remove = entries.length - grouped
      ElMessageBox.confirm(
        `「${c}」拉群数从 ${entries.length} 减少到 ${grouped}，将删除最后 ${remove} 条详情。已有填写的条目可能丢失，确定？`,
        '确认调整', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      ).then(() => {
        d.groupEntries.splice(grouped)
      }).catch(() => {
        _groupedChanging = true
        d.grouped = entries.length
        nextTick(() => { _groupedChanging = false })
      })
    } else if (grouped < entries.length) {
      // 减少且全空：直接删除
      d.groupEntries.splice(grouped)
    }
  })
}

function moveCountry(idx, direction) {
  const arr = [...activeCountries.value]
  const target = idx + direction
  if (target < 0 || target >= arr.length) return
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  activeCountries.value = arr
}

const sortMode = ref('')

function sortCountries(mode) {
  const arr = [...activeCountries.value]
  if (mode === 'az') {
    arr.sort((a, b) => a.localeCompare(b))
  } else if (mode === 'customer') {
    arr.sort((a, b) => (countryData[b]?.newCustomer || 0) - (countryData[a]?.newCustomer || 0))
  } else if (mode === 'budget') {
    arr.sort((a, b) => (countryData[b]?.budget || 0) - (countryData[a]?.budget || 0))
  } else if (mode === 'grouped') {
    arr.sort((a, b) => (countryData[b]?.grouped || 0) - (countryData[a]?.grouped || 0))
  }
  sortMode.value = mode
  activeCountries.value = arr
}

const reportDate = ref(todayStr())
const saveMsg = ref('')
const saveOk = ref(true)
const existingData = ref(false)
const accounts = ref(ACCOUNTS)
const exchangeRate = ref(null)
const selectedAccountId = ref('lisa-office')
const selectedAccount = computed(() => accounts.value.find(a => a.id === selectedAccountId.value) || accounts.value[0])

let entryIdSeq = 0
const defaultCountryFb = () => ({ budget:null, usdBudget:null, newCustomer:null, grouped:null, groupEntries:[], catNoReply:null, msgIgnore:null, lowBudget:null, competitor:null, harass:null, visitPending:null })

function addGroupEntry(c) {
  if (!countryData[c]) countryData[c] = defaultCountryFb()
  const grouped = n(countryData[c].grouped)
  const current = (countryData[c].groupEntries || []).length
  // 拉群数已设定时，不允许超量添加
  if (grouped > 0 && current >= grouped) {
    ElMessage.warning(`拉群数为 ${grouped}，最多添加 ${grouped} 条详情`)
    return
  }
  countryData[c].groupEntries.push({ id: ++entryIdSeq, text: '', status: '' })
}

function removeGroupEntry(c, id) {
  countryData[c].groupEntries = countryData[c].groupEntries.filter(e => e.id !== id)
}

function validEntryCount(c) {
  return (countryData[c].groupEntries || []).filter(e => e.text && e.text.trim()).length
}

// 将旧 groupDetail 字符串迁移为 groupEntries 数组
function migrateGroupDetail(d) {
  if (d.groupDetail && !d.groupEntries) {
    const parts = splitDetails(d.groupDetail)
    d.groupEntries = parts.map(p => {
      const inner = p.replace(/^【|】$/g, '')
      return { id: ++entryIdSeq, text: inner, status: '' }
    })
    delete d.groupDetail
  }
  if (!d.groupEntries) d.groupEntries = []
}
const countryData = reactive({})

function initCountryData(countries) {
  // 以周计划国家为底，保留用户手动添加的国家
  const merged = new Set([...countries])
  for (const c of activeCountries.value) {
    if (!merged.has(c) && countryData[c] !== undefined) merged.add(c)
  }
  activeCountries.value = [...merged]
  for (const c of activeCountries.value) {
    if (!(c in countryData)) countryData[c] = defaultCountryFb()
  }
  for (const k of Object.keys(countryData)) {
    if (!activeCountries.value.includes(k)) delete countryData[k]
  }
}

function resetFormData() {
  for (const c of Object.keys(countryData)) countryData[c] = defaultCountryFb()
  existingData.value = false
}

// 完全重置为周计划国家（用于切换账号无数据时，避免串到其他账号）
function resetToWeekCountries() {
  for (const k of Object.keys(countryData)) delete countryData[k]
  activeCountries.value = [...(weekStore.currentWeek?.countries || [])]
  for (const c of activeCountries.value) countryData[c] = defaultCountryFb()
  expandedCountries.value = new Set()
}

function onAccountChange() {
  saveMsg.value = ''; autoSaveSkip = true
  resetFormData()
  if (reportDate.value) loadExistingData(reportDate.value)
}

const weekReady = ref(false)
let loadSeq = 0
const dataLoading = ref(false)
let autoSaveSkip = false
let autoSaveReady = false
let autoSaveTimer = null
watch(() => weekStore.currentWeek?.countries, async (countries) => {
  if (!countries?.length) return
  weekReady.value = true
  // 优先加载已保存数据，没有则用周计划国家初始化
  const hasDate = !!reportDate.value
  if (hasDate) {
    // 尝试加载已有数据
    await loadExistingData(reportDate.value)
    // 如果加载后仍无数据，用周计划国家初始化
    if (!existingData.value) {
      initCountryData(countries)
    }
  } else {
    initCountryData(countries)
  }
}, { immediate: true })

const n = v => v ?? 0
function countryAvg(c) { const d = countryData[c]; if (!d) return 0; const b = n(d.budget), cu = n(d.newCustomer); return (b && cu) ? b / cu : 0 }
function countryEffCost(c) { const d = countryData[c]; if (!d) return 0; const b = n(d.budget), g = n(d.grouped); return (b && g) ? b / g : 0 }

// ====== 汇率换算 ======
function onUsdChange(c) {
  const r = exchangeRate.value
  if (!r || r <= 0) return
  const d = countryData[c]; if (!d) return
  const usd = n(d.usdBudget)
  if (usd > 0) d.budget = Math.round(usd * r * 100) / 100
}

function applyRateAll() {
  const r = exchangeRate.value
  if (!r || r <= 0) { ElMessage.warning('请先填写今日汇率'); return }
  let count = 0
  for (const c of activeCountries.value) {
    const d = countryData[c]; if (!d) continue
    const usd = n(d.usdBudget)
    if (usd > 0) { d.budget = Math.round(usd * r * 100) / 100; count++ }
  }
  count ? ElMessage.success('已按汇率换算 ' + count + ' 个国家费用') : ElMessage.warning('无美金数据可换算')
}

const overallTotal = computed(() => {
  let budget = 0, usdBudget = 0, newCustomer = 0, grouped = 0
  const groupCountParts = []
  const allEntries = []
  for (const c of activeCountries.value) {
    const d = countryData[c]; if (!d) continue
    budget += n(d.budget); usdBudget += n(d.usdBudget); newCustomer += n(d.newCustomer); grouped += n(d.grouped)
    if (n(d.grouped) > 0) groupCountParts.push(c + '+' + n(d.grouped))
    // 收集所有客户详情条目
    const entries = d.groupEntries || []
    for (const e of entries) {
      if (e.text && e.text.trim()) allEntries.push(e.status ? `${e.text}，${e.status}` : e.text)
    }
  }
  return { budget, usdBudget, newCustomer, grouped, avgCost: (budget && newCustomer) ? budget / newCustomer : 0, effCost: (budget && grouped) ? budget / grouped : 0, allEntries, groupCountSummary: groupCountParts.join('  ') }
})

function fmtNum(v) { if (v == null) return '0.00'; const r = Math.round(v * 100) / 100; return r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

// ====== 数据加载 ======

async function loadExistingData(d) {
  if (!d || !weekReady.value) return
  const seq = ++loadSeq; autoSaveSkip = true; dataLoading.value = true
  resetFormData()
  try {
    const res = await api.daily.get(d, { accountId: selectedAccountId.value }); if (seq !== loadSeq) return
    existingData.value = !!(res.success && res.data)
    if (res.success && res.data && res.data.countries) {
      exchangeRate.value = res.data.exchangeRate ?? null
      const savedCountries = Object.keys(res.data.countries)
      // 以已保存数据为准，替换初始的周计划国家列表
      activeCountries.value = [...savedCountries]
      // 清理不在保存数据中的 countryData
      for (const k of Object.keys(countryData)) {
        if (!savedCountries.includes(k)) delete countryData[k]
      }
      for (const c of savedCountries) {
        if (!(c in countryData)) countryData[c] = defaultCountryFb()
        const fb = res.data.countries[c]
        // 迁移旧 groupDetail → groupEntries
        migrateGroupDetail(fb)
        if (fb.groupEntries) {
          countryData[c].groupEntries = fb.groupEntries.map(e => ({ ...e }))
        }
        const skipKeys = ['groupDetail', 'groupEntries']
        Object.keys(countryData[c]).forEach(k => {
          if (skipKeys.includes(k)) return
          if (k in fb) countryData[c][k] = fb[k] ?? null
        })
      }
    } else {
      // 无保存数据 → 重置为周计划国家，避免串到其他账号的国家列表
      exchangeRate.value = null
      resetToWeekCountries()
    }
  } catch(e) { existingData.value = false; exchangeRate.value = null; resetToWeekCountries() }
  autoSaveSkip = false; dataLoading.value = false
}

const skipAutoLoad = ref(false)
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
  const hasData = ot.budget > 0 || ot.newCustomer > 0 || ot.grouped > 0
  if (!hasData) return ''

  const parts = reportDate.value.split('-')
  const dateLabel = parseInt(parts[0]) + '.' + parseInt(parts[1]) + '.' + parseInt(parts[2])

  let text = `${dateLabel} 海外投流数据总结

一、今日海外整体汇总

1. 总费用：${fmtNum(ot.budget)}
2. 总客资：${ot.newCustomer}
3. 总拉群及客户详情：${ot.grouped}`
  if (ot.allEntries.length) text += `\n▷\n${ot.allEntries.map(e => '【' + e + '】').join('\n')}\n▷`
  else if (ot.groupCountSummary) text += `\n▷\n（${ot.groupCountSummary}）\n▷`
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
    const entries = (d.groupEntries || []).filter(e => e.text)
    text += `
----------

▌${c}

1. 费用：${fmtNum(budget)} 元
2. 客资：${customer} 个
3. 总拉群及客户详情：${grouped} 个`
    if (entries.length) text += `\n▷\n${entries.map(e => '【' + e.text + (e.status ? '，' + e.status : '') + '】').join('\n')}\n▷`
    text += `
4. 询盘客价：${avg} / 元
5. 有效客价：${eff} / 元
`
  })
  text += `
----------`
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

async function saveData(silent) {
  const date = reportDate.value; if (!date) { if (!silent) ElMessage.warning('请选择日期'); return }

  if (!silent) {
  // ====== 保存前校验 ======
  // 1. 检查是否完全为空
  let hasAnyData = false
  for (const c of activeCountries.value) {
    const d = countryData[c]; if (!d) continue
    if (n(d.budget) > 0 || n(d.newCustomer) > 0 || n(d.grouped) > 0 || (d.groupEntries || []).some(e => e.text)) {
      hasAnyData = true; break
    }
  }
  if (!hasAnyData) {
    ElMessage.warning('请至少填写一个国家的数据'); return
  }

  // 2. 拉群详情校验：有拉群数则必须逐一填写详情，且条目数一致
  const errors = []
  for (const c of activeCountries.value) {
    const d = countryData[c]; if (!d) continue
    const grouped = n(d.grouped)
    const filled = validEntryCount(c)
    // 拉群数 > 0：必须有对应的详情条目，且数量一致
    if (grouped > 0) {
      if (filled === 0) {
        errors.push(`「${c}」拉群数为 ${grouped}，但未填写任何客户详情 → 请填写详情`)
      } else if (filled !== grouped) {
        errors.push(`「${c}」拉群数为 ${grouped}，但详情条目为 ${filled} 条 → 必须一致`)
      }
    } else if (grouped === 0 && filled > 0) {
      errors.push(`「${c}」拉群数为 0，但有 ${filled} 条详情 → 请清除详情或填写拉群数`)
    }
  }
  if (errors.length) { ElMessageBox.alert(errors.join('\n'), '拉群详情校验不通过', { confirmButtonText: '知道了', type: 'warning' }); return }
  }

  const countries = {}
  for (const c of activeCountries.value) {
    const d = countryData[c]; if (!d) continue
    countries[c] = { budget: n(d.budget), usdBudget: n(d.usdBudget), newCustomer: n(d.newCustomer), grouped: n(d.grouped), groupEntries: (d.groupEntries || []).map(e => ({ text: e.text || '', status: e.status || '' })), catNoReply: n(d.catNoReply), msgIgnore: n(d.msgIgnore), lowBudget: n(d.lowBudget), competitor: n(d.competitor), harass: n(d.harass), visitPending: n(d.visitPending) }
  }
  if (!silent) { saveMsg.value = '保存中...'; saveOk.value = true }
  try {
    const res = await api.daily.save(date, { countries, exchangeRate: exchangeRate.value ?? null }, { accountId: selectedAccountId.value, clientId })
    if (res.success) { saveMsg.value = silent ? '已自动保存' : ' 已保存'; saveOk.value = true; existingData.value = true; const curMsg = saveMsg.value; setTimeout(() => { if (saveMsg.value === curMsg) saveMsg.value = '' }, 2500) }
    else { saveMsg.value = '❌ ' + (res.error||'未知错误'); saveOk.value = false }
  } catch(e) { saveMsg.value = '❌ ' + e.message; saveOk.value = false }
}

async function clearForm() {
  try { await ElMessageBox.confirm('确定清空表单？未保存的数据将丢失。', '确认清空', { confirmButtonText: '确认清空', cancelButtonText: '取消', type: 'warning' }) } catch { return }
  for (const c of activeCountries.value) { if (c in countryData) { Object.keys(countryData[c]).forEach(k => { if (k === 'groupEntries') countryData[c][k] = []; else countryData[c][k] = (typeof countryData[c][k] === 'number' || countryData[c][k] === null) ? null : '' }) } }
  autoSaveSkip = true
  saveMsg.value = ''
  setTimeout(() => { autoSaveSkip = false }, 500)
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
      const detailM = b.match(/【[^】]*】/g)
      if (detailM) {
        countryData[c].groupEntries = detailM.map(p => {
          const inner = p.replace(/^【|】$/g, '').replace(/，到现场$/, '')
          let status = ''
          if (p.endsWith('，到现场】')) status = '到现场'
          else if (p.endsWith('，未到现场】')) status = '未到现场'
          else if (p.endsWith('，待确认】')) status = '待确认'
          return { id: ++entryIdSeq, text: inner, status }
        })
      }
    }
  }
	  pasteVisible.value = false
  parseDetail.value.length ? ElMessage.success('识别 '+parseDetail.value.length+' 个字段') : ElMessage.warning('未识别到数据')
}

// 从客户统计同步国家客资（替换国家列表）
async function syncFromStats() {
  const d = reportDate.value; if (!d) return
  try {
    const res = await api.customerStats.list({ startDate: d, endDate: d, accountId: selectedAccountId.value })
    if (!res.success || !res.data.length) { ElMessage.warning('当日无客户统计数据'); return }
    const breakdown = res.data[0].countryBreakdown || []
    if (!breakdown.length) { ElMessage.warning('客户统计中无国家客资数据'); return }
    const statCountries = breakdown.filter(cb => cb.country && cb.count > 0).map(cb => cb.country)
    if (!statCountries.length) { ElMessage.warning('客户统计中无有效国家数据'); return }
    let count = 0
    // 清理不在统计中的国家数据
    for (const c of Object.keys(countryData)) {
      if (!statCountries.includes(c)) delete countryData[c]
    }
    // 用统计中的国家替换当前列表，同步客资数
    for (const cb of breakdown) {
      if (cb.country && cb.count > 0) {
        if (!(cb.country in countryData)) countryData[cb.country] = defaultCountryFb()
        countryData[cb.country].newCustomer = cb.count
        count++
      }
    }
    activeCountries.value = statCountries
    // 清理展开状态中已移除的国家
    for (const c of [...expandedCountries.value]) {
      if (!statCountries.includes(c)) expandedCountries.value.delete(c)
    }
    expandedCountries.value = new Set(expandedCountries.value)
    // 立即保存，避免离开页面后数据丢失
    await saveData(true)
    ElMessage.success('已从统计同步 ' + count + ' 个国家，国家列表已替换')
  } catch(e) { ElMessage.error('同步失败') }
}


// ====== 自动保存 ======

function triggerAutoSave() {
  if (autoSaveSkip) return
  if (!autoSaveReady) return
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null
    if (autoSaveSkip) return
    saveData(true)
  }, 1200)
}

watch(
  () => JSON.stringify({
    ac: activeCountries.value.join(','),
    er: exchangeRate.value,
    cd: Object.fromEntries(
      Object.entries(countryData).map(([k, v]) => [k, {
        b: v.budget, u: v.usdBudget, c: v.newCustomer, g: v.grouped,
        ge: (v.groupEntries || []).map(e => e.text + '|' + e.status).join(';')
      }])
    )
  }),
  () => { triggerAutoSave() },
  { deep: true }
)

let eventSource = null
function startRealtime() {
  try {
    const token = localStorage.getItem('pan_token') || ''
    if (!token) return
    eventSource = new EventSource('/api/events?token=' + encodeURIComponent(token))
    eventSource.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data)
        if (p.type !== 'daily-changed') return
        if (p.clientId === clientId) return
        if (p.date !== reportDate.value) return
        if (p.accountId && p.accountId !== selectedAccountId.value) return
        if (autoSaveTimer) return // 本地有未保存修改，等本地先保存
        loadExistingData(reportDate.value)
      } catch {}
    }
  } catch {}
}
function stopRealtime() {
  if (eventSource) { try { eventSource.close() } catch {} ; eventSource = null }
}

onMounted(async () => {
  if (!weekStore.currentWeek) await weekStore.load()
  const t = sessionStorage.getItem('targetDate'); if (t) { reportDate.value = t; sessionStorage.removeItem('targetDate') }
  const e = sessionStorage.getItem('editDaily')
  if (e) {
    try {
      const { date, data: d } = JSON.parse(e); reportDate.value = date
      if (d.countries) { for (const [c, fb] of Object.entries(d.countries)) { if (c in countryData) Object.keys(countryData[c]).forEach(k => { if (k in fb) countryData[c][k] = fb[k] ?? null }) } }
    } catch {}
    sessionStorage.removeItem('editDaily')
  }
  setTimeout(() => { autoSaveReady = true }, 1500)
  startRealtime()
})

onUnmounted(() => { if (autoSaveTimer) clearTimeout(autoSaveTimer); stopRealtime() })
</script>

<style scoped>
.report-page { animation: fadeIn .3s ease; padding-bottom: 40px; }
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

/* ====== 顶部 ====== */
.top-bar {
  background: var(--surface-card); border: 1px solid var(--border-default); border-radius: 14px;
  padding: 16px 24px 12px; margin-bottom: 10px;
  box-shadow: var(--shadow-xs);
  display: flex; flex-direction: column; gap: 10px;
}
.top-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.top-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.top-left h2 { font-size: 20px; font-weight: 700; margin: 0; white-space: nowrap; }

/* 汇率换算框 */
.rate-box {
  display: inline-flex; align-items: center; gap: 6px;
  background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
  padding: 3px 6px 3px 10px;
}
.rate-label { font-size: 12px; font-weight: 700; color: #a16207; white-space: nowrap; }
.rate-box :deep(.el-input__wrapper) { background: #fff; box-shadow: 0 0 0 1px #fde68a; }
.rate-box :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px #f59e0b !important; }
.rate-box :deep(.el-input__inner) { color: #a16207; font-weight: 700; }

/* 国家芯片栏 — 独立一行，自动换行 */
.country-chip-bar {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
}
.country-chip {
  font-weight: 600; font-size: 13px;
  padding: 4px 10px; border-radius: 6px;
  transition: all .15s;
}
.country-chip :deep(.el-tag__close) { color: #9ca3af; }
.country-chip :deep(.el-tag__close:hover) { color: #ef4444; background: #fef2f2; }

/* 添加国家按钮 */
.add-country-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 14px; border: 1.5px solid #c7d2fe;
  border-radius: 6px; cursor: pointer;
  font-size: 13px; font-weight: 700; color: #6366f1;
  background: #f5f3ff; transition: all .15s; user-select: none;
  flex-shrink: 0;
}
.add-country-btn:hover { background: #eef2ff; border-color: #818cf8; }

/* 国家搜索 */
.country-search-input { margin-bottom: 6px; }
.country-pop-list { max-height: 240px; overflow-y: auto; }
.country-pop-item {
  padding: 7px 12px; border-radius: 6px; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #374151;
  display: flex; align-items: center; transition: background .12s;
}
.country-pop-item:hover { background: #f3f4f6; }
.country-pop-empty { padding: 12px; text-align: center; color: #9ca3af; font-size: 12px; }

/* 国家树弹窗 */
.tree-pop-header { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; }
.tree-pop-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f3f4f6; }

/* ====== 操作栏 ====== */
.action-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.action-bar .el-button { font-weight: 600; border-radius: 8px; }
.save-msg { font-size: 12px; font-weight: 600; margin-left: 8px; }
.save-msg.ok { color: #059669; }
.save-msg.err { color: #ef4444; }

/* ====== 布局 ====== */
.main-layout { flex:1; min-height:0; display: flex; gap: 20px; align-items: flex-start; }
.left-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.right-panel { width: 380px; flex-shrink: 0; align-self: flex-start; position: sticky; top: 16px; }

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
.gd-global { background: var(--surface-card); border: 1px solid var(--border-default); border-radius: 12px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 12px; }
.gd-global-label { font-size: 13px; font-weight: 700; color: #374151; white-space: nowrap; min-width: 120px; }

/* ====== 区块标题 ====== */
.section-header { font-size: 16px; font-weight: 700; color: #1f2937; padding: 8px 0 4px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

/* 排序按钮组 */
.sort-bar { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.sort-label { font-size: 11px; font-weight: 600; color: #9ca3af; margin-right: 4px; }
.sort-btn {
  font-size: 11px; font-weight: 600; color: #6b7280;
  padding: 4px 10px; border-radius: 6px; border: 1px solid #e5e7eb;
  background: #fff; cursor: pointer; transition: all .12s;
  white-space: nowrap;
}
.sort-btn:hover { border-color: #6366f1; color: #6366f1; background: #f5f3ff; }
.sort-btn.active {
  background: #6366f1; color: #fff; border-color: #6366f1;
}
.section-num { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #eef2ff; color: #6366f1; font-size: 14px; }

/* ====== 国家卡片 ====== */
.country-cards {
  display: flex; flex-direction: column; gap: 10px;
}
.country-card {
  background: var(--surface-card); border: 1px solid var(--border-default);
  border-radius: 12px; overflow: hidden;
  transition: box-shadow .15s, border-color .15s;
  position: relative;
}
.country-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 3px; background: var(--row-color, #6366f1);
  border-radius: 3px 0 0 3px; opacity: .6;
}
.country-card:hover { border-color: #c7d2fe; box-shadow: 0 2px 8px rgba(99,102,241,.06); }
.country-card--expanded { border-color: #c7d2fe; box-shadow: 0 2px 12px rgba(99,102,241,.08); }

/* 卡片头部 */
.cc-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 14px 16px; cursor: pointer; user-select: none;
  background: #f9fafb; border-bottom: 1px solid #f3f4f6;
  transition: background .12s;
  flex-wrap: wrap;
}
.cc-header:hover { background: #f3f4f6; }
.country-card--expanded .cc-header { background: #eef2ff; border-bottom-color: #e0e7ff; }
.cc-header-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.cc-header-right { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.cc-seq {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 6px;
  color: #fff; font-size: 12px; font-weight: 800; flex-shrink: 0;
}
.cc-name { font-size: 15px; font-weight: 800; color: #1f2937; white-space: nowrap; }
.cc-summary {
  font-size: 11px; font-weight: 600; color: #9ca3af;
  background: rgba(255,255,255,.7); padding: 3px 10px; border-radius: 20px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* 卡片操作按钮 */
.cc-act-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 5px;
  border: none; background: transparent; cursor: pointer;
  color: #9ca3af; padding: 0; transition: all .12s;
}
.cc-act-btn:hover { background: rgba(255,255,255,.8); color: #374151; }
.cc-act-btn:disabled { opacity: .3; cursor: default; }
.cc-act-btn--expand { color: #6b7280; width: auto; padding: 0 5px; gap: 3px; }
.cc-act-btn--expand:hover { color: #6366f1; background: #eef2ff; }
.cc-act-btn--del:hover { background: #fef2f2; color: #ef4444; }
.cc-expand-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; border-radius: 9px;
  background: #6366f1; color: #fff; font-size: 10px; font-weight: 700;
  padding: 0 5px; line-height: 1;
}

/* 指标输入区 */
.cc-inputs {
  display: flex; gap: 8px; padding: 12px 16px;
  flex-wrap: wrap; align-items: flex-end;
}
.cc-input-item {
  display: flex; flex-direction: column; gap: 4px;
  flex: 1; min-width: 90px;
}
.cc-input-item.collapsed { display: none; }
.cc-input-label {
  font-size: 11px; font-weight: 700; color: #6b7280;
  display: flex; align-items: center; gap: 4px; white-space: nowrap;
}
.cc-usd-toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; border-radius: 3px; border: none;
  background: transparent; cursor: pointer; color: #9ca3af; padding: 0;
}
.cc-usd-toggle:hover { background: #f3f4f6; color: #6366f1; }
.cc-input-num { width: 100%; }
.cc-input-num :deep(.el-input__wrapper) {
  background: var(--surface-input); border-radius: 8px;
  box-shadow: 0 0 0 1px var(--border-default); padding: 2px 10px; transition: box-shadow .15s;
}
.cc-input-num :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1.5px #c7d2fe; }
.cc-input-num :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px #6366f1 !important; }
.cc-input-num :deep(.el-input__inner) { font-size: 15px; font-weight: 700; color: #1f2937; height: 36px; }
.cc-input-num--usd :deep(.el-input__wrapper) { background: #fffef5; }
.cc-input-num--usd :deep(.el-input__inner) { color: #a16207; }

.cc-required-tag {
  font-size: 10px; font-weight: 700; color: #ef4444;
  background: #fef2f2; padding: 1px 6px; border-radius: 3px;
  animation: ccPulse 1.5s ease-in-out infinite;
}
@keyframes ccPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

.cc-input-item--cost { min-width: 110px; }
.cc-cost-pair { display: flex; align-items: center; gap: 4px; }
.cc-cost-val { font-size: 14px; font-weight: 800; color: var(--row-color, #6366f1); }
.cc-cost-val--eff { font-size: 12px; opacity: .7; }
.cc-cost-sep { color: #d1d5db; font-size: 12px; }

/* ====== 拉群详情（卡片内） ====== */
.cc-details {
  border-top: 1px solid #e0e7ff;
  padding: 10px 16px 14px; display: flex; flex-direction: column; gap: 6px;
  background: linear-gradient(180deg, #f8faff 0%, #ffffff 100%);
}
.cc-details-hd {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding-bottom: 4px;
}
.cc-details-title { font-size: 13px; font-weight: 700; color: #374151; }
.cc-details-meta { font-size: 11px; font-weight: 600; color: #9ca3af; }
.cc-details-meta--warn { color: #ef4444; }

.cc-detail-row {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 8px;
  transition: border-color .12s;
}
.cc-detail-row:hover { border-color: #c7d2fe; }
.cc-detail-text { flex: 1; }
.cc-detail-text :deep(.el-input__wrapper) { background: var(--surface-input); }
.cc-detail-status { width: 90px; flex-shrink: 0; }
.cc-detail-del { flex-shrink: 0; opacity: .4; }
.cc-detail-del:hover { opacity: 1; }
.cc-detail-add {
  align-self: flex-start; padding: 6px 12px;
  border: 1px dashed #d1d5db; border-radius: 8px;
  font-size: 12px; font-weight: 700; color: #6b7280;
  transition: all .12s;
}
.cc-detail-add:hover { border-color: #6366f1; color: #6366f1; background: #f5f3ff; }

/* ====== 全局拉群详情pills ====== */
.gd-entry-pill {
  display:inline-block; font-size:12px; color:#374151; margin:2px 4px 2px 0;
  padding:2px 8px; background:#f3f4f6; border-radius:5px;
  white-space:nowrap;
}
.gd-global-val { font-size: 13px; color: #6b7280; line-height: 1.8; }

/* ====== 预览（右侧固定） ====== */
.preview-sticky { position: sticky; top: 16px; background: var(--surface-card); border: 1px solid var(--brand-200); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sm); }
.preview-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #f5f3ff; border-bottom: 1px solid #e0e7ff; font-weight: 700; font-size: 14px; }
.preview-content { white-space: pre-wrap; line-height: 1.9; font-size: 13px; padding: 16px 18px; color: #1f2937; max-height: calc(100vh - 180px); overflow-y: auto; }
.preview-empty { text-align: center; padding: 60px 20px; color: var(--text-tertiary); background: var(--surface-card); border: 1px dashed var(--border-default); border-radius: 14px; position: sticky; top: 16px; }
.preview-empty p { margin: 10px 0 0; font-size: 14px; line-height: 1.6; }

/* ====== 空状态 ====== */
.empty-state { text-align: center; padding: 80px 20px; color: var(--text-tertiary); background: var(--surface-card); border: 1px solid var(--border-default); border-radius: 14px; }
.empty-state p { font-size: 16px; font-weight: 600; margin: 12px 0 4px; color: #6b7280; }
.empty-state span { font-size: 13px; }
@media (max-width: 960px) { .main-layout { flex-direction: column; } .right-panel { width: 100%; } .preview-sticky { position: static; } }
</style>
