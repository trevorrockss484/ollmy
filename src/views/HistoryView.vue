<template>
  <div class="history-page">
    <div class="page-header">
      <h2><el-icon :size="22"><Clock /></el-icon> 历史查询</h2>
      <p class="sub">查看过往日报数据 · 导出备份 · 核对历史</p>
    </div>

    <!-- 工具栏 -->
    <div class="hist-toolbar">
      <div class="hist-toolbar-left">
        <el-date-picker v-model="filter.startDate" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width:140px;" size="default" />
        <span style="color:#9ca3af;">—</span>
        <el-date-picker v-model="filter.endDate" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" style="width:140px;" size="default" />
        <el-select v-model="filter.country" placeholder="选择国家" clearable style="width:130px;" size="default">
          <el-option v-for="c in countries" :key="c" :label="c" :value="c" />
        </el-select>
        <el-button type="primary" @click="query" :loading="loading">
          <el-icon><Search /></el-icon> 查询
        </el-button>
      </div>
      <div class="hist-toolbar-right">
        <el-button @click="exportCSV" :disabled="!list.length">
          <el-icon><Download /></el-icon> 导出CSV
        </el-button>
      </div>
    </div>

    <!-- 汇总卡片 -->
    <div v-if="list.length" class="hist-summary-row">
      <div class="hist-summary-item">
        <div class="hsi-icon" style="background:#eef2ff;color:#6366f1;">📅</div>
        <div class="hsi-info"><div class="hsi-val">{{ list.length }}</div><div class="hsi-label">记录数</div></div>
      </div>
      <div class="hist-summary-item">
        <div class="hsi-icon" style="background:#fff7ed;color:#ea580c;">💰</div>
        <div class="hsi-info"><div class="hsi-val">¥{{ Math.round(totals.fbBudget) }}</div><div class="hsi-label">FB总消耗</div></div>
      </div>
      <div class="hist-summary-item">
        <div class="hsi-icon" style="background:#ecfdf5;color:#059669;">👥</div>
        <div class="hsi-info"><div class="hsi-val">{{ totals.fbCustomer }}</div><div class="hsi-label">FB新客户</div></div>
      </div>
      <div class="hist-summary-item">
        <div class="hsi-icon" style="background:#ecfdf5;color:#059669;">💬</div>
        <div class="hsi-info"><div class="hsi-val success">{{ totals.fbGrouped }}</div><div class="hsi-label">FB拉群</div></div>
      </div>
      <div class="hist-summary-item">
        <div class="hsi-icon" style="background:#eef2ff;color:#6366f1;">📊</div>
        <div class="hsi-info"><div class="hsi-val">¥{{ Math.round(totals.txBudget) }}</div><div class="hsi-label">TX总消耗</div></div>
      </div>
      <div class="hist-summary-item">
        <div class="hsi-icon" style="background:#ecfdf5;color:#059669;">✅</div>
        <div class="hsi-info"><div class="hsi-val">{{ totals.txEffective }}</div><div class="hsi-label">TX有效客户</div></div>
      </div>
    </div>

    <!-- 数据表 -->
    <div class="hist-table-wrap">
      <div v-if="!list.length && !loading" class="hist-empty">
        <el-icon :size="48" color="#d1d5db"><Document /></el-icon>
        <p v-if="!filter.startDate">请选择日期范围后点击查询</p>
        <p v-else>暂无数据，请调整筛选条件</p>
      </div>

      <div v-else class="hist-table">
        <div class="hist-thead">
          <div class="hist-th hist-th--date">日期</div>
          <div class="hist-th">国家</div>
          <div class="hist-th">FB消耗</div>
          <div class="hist-th">FB客户</div>
          <div class="hist-th">FB拉群</div>
          <div class="hist-th">TX消耗</div>
          <div class="hist-th">TX有效</div>
          <div class="hist-th hist-th--action">操作</div>
        </div>

        <div v-for="r in list" :key="r.rawDate" class="hist-tr" @click="editDaily(r.rawDate)">
          <div class="hist-td hist-td--date">
            <div class="hist-date">{{ r.date }}</div>
          </div>
          <div class="hist-td"><el-tag size="small" type="primary" effect="plain">{{ r.country }}</el-tag></div>
          <div class="hist-td price">¥{{ Math.round(r.fbBudget) }}</div>
          <div class="hist-td">{{ r.fbNewCustomer }}</div>
          <div class="hist-td highlight">{{ r.fbGrouped }}</div>
          <div class="hist-td price">¥{{ Math.round(r.txBudget) }}</div>
          <div class="hist-td">{{ r.txEffective }}</div>
          <div class="hist-td hist-td--action" @click.stop>
            <el-button link type="primary" size="small" @click="editDaily(r.rawDate)">查看</el-button>
            <el-button link type="danger" size="small" @click="delDaily(r.rawDate)">删除</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, formatDateCN, todayStr } from '../api'

const router = useRouter()
const countries = ['综合','印度尼西亚','越南','埃塞俄比亚','尼日利亚','南非']
const loading = ref(false)
const list = ref([])

const filter = reactive({
  startDate: '',
  endDate: '',
  country: ''
})

const totals = computed(() => {
  const t = { fbBudget:0, fbCustomer:0, fbGrouped:0, txBudget:0, txCustomer:0, txEffective:0 }
  list.value.forEach(r => {
    t.fbBudget += r.fbBudget; t.fbCustomer += r.fbNewCustomer; t.fbGrouped += r.fbGrouped
    t.txBudget += r.txBudget; t.txCustomer += r.txNewCustomer; t.txEffective += r.txEffective
  })
  return t
})

