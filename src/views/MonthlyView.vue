<template>
  <div class="monthly-page">
    <div class="page-header">
      <h2><el-icon :size="22"><DataAnalysis /></el-icon> 月度总结</h2>
      <p class="sub">自动汇总月度数据 · 生成月度报告</p>
    </div>

    <!-- 工具栏 -->
    <div class="monthly-toolbar">
      <div class="monthly-toolbar-left">
        <el-date-picker v-model="month" type="month" value-format="YYYY-MM" placeholder="选择月份" size="default" @change="load" />
      </div>
      <div class="monthly-toolbar-right">
        <el-button type="primary" @click="generateReport" :disabled="!summary">
          <el-icon><Document /></el-icon> 生成月度总结
        </el-button>
        <el-button @click="copyReport" :disabled="!reportText">
          <el-icon><CopyDocument /></el-icon> 一键复制
        </el-button>
      </div>
    </div>

    <!-- 数据概览 -->
    <div v-if="summary" class="monthly-summary-row">
      <div class="monthly-summary-item">
        <div class="msi-icon" style="background:#eef2ff;color:#6366f1;">📅</div>
        <div class="msi-info"><div class="msi-val">{{ summary.days }}</div><div class="msi-label">工作天数</div></div>
      </div>
      <div class="monthly-summary-item">
        <div class="msi-icon" style="background:#fff7ed;color:#ea580c;">💰</div>
        <div class="msi-info"><div class="msi-val">¥{{ Math.round(summary.fbBudget) }}</div><div class="msi-label">FB总消耗</div></div>
      </div>
      <div class="monthly-summary-item">
        <div class="msi-icon" style="background:#ecfdf5;color:#059669;">👥</div>
        <div class="msi-info"><div class="msi-val">{{ summary.fbCustomer }}</div><div class="msi-label">FB总客户</div></div>
      </div>
      <div class="monthly-summary-item">
        <div class="msi-icon" style="background:#ecfdf5;color:#059669;">💬</div>
        <div class="msi-info"><div class="msi-val success">{{ summary.fbGrouped }}</div><div class="msi-label">FB总拉群</div></div>
      </div>
      <div class="monthly-summary-item">
        <div class="msi-icon" style="background:#eef2ff;color:#6366f1;">📊</div>
        <div class="msi-info"><div class="msi-val">¥{{ Math.round(summary.txBudget) }}</div><div class="msi-label">TX总消耗</div></div>
      </div>
      <div class="monthly-summary-item">
        <div class="msi-icon" style="background:#ecfdf5;color:#059669;">✅</div>
        <div class="msi-info"><div class="msi-val">{{ summary.txEffective }}</div><div class="msi-label">TX有效客户</div></div>
      </div>
      <div class="monthly-summary-item">
        <div class="msi-icon" style="background:#eef2ff;color:#6366f1;">📈</div>
        <div class="msi-info"><div class="msi-val">¥{{ summary.fbAvgCost }}</div><div class="msi-label">FB客均成本</div></div>
      </div>
      <div class="monthly-summary-item">
        <div class="msi-icon" style="background:#fff7ed;color:#ea580c;">🔥</div>
        <div class="msi-info"><div class="msi-val" style="color:#6366f1;">¥{{ Math.round(summary.totalBudget) }}</div><div class="msi-label">总消耗</div></div>
      </div>
    </div>

    <!-- 每日明细表 -->
    <div v-if="summary" class="monthly-table-wrap">
      <div class="monthly-table-header">📋 每日明细</div>
      <div class="monthly-table">
        <div class="monthly-thead">
          <div class="monthly-th monthly-th--date">日期</div>
          <div class="monthly-th">国家</div>
          <div class="monthly-th">FB消耗</div>
          <div class="monthly-th">FB拉群</div>
          <div class="monthly-th">TX消耗</div>
          <div class="monthly-th">TX有效</div>
        </div>
        <div v-for="r in detailList" :key="r.date" class="monthly-tr">
          <div class="monthly-td monthly-td--date">{{ r.date }}</div>
          <div class="monthly-td"><el-tag size="small" type="primary" effect="plain">{{ r.country }}</el-tag></div>
          <div class="monthly-td price">{{ r.fbBudget }}</div>
          <div class="monthly-td highlight">{{ r.fbGrouped }}</div>
          <div class="monthly-td price">{{ r.txBudget }}</div>
          <div class="monthly-td">{{ r.txEffective }}</div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!summary && !loading" class="monthly-empty">
      <el-icon :size="48" color="#d1d5db"><DataAnalysis /></el-icon>
      <p>暂无数据，选择月份查看</p>
    </div>

    <!-- 报告预览 -->
    <div v-if="reportText" class="monthly-report-wrap">
      <div class="monthly-report-header">
        <span>📄 月度总结报告</span>
        <span style="font-size:12px;color:#9ca3af;">可一键复制</span>
      </div>
      <div class="report-preview">{{ reportText }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { api, formatDateCN, todayStr } from '../api'

const month = ref(todayStr().substring(0,7))
const summary = ref(null)
const reportText = ref('')
const loading = ref(false)

const detailList = computed(() => {
  if (!summary.value?.daily) return []
  return Object.entries(summary.value.daily).sort(([a],[b]) => a.localeCompare(b)).map(([date, d]) => ({
    date: formatDateCN(date), country: d.country||'-',
    fbBudget: '¥'+Math.round(d.fbBudget), fbGrouped: d.fbGrouped,
    txBudget: '¥'+Math.round(d.txBudget), txEffective: d.txEffective
  }))
})

async function load() {
  loading.value = true
  const m = typeof month.value === 'string' ? month.value : month.value.toISOString().substring(0,7)
  const res = await api.summary.monthly(m)
  if (res.success) summary.value = res.data
  else { summary.value = null; ElMessage.warning('该月份暂无数据') }
  loading.value = false
}

function generateReport() {
  if (!summary.value) return
  const s = summary.value
  const [y,m] = (typeof month.value==='string' ? month.value : month.value.toISOString().substring(0,7)).split('-')
  const lastDay = new Date(+y, +m, 0).getDate()
  const validRate = s.fbCustomer>0 ? (s.fbGrouped/s.fbCustomer*100).toFixed(1) : '0'

  reportText.value = `【海外运营月度总结】${y}年${parseInt(m)}月
━━━━━━━━━━━━━━━━━━
📅 周期：${y}年${parseInt(m)}月1日 - ${y}年${parseInt(m)}月${lastDay}日
📊 工作天数：${s.days} 天

💰 预算使用：
• FB IG 总消耗：¥${Math.round(s.fbBudget)}
• 腾讯广告总消耗：¥${Math.round(s.txBudget)}
• 合计消耗：¥${Math.round(s.totalBudget)}
• 日均消耗：¥${Math.round(s.totalBudget/s.days)}

📈 客户数据：
• FB IG 新客户：${s.fbCustomer} 个（客均 ¥${s.fbAvgCost}）
• FB IG 拉群：${s.fbGrouped} 个（转化率 ${validRate}%）
• 腾讯广告新客户：${s.txCustomer} 个
• 腾讯广告有效客户：${s.txEffective} 个（有效成本 ¥${s.txAvgCost}）

📋 FB IG 客户分类：
• 发目录未回：${s.fbCatNoReply} 个
• 发信息未理会：${s.fbMsgIgnore} 个
• 已拉群：${s.fbGrouped} 个
• 低预算：${s.fbLowBudget} 个
• 同行：${s.fbCompetitor} 个
• 骚扰：${s.fbHarass} 个
• 计划参观未定：${s.fbVisitPending} 个

🎯 优化建议：
• 提高客户精准度，降低无效客户比例
• 高预算重点投放东南亚市场
• 小预算测试非洲市场

━━━━━━━━━━━━━━━━━━
海外运营部`
}

async function copyReport() {
  await navigator.clipboard.writeText(reportText.value)
  ElMessage.success('已复制到剪贴板')
}

onMounted(load)
</script>

<style scoped>
.monthly-page { animation: fadeIn .3s ease; }
.page-header { margin-bottom:24px; }
.page-header h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }

