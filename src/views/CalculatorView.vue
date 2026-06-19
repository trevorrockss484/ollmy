<template>
  <div class="calc-page">
    <div class="page-header">
      <h2>🧮 工具</h2>
      <p class="sub">汇率计算 · 通用计算器</p>
    </div>

    <el-row :gutter="16">
      <!-- 汇率计算 -->
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span style="font-weight:700;">💱 汇率计算器</span></template>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <el-input-number v-model="fxAmount" :min="0" :precision="2" style="width:160px;" size="large" />
            <el-select v-model="fxFrom" style="width:130px;" size="large">
              <el-option v-for="c in currencies" :key="c.code" :label="c.code + ' ' + c.label" :value="c.code" />
            </el-select>
            <el-button circle size="large" @click="swapFx"><el-icon><Sort /></el-icon></el-button>
            <el-select v-model="fxTo" style="width:130px;" size="large">
              <el-option v-for="c in currencies" :key="c.code" :label="c.code + ' ' + c.label" :value="c.code" />
            </el-select>
            <span style="font-size:13px;color:#6b7280;">=</span>
            <span style="font-size:28px;font-weight:800;color:#6366f1;">{{ fxResult }}</span>
          </div>

          <!-- 自定义汇率 -->
          <div style="margin-top:16px;display:flex;gap:12px;align-items:center;">
            <span style="font-size:12px;color:#6b7280;">自定义汇率：1 {{ fxFrom }} =</span>
            <el-input-number v-model="customRate" :min="0" :precision="4" style="width:140px;" size="small" />
            <span style="font-size:12px;color:#6b7280;">{{ fxTo }}</span>
            <el-button size="small" @click="useCustomRate">使用</el-button>
          </div>

          <!-- 快捷汇率 -->
          <div style="margin-top:16px;display:flex;gap:6px;flex-wrap:wrap;">
            <el-tag
              v-for="r in quickRates"
              :key="r.label"
              :type="r.active ? 'primary' : 'info'"
              effect="plain"
              style="cursor:pointer;"
              @click="selectQuickRate(r)"
            >
              {{ r.label }}: {{ r.rate }}
            </el-tag>
          </div>

          <el-alert style="margin-top:12px;" title="提示" type="info" :closable="false" show-icon>
            常用汇率：人民币CNY、印尼盾IDR、越南盾VND、埃塞俄比亚比尔ETB、尼日利亚奈拉NGN、南非兰特ZAR、美元USD
          </el-alert>
        </el-card>
      </el-col>

      <!-- 通用计算器 -->
      <el-col :span="12">
        <el-card shadow="never" style="height:100%;">
          <template #header><span style="font-weight:700;">🔢 计算器</span></template>
          <div style="text-align:center;">
            <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin-bottom:16px;min-height:56px;display:flex;align-items:center;justify-content:flex-end;font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;word-break:break-all;">
              {{ calcDisplay || '0' }}
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
              <el-button size="large" @click="calcInput('C')" type="danger" plain>C</el-button>
              <el-button size="large" @click="calcInput('(')">(</el-button>
              <el-button size="large" @click="calcInput(')')">)</el-button>
              <el-button size="large" @click="calcInput('/')" type="primary" plain>/</el-button>

              <el-button size="large" @click="calcInput('7')">7</el-button>
              <el-button size="large" @click="calcInput('8')">8</el-button>
              <el-button size="large" @click="calcInput('9')">9</el-button>
              <el-button size="large" @click="calcInput('*')" type="primary" plain>×</el-button>

              <el-button size="large" @click="calcInput('4')">4</el-button>
              <el-button size="large" @click="calcInput('5')">5</el-button>
              <el-button size="large" @click="calcInput('6')">6</el-button>
              <el-button size="large" @click="calcInput('-')" type="primary" plain>−</el-button>

              <el-button size="large" @click="calcInput('1')">1</el-button>
              <el-button size="large" @click="calcInput('2')">2</el-button>
              <el-button size="large" @click="calcInput('3')">3</el-button>
              <el-button size="large" @click="calcInput('+')" type="primary" plain>+</el-button>

              <el-button size="large" @click="calcInput('0')" style="grid-column:span 2;">0</el-button>
              <el-button size="large" @click="calcInput('.')">.</el-button>
              <el-button size="large" @click="calcEval()" type="primary" style="font-weight:700;">=</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

// ====== 汇率计算 ======
const currencies = [
  { code: 'CNY', label: '人民币' }, { code: 'USD', label: '美元' },
  { code: 'IDR', label: '印尼盾' }, { code: 'VND', label: '越南盾' },
  { code: 'ETB', label: '埃塞比尔' }, { code: 'NGN', label: '尼日奈拉' },
  { code: 'ZAR', label: '南非兰特' }, { code: 'EUR', label: '欧元' },
]

// 基准汇率 (相对于人民币 CNY)
const baseRates = {
  CNY: 1, USD: 7.25, IDR: 0.00046, VND: 0.00030,
  ETB: 0.065, NGN: 0.0047, ZAR: 0.38, EUR: 7.90
}

const fxAmount = ref(1)
const fxFrom = ref('CNY')
const fxTo = ref('IDR')
const customRate = ref(0)

const fxResult = computed(() => {
  let rate
  if (customRate.value > 0) {
    rate = customRate.value
  } else {
    rate = baseRates[fxTo.value] / baseRates[fxFrom.value]
  }
  const result = fxAmount.value * rate
  // IDR/VND 是整数
  if (['IDR','VND'].includes(fxTo.value)) {
    return Math.round(result).toLocaleString() + ' ' + fxTo.value
  }
  return result.toFixed(2) + ' ' + fxTo.value
})

const quickRates = computed(() => {
  const from = fxFrom.value
  return [
    { label: 'USD', rate: (baseRates.USD / baseRates[from]).toFixed(2), code: 'USD', active: fxTo.value === 'USD' },
    { label: 'IDR', rate: (baseRates.IDR / baseRates[from]).toFixed(6), code: 'IDR', active: fxTo.value === 'IDR' },
    { label: 'VND', rate: (baseRates.VND / baseRates[from]).toFixed(6), code: 'VND', active: fxTo.value === 'VND' },
    { label: 'NGN', rate: (baseRates.NGN / baseRates[from]).toFixed(4), code: 'NGN', active: fxTo.value === 'NGN' },
    { label: 'ZAR', rate: (baseRates.ZAR / baseRates[from]).toFixed(2), code: 'ZAR', active: fxTo.value === 'ZAR' },
  ]
})

function swapFx() {
  const tmp = fxFrom.value
  fxFrom.value = fxTo.value
  fxTo.value = tmp
}

function useCustomRate() {
  ElMessage.success('汇率已更新')
}

function selectQuickRate(r) {
  fxTo.value = r.code
  customRate.value = Number(r.rate)
}

// ====== 计算器 ======
const calcDisplay = ref('')

function calcInput(key) {
  if (key === 'C') {
    calcDisplay.value = ''
  } else if (key === '*') {
    calcDisplay.value += '*'
  } else {
    calcDisplay.value += key
  }
}

function calcEval() {
  try {
    const expr = calcDisplay.value.replace(/[^0-9+\-*/.()]/g, '')
    if (!expr) return
    const result = Function('"use strict"; return (' + expr + ')')()
    if (result === Infinity || result === -Infinity) {
      calcDisplay.value = '错误'
      return
    }
    calcDisplay.value = String(Number.isInteger(result) ? result : result.toFixed(6).replace(/\.?0+$/, ''))
  } catch (e) {
    calcDisplay.value = '错误'
  }
}
</script>