async function query() {
  if (!filter.startDate && !filter.endDate) { ElMessage.warning('请选择日期范围'); return }
  loading.value = true
  const params = {}
  if (filter.startDate) params.startDate = filter.startDate
  if (filter.endDate) params.endDate = filter.endDate
  if (filter.country) params.country = filter.country
  try {
    const res = await api.daily.list(params)
    if (res.success) {
      list.value = Object.entries(res.data).sort(([a],[b]) => b.localeCompare(a)).map(([date, d]) => ({
        date: formatDateCN(date), rawDate: date,
        country: d.country||'—',
        fbBudget: d.fb?.budget||0, fbNewCustomer: d.fb?.newCustomer||0, fbGrouped: d.fb?.grouped||0,
        txBudget: d.tx?.budget||0, txNewCustomer: d.tx?.newCustomer||0, txEffective: d.tx?.effective||0,
        _data: d
      }))
    }
  } catch(e) { ElMessage.error('查询失败') }
  loading.value = false
}

async function delDaily(date) {
  await ElMessageBox.confirm('确定删除该日报？', '确认', { type: 'warning' })
  await api.daily.delete(date)
  ElMessage.success('已删除')
  query()
}

function editDaily(date) {
  const d = list.value.find(r => r.rawDate === date)
  if (d?._data) {
    sessionStorage.setItem('editDaily', JSON.stringify({ date, data: d._data }))
    router.push('/report')
  }
}

function exportCSV() {
  let h = '﻿日期,国家,FB消耗,FB新客户,FB发目录未回,FB发信息未理会,FB已拉群,FB低预算,FB同行,FB骚扰,FB参观未定,FB拉群详情,FB总结,FB优化方向,TX消耗,TX新客户,TX有效,TX平均成本,TX总结,今日工作,第二天工作,每日工作\n'
  list.value.forEach(r => {
    const fb=r._data?.fb||{}, tx=r._data?.tx||{}, w=r._data?.work||{}
    h += [r.rawDate,r.country,fb.budget,fb.newCustomer,fb.catNoReply,fb.msgIgnore,fb.grouped,fb.lowBudget,fb.competitor,fb.harass,fb.visitPending,
      '"'+(fb.groupDetail||'').replace(/"/g,'""')+'"','"'+(fb.summary||'').replace(/"/g,'""')+'"','"'+(fb.optimize||'').replace(/"/g,'""')+'"',
      tx.budget,tx.newCustomer,tx.effective,tx.avgCost,'"'+(tx.summary||'').replace(/"/g,'""')+'"',
      '"'+(w.today||'').replace(/"/g,'""')+'"','"'+(w.tomorrow||'').replace(/"/g,'""')+'"','"'+(w.daily||'').replace(/"/g,'""')+'"'
    ].join(',')+'\n'
  })
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([h],{type:'text/csv;charset=utf-8'}))
  a.download = '运营数据.csv'; a.click()
  ElMessage.success('CSV已下载')
}

onMounted(() => {
  filter.startDate = todayStr().substring(0,8) + '01'
  filter.endDate = ''
  // 不自动查询，让用户主动查询
})
</script>

<style scoped>
.history-page { animation: fadeIn .3s ease; }
.page-header { margin-bottom:24px; }
.page-header h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }

/* 工具栏 */
.hist-toolbar {
  display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap;
}
.hist-toolbar-left { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.hist-toolbar-right { margin-left:auto; }

/* 汇总行 */
.hist-summary-row {
  display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap;
}
.hist-summary-item {
  display:flex; align-items:center; gap:10px;
  background:#fff; border-radius:12px; padding:14px 18px;
  border:1px solid #e5e7eb; flex:1; min-width:150px;
}
.hsi-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }
.hsi-val { font-size:20px; font-weight:800; color:#1f2937; line-height:1.1; }
.hsi-val.success { color:#059669; }
.hsi-label { font-size:11px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:.3px; }

/* 表格 */
.hist-table-wrap {
  background:#fff; border-radius:14px; border:1px solid #e5e7eb;
  overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,.03);
}
.hist-empty { text-align:center; padding:60px 20px; }
.hist-empty p { font-size:14px; color:#9ca3af; margin-top:12px; }

.hist-table { width:100%; }
.hist-thead {
  display:grid; grid-template-columns:150px 100px repeat(4,1fr) 80px 120px;
  background:#f9fafb; border-bottom:1px solid #e5e7eb;
}
.hist-th {
  padding:12px 14px; font-size:11px; font-weight:800; color:#9ca3af;
  text-transform:uppercase; letter-spacing:.5px; text-align:right;
}
.hist-th--date { text-align:left; padding-left:20px; }
.hist-th--action { text-align:center; }

.hist-tr {
  display:grid; grid-template-columns:150px 100px repeat(4,1fr) 80px 120px;
  border-bottom:1px solid #f3f4f6; cursor:pointer;
  transition:all 0.12s; background:#fff;
}
.hist-tr:hover { background:#fafaff; }
.hist-tr:last-child { border-bottom:none; }

.hist-td {
  padding:14px 14px; font-size:14px; font-weight:600; color:#1f2937;
  text-align:right; display:flex; align-items:center; justify-content:flex-end;
  font-variant-numeric:tabular-nums;
}
.hist-td.price { color:#6366f1; font-weight:700; }
.hist-td.highlight { color:#059669; font-weight:700; }
.hist-td--date { justify-content:flex-start; padding-left:20px; }
.hist-td--action { justify-content:center; gap:4px; }
.hist-date { font-size:14px; font-weight:700; color:#111827; }

@media (max-width:768px) {
  .hist-thead, .hist-tr { grid-template-columns:120px 80px repeat(4,minmax(60px,1fr)) 60px 100px; }
  .hist-th, .hist-td { padding:10px 8px; font-size:12px; }
}
</style>