/* 工具栏 */
.monthly-toolbar {
  display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap;
}
.monthly-toolbar-left { display:flex; align-items:center; gap:8px; }
.monthly-toolbar-right { margin-left:auto; display:flex; gap:8px; }

/* 汇总卡片 */
.monthly-summary-row {
  display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap;
}
.monthly-summary-item {
  display:flex; align-items:center; gap:10px;
  background:#fff; border-radius:12px; padding:14px 18px;
  border:1px solid #e5e7eb; flex:1; min-width:150px;
}
.msi-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }
.msi-val { font-size:20px; font-weight:800; color:#1f2937; line-height:1.1; }
.msi-val.success { color:#059669; }
.msi-label { font-size:11px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:.3px; }

/* 表格 */
.monthly-table-wrap {
  background:#fff; border-radius:14px; border:1px solid #e5e7eb;
  overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,.03);
  margin-bottom:20px;
}
.monthly-table-header {
  padding:14px 18px; font-weight:700; font-size:14px;
  border-bottom:1px solid #f3f4f6;
}
.monthly-table { width:100%; }
.monthly-thead {
  display:grid; grid-template-columns:160px 120px repeat(2,1fr) 1fr 100px;
  background:#f9fafb; border-bottom:1px solid #e5e7eb;
}
.monthly-th {
  padding:12px 14px; font-size:11px; font-weight:800; color:#9ca3af;
  text-transform:uppercase; letter-spacing:.5px; text-align:right;
}
.monthly-th--date { text-align:left; padding-left:20px; }
.monthly-tr {
  display:grid; grid-template-columns:160px 120px repeat(2,1fr) 1fr 100px;
  border-bottom:1px solid #f3f4f6; background:#fff; transition:all 0.12s;
}
.monthly-tr:hover { background:#fafaff; }
.monthly-tr:last-child { border-bottom:none; }
.monthly-td {
  padding:14px 14px; font-size:14px; font-weight:600; color:#1f2937;
  text-align:right; display:flex; align-items:center; justify-content:flex-end;
}
.monthly-td.price { color:#6366f1; font-weight:700; }
.monthly-td.highlight { color:#059669; font-weight:700; }
.monthly-td--date { justify-content:flex-start; padding-left:20px; font-weight:700; }

/* 空状态 */
.monthly-empty { text-align:center; padding:60px 20px; color:#9ca3af; }
.monthly-empty p { font-size:14px; margin-top:12px; }

/* 报告预览 */
.monthly-report-wrap {
  background:#fff; border-radius:14px; border:1px solid #e5e7eb;
  box-shadow:0 1px 2px rgba(0,0,0,.03); overflow:hidden;
}
.monthly-report-header {
  padding:14px 18px; font-weight:700; font-size:14px;
  border-bottom:1px solid #f3f4f6;
  display:flex; justify-content:space-between; align-items:center;
}
.report-preview {
  padding:20px; white-space:pre-wrap; font-size:13px; line-height:1.9;
  max-height:520px; overflow-y:auto;
  font-family:"PingFang SC","Microsoft YaHei",monospace;
  color:#1f2937;
}
</style>
