<template>
  <div class="report-page">
    <!-- ====== 顶部栏 ====== -->
    <div class="top-bar">
      <div class="top-row">
        <div class="top-left">
          <h2><el-icon :size="24"><Edit /></el-icon> 每日汇报</h2>
          <el-date-picker v-model="reportDate" type="date" value-format="YYYY-MM-DD" size="default" style="width:148px;" />
          <el-select v-model="selectedAccountId" size="default" style="width:180px;" placeholder="选择广告账号" @change="onAccountChange">
            <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
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
      <el-button size="default" @click="saveData"><el-icon :size="15"><Check /></el-icon> 保存</el-button>
      <el-button size="default" @click="clearForm" type="danger" plain><el-icon :size="15"><Delete /></el-icon> 清空</el-button>
      <span v-if="saveMsg" class="save-msg" :class="{ ok: saveOk, err: !saveOk }">{{ saveMsg }}</span>
    </div>

    <div class="main-layout" v-if="activeCountries.length">
      <!-- ====== 左侧：国家表单 + 总结优化 ====== -->
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
            <div class="ov-item ov-item-usd">
              <div class="ov-val">${{ fmtNum(overallTotal.usdBudget) }}</div>
              <div class="ov-label">美金</div>
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
            <button class="sort-btn" :class="{ active: sortMode === 'az' }" @click="sortCountries('az')">A → Z</button>
            <button class="sort-btn" :class="{ active: sortMode === 'customer' }" @click="sortCountries('customer')">客资</button>
            <button class="sort-btn" :class="{ active: sortMode === 'budget' }" @click="sortCountries('budget')">消耗</button>
            <button class="sort-btn" :class="{ active: sortMode === 'grouped' }" @click="sortCountries('grouped')">拉群</button>
          </div>
        </div>

        <div v-for="(c, i) in activeCountries" :key="c" class="country-card" :style="{ '--cc-color': countryColors[i], '--cc-color-light': countryColors[i] + '18' }">
          <div class="cc-header">
            <div class="cc-header-left">
              <span class="cc-num" :style="{ background: countryColors[i] }">{{ i + 1 }}</span>
              <span class="fi" :class="'fi-' + flagCode(c)" style="border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.1);"></span>
              <span class="cc-name">{{ c }}</span>
            </div>
            <div class="cc-header-right">
              <el-button size="small" text :disabled="i === 0" @click="moveCountry(i, -1)"><el-icon :size="14"><Top /></el-icon></el-button>
              <el-button size="small" text :disabled="i === activeCountries.length - 1" @click="moveCountry(i, 1)"><el-icon :size="14"><Bottom /></el-icon></el-button>
              <el-button size="small" text type="danger" class="cc-remove-btn" @click="removeCountry(c)" :disabled="activeCountries.length <= 1">移除</el-button>
            </div>
          </div>
          <div class="cc-body">
            <div class="cc-row">
              <div class="cc-field">
                <label>费用</label>
                <el-input-number v-model="countryData[c].budget" :min="0" :precision="2" :controls="false" placeholder="0" class="cc-input" />
                <span class="cc-unit">元</span>
              </div>
              <div class="cc-field cc-field-usd">
                <label>美金 <el-tooltip content="对账用，不写入日报" placement="top"><span class="usd-hint">?</span></el-tooltip></label>
                <el-input-number v-model="countryData[c].usdBudget" :min="0" :precision="2" :controls="false" placeholder="$" class="cc-input cc-input-usd" />
                <span class="cc-unit">$</span>
              </div>
              <div class="cc-field">
                <label>客资</label>
                <el-input-number v-model="countryData[c].newCustomer" :min="0" :controls="false" placeholder="0" class="cc-input" />
                <span class="cc-unit">个</span>
              </div>
              <div class="cc-field">
                <label>拉群</label>
                <el-input-number v-model="countryData[c].grouped" :min="0" :controls="false" placeholder="0" class="cc-input" />
                <span class="cc-unit">个</span>
              </div>
              <div class="cc-field cc-computed">
                <label>询盘客价</label>
                <div class="cc-computed-val">{{ countryAvg(c) > 0 ? '¥' + countryAvg(c).toFixed(1) : '—' }}</div>
              </div>
              <div class="cc-field cc-computed">
                <label>有效客价</label>
                <div class="cc-computed-val">{{ countryEffCost(c) > 0 ? '¥' + countryEffCost(c).toFixed(1) : '—' }}</div>
              </div>
            </div>
            <div class="cc-gd">
              <label>总拉群及客户详情</label>
              <div class="gd-entries">
                <div v-for="(entry, ei) in countryData[c].groupEntries" :key="entry.id" class="gd-entry-row">
                  <el-input v-model="entry.text" placeholder="如：印度x2，平面图" size="small" class="gd-entry-text" />
                  <el-select v-model="entry.status" placeholder="状态" size="small" class="gd-entry-status" clearable>
                    <el-option label="到现场" value="到现场" />
                    <el-option label="未到现场" value="未到现场" />
                    <el-option label="待确认" value="待确认" />
                  </el-select>
                  <el-button size="small" text type="danger" @click="removeGroupEntry(c, entry.id)">
                    <el-icon :size="14"><Delete /></el-icon>
                  </el-button>
                </div>
                <el-button size="small" text type="primary" class="gd-add-btn" @click="addGroupEntry(c)">
                  <el-icon :size="13"><Plus /></el-icon> 添加客户详情
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 7. 总结 & 8. 优化 -->
        <div class="section-header">
          <span class="section-num">7</span> 总结 & <span class="section-num">8</span> 优化
        </div>
        <div class="so-card">
          <div class="so-field">
            <label>
              <span class="so-num">7.</span> 总结
              <el-button size="small" link type="primary" @click="openTemplate('summary')"><el-icon :size="12"><DocumentCopy /></el-icon> 模版</el-button>
            </label>
            <el-input v-model="reportSummary" type="textarea" :rows="3" placeholder="继续去测试，调整高消耗无效广告，高预算跑东南亚，小预算跑非洲" />
          </div>
          <div class="so-field">
            <label>
              <span class="so-num">8.</span> 优化方向
              <el-button size="small" link type="primary" @click="openTemplate('optimize')"><el-icon :size="12"><DocumentCopy /></el-icon> 模版</el-button>
            </label>
            <el-input v-model="reportOptimize" placeholder="提高数量，调整客户精准度，减少无效客户" />
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

    <!-- ====== 模版弹窗 ====== -->
    <el-dialog v-model="templateVisible" :title="templateLabels[templateField]" width="620px">
      <el-tabs v-model="templateTab">
        <el-tab-pane label="预设模版" name="preset">
          <div v-if="!presetTemplates[templateField]?.length" style="color:#9ca3af;text-align:center;padding:20px;">暂无预设模版</div>
          <div v-for="(t, i) in presetTemplates[templateField]" :key="'p'+i" class="template-item" @click="pickTemplate(t)">
            <div class="template-content">{{ t }}</div>
            <el-button size="small" type="primary" link>使用</el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane label="我的模版" name="custom">
          <div v-if="!myTemplates[templateField]?.length" style="color:#9ca3af;text-align:center;padding:20px;">暂无自定义模版，在下方添加</div>
          <div v-for="(t, i) in myTemplates[templateField]" :key="'c'+i" class="template-item">
            <div class="template-content" style="flex:1;">{{ t }}</div>
            <el-button size="small" type="primary" link @click="pickTemplate(t)">使用</el-button>
            <el-button size="small" type="danger" link @click="delMyTemplate(i)">删除</el-button>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <el-input v-model="newTemplateText" placeholder="输入新模版内容..." size="small" style="flex:1;" />
            <el-button size="small" type="primary" @click="saveMyTemplate"><el-icon :size="13"><Check /></el-icon> 新增模版</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer><el-button @click="templateVisible = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWeekStore } from '../stores/week'
import { api, formatDateCN, todayStr } from '../api'

const weekStore = useWeekStore()

// 全量可选国家列表
const allCountries = [
  '印度尼西亚','越南','菲律宾','泰国','马来西亚','新加坡','缅甸','柬埔寨','老挝','文莱',
  '印度','巴基斯坦','孟加拉国','斯里兰卡','尼泊尔',
  '尼日利亚','埃塞俄比亚','南非','肯尼亚','加纳','埃及','坦桑尼亚','乌干达','摩洛哥','阿尔及利亚','安哥拉','科特迪瓦',
  '阿联酋','沙特阿拉伯','土耳其','卡塔尔','阿曼','科威特','巴林','伊拉克','约旦','黎巴嫩','以色列','伊朗','也门',
  '日本','韩国','蒙古',
  '巴西','墨西哥','哥伦比亚','阿根廷','智利','秘鲁','厄瓜多尔','委内瑞拉',
  '美国','英国','德国','法国','澳大利亚','俄罗斯','加拿大','意大利','西班牙','荷兰','波兰','乌克兰',
  '哈萨克斯坦','乌兹别克斯坦','吉尔吉斯斯坦'
]

const activeCountries = ref([])
const addableCountries = computed(() => allCountries.filter(c => !activeCountries.value.includes(c)))
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

const countryTreeData = [
  { key:'se-asia', label:'东南亚',
    children:[
      {key:'印度尼西亚',label:'印度尼西亚 +62'},{key:'越南',label:'越南 +84'},
      {key:'菲律宾',label:'菲律宾 +63'},{key:'泰国',label:'泰国 +66'},
      {key:'马来西亚',label:'马来西亚 +60'},{key:'新加坡',label:'新加坡 +65'},
      {key:'缅甸',label:'缅甸 +95'},{key:'柬埔寨',label:'柬埔寨 +855'},
      {key:'老挝',label:'老挝 +856'},{key:'文莱',label:'文莱 +673'}
    ]},
  { key:'s-asia', label:'南亚',
    children:[
      {key:'印度',label:'印度 +91'},{key:'巴基斯坦',label:'巴基斯坦 +92'},
      {key:'孟加拉国',label:'孟加拉国 +880'},{key:'斯里兰卡',label:'斯里兰卡 +94'},
      {key:'尼泊尔',label:'尼泊尔 +977'}
    ]},
  { key:'africa', label:'非洲',
    children:[
      {key:'尼日利亚',label:'尼日利亚 +234'},{key:'埃塞俄比亚',label:'埃塞俄比亚 +251'},
      {key:'南非',label:'南非 +27'},{key:'肯尼亚',label:'肯尼亚 +254'},
      {key:'加纳',label:'加纳 +233'},{key:'埃及',label:'埃及 +20'},
      {key:'坦桑尼亚',label:'坦桑尼亚 +255'},{key:'乌干达',label:'乌干达 +256'},
      {key:'摩洛哥',label:'摩洛哥 +212'},{key:'阿尔及利亚',label:'阿尔及利亚 +213'},
      {key:'安哥拉',label:'安哥拉 +244'},{key:'科特迪瓦',label:'科特迪瓦 +225'}
    ]},
  { key:'mid-east', label:'中东',
    children:[
      {key:'阿联酋',label:'阿联酋 +971'},{key:'沙特阿拉伯',label:'沙特阿拉伯 +966'},
      {key:'土耳其',label:'土耳其 +90'},{key:'卡塔尔',label:'卡塔尔 +974'},
      {key:'阿曼',label:'阿曼 +968'},{key:'科威特',label:'科威特 +965'},
      {key:'巴林',label:'巴林 +973'},{key:'伊拉克',label:'伊拉克 +964'},
      {key:'约旦',label:'约旦 +962'},{key:'黎巴嫩',label:'黎巴嫩 +961'},
      {key:'以色列',label:'以色列 +972'},{key:'伊朗',label:'伊朗 +98'},
      {key:'也门',label:'也门 +967'}
    ]},
  { key:'e-asia', label:'东亚',
    children:[
      {key:'日本',label:'日本 +81'},{key:'韩国',label:'韩国 +82'},
      {key:'蒙古',label:'蒙古 +976'}
    ]},
  { key:'latam', label:'拉美',
    children:[
      {key:'巴西',label:'巴西 +55'},{key:'墨西哥',label:'墨西哥 +52'},
      {key:'哥伦比亚',label:'哥伦比亚 +57'},{key:'阿根廷',label:'阿根廷 +54'},
      {key:'智利',label:'智利 +56'},{key:'秘鲁',label:'秘鲁 +51'},
      {key:'厄瓜多尔',label:'厄瓜多尔 +593'},{key:'委内瑞拉',label:'委内瑞拉 +58'}
    ]},
  { key:'emea', label:'欧美',
    children:[
      {key:'美国',label:'美国 +1'},{key:'英国',label:'英国 +44'},
      {key:'德国',label:'德国 +49'},{key:'法国',label:'法国 +33'},
      {key:'澳大利亚',label:'澳大利亚 +61'},{key:'俄罗斯',label:'俄罗斯 +7'},
      {key:'加拿大',label:'加拿大 +1'},{key:'意大利',label:'意大利 +39'},
      {key:'西班牙',label:'西班牙 +34'},{key:'荷兰',label:'荷兰 +31'},
      {key:'波兰',label:'波兰 +48'},{key:'乌克兰',label:'乌克兰 +380'}
    ]},
  { key:'central-asia', label:'中亚',
    children:[
      {key:'哈萨克斯坦',label:'哈萨克斯坦 +7'},{key:'乌兹别克斯坦',label:'乌兹别克斯坦 +998'},
      {key:'吉尔吉斯斯坦',label:'吉尔吉斯斯坦 +996'}
    ]}
]
const allLeafKeys = countryTreeData.flatMap(g => g.children.map(c => c.key))

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

// 国旗代码映射
const flagMap = {
  印度尼西亚:"id", 印尼:"id", 越南:"vn", 泰国:"th", 菲律宾:"ph", 马来西亚:"my", 新加坡:"sg", 缅甸:"mm", 柬埔寨:"kh", 老挝:"la", 文莱:"bn",
  印度:"in", 巴基斯坦:"pk", 孟加拉国:"bd", 斯里兰卡:"lk", 尼泊尔:"np",
  尼日利亚:"ng", 埃塞俄比亚:"et", 南非:"za", 肯尼亚:"ke", 加纳:"gh", 埃及:"eg", 坦桑尼亚:"tz", 乌干达:"ug", 摩洛哥:"ma", 阿尔及利亚:"dz", 安哥拉:"ao", 科特迪瓦:"ci",
  阿联酋:"ae", 沙特阿拉伯:"sa", 沙特:"sa", 土耳其:"tr", 卡塔尔:"qa", 阿曼:"om", 科威特:"kw", 巴林:"bh", 伊拉克:"iq", 约旦:"jo", 黎巴嫩:"lb", 以色列:"il", 伊朗:"ir", 也门:"ye",
  日本:"jp", 韩国:"kr", 蒙古:"mn",
  巴西:"br", 墨西哥:"mx", 哥伦比亚:"co", 阿根廷:"ar", 智利:"cl", 秘鲁:"pe", 厄瓜多尔:"ec", 委内瑞拉:"ve",
  美国:"us", 英国:"gb", 德国:"de", 法国:"fr", 澳大利亚:"au", 俄罗斯:"ru", 加拿大:"ca", 意大利:"it", 西班牙:"es", 荷兰:"nl", 波兰:"pl", 乌克兰:"ua",
  哈萨克斯坦:"kz", 乌兹别克斯坦:"uz", 吉尔吉斯斯坦:"kg"
}
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
  activeCountries.value = activeCountries.value.filter(x => x !== c)
  delete countryData[c]
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
const accounts = ref([
  { id: 'lisa-office', name: '莉莎办公家具' },
  { id: 'zhenshan-office', name: '甄珊办公家具' },
  { id: 'xiege-office', name: '谢哥办公家具' },
])
const selectedAccountId = ref('lisa-office')
const selectedAccount = computed(() => accounts.value.find(a => a.id === selectedAccountId.value) || accounts.value[0])

let entryIdSeq = 0
const defaultCountryFb = () => ({ budget:null, usdBudget:null, newCustomer:null, grouped:null, groupEntries:[], catNoReply:null, msgIgnore:null, lowBudget:null, competitor:null, harass:null, visitPending:null })

function addGroupEntry(c) {
  if (!countryData[c]) countryData[c] = defaultCountryFb()
  countryData[c].groupEntries.push({ id: ++entryIdSeq, text: '', status: '' })
}

function removeGroupEntry(c, id) {
  countryData[c].groupEntries = countryData[c].groupEntries.filter(e => e.id !== id)
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
const reportSummary = ref('')
const reportOptimize = ref('')

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
  reportSummary.value = ''
  reportOptimize.value = ''
  existingData.value = false
}

function onAccountChange() {
  saveMsg.value = ''
  resetFormData()
  if (reportDate.value) loadExistingData(reportDate.value)
}

const weekReady = ref(false)
watch(() => weekStore.currentWeek?.countries, (countries) => {
  if (countries?.length) {
    initCountryData(countries)
    weekReady.value = true
    if (reportDate.value) loadExistingData(reportDate.value)
  }
}, { immediate: true })

const n = v => v ?? 0
function countryAvg(c) { const d = countryData[c]; if (!d) return 0; const b = n(d.budget), cu = n(d.newCustomer); return (b && cu) ? b / cu : 0 }
function countryEffCost(c) { const d = countryData[c]; if (!d) return 0; const b = n(d.budget), g = n(d.grouped); return (b && g) ? b / g : 0 }

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
      if (e.text) allEntries.push(e.status ? `${e.text}，${e.status}` : e.text)
    }
  }
  return { budget, usdBudget, newCustomer, grouped, avgCost: (budget && newCustomer) ? budget / newCustomer : 0, effCost: (budget && grouped) ? budget / grouped : 0, allEntries, groupCountSummary: groupCountParts.join('  ') }
})

function fmtNum(v) { if (v == null) return '0.00'; const r = Math.round(v * 100) / 100; return r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

// ====== 模版 ======
const templateVisible = ref(false); const templateField = ref('summary'); const templateTab = ref('preset'); const newTemplateText = ref('')
const templateLabels = { summary:'总结模版', optimize:'优化方向模版' }
const presetTemplates = {
  summary: [
    '平均客户单价12元一个，今天测试新素材，需要时间测试。高预算跑东南亚，小预算跑非洲',
    '今天整体量跑不出去，更换素材去测试。很多素材跑不出去，调整高消耗无效广告组',
    '今天整体效果量比之前多了，但无效偏多，东南亚地区效果也不好。调整细分定位，优化广告素材和落地页',
  ],
  optimize: [
    '提高询盘数量，调整客户精准度，减少无效客户，优化广告素材和落地页',
    '调整客户精准度，减少无效客户。优化广告素材，更换低CTR素材',
    '提高数量，调整细分定位，减少无效客户。测试新国家新素材，小预算测出效果再放量',
  ],
}
const MY_TEMPLATE_KEY = 'pan_templates'
const myTemplates = ref(loadMyTemplates())
function loadMyTemplates() { try { const raw = localStorage.getItem(MY_TEMPLATE_KEY); return raw ? JSON.parse(raw) : { summary:[], optimize:[] } } catch(e) { return { summary:[], optimize:[] } } }
function openTemplate(field) { templateField.value = field; templateTab.value = 'preset'; newTemplateText.value = ''; templateVisible.value = true }
function pickTemplate(text) {
  if (templateField.value === 'summary') reportSummary.value = text
  else if (templateField.value === 'optimize') reportOptimize.value = text
  templateVisible.value = false; ElMessage.success('模版已填入')
}
function saveMyTemplate() {
  const text = newTemplateText.value.trim(); if (!text) { ElMessage.warning('请输入模版内容'); return }
  const field = templateField.value; if (!myTemplates.value[field]) myTemplates.value[field] = []
  myTemplates.value[field].unshift(text)
  try { localStorage.setItem(MY_TEMPLATE_KEY, JSON.stringify(myTemplates.value)) } catch (e) { ElMessage.error('保存失败'); return }
  newTemplateText.value = ''; ElMessage.success('模版已保存')
}
function delMyTemplate(index) { const field = templateField.value; if (!myTemplates.value[field]) return; myTemplates.value[field].splice(index, 1); try { localStorage.setItem(MY_TEMPLATE_KEY, JSON.stringify(myTemplates.value)) } catch (e) { ElMessage.error('删除失败'); return } }

// ====== 数据加载 ======
async function loadExistingData(d) {
  if (!d || !weekReady.value) return
  const seq = ++loadSeq
  resetFormData()
  try {
    const res = await api.daily.get(d, { accountId: selectedAccountId.value }); if (seq !== loadSeq) return
    existingData.value = !!(res.success && res.data)
    if (res.success && res.data && res.data.countries) {
      const savedCountries = Object.keys(res.data.countries)
      for (const c of savedCountries) {
        if (!activeCountries.value.includes(c)) {
          activeCountries.value = [...activeCountries.value, c]
        }
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
      reportSummary.value = res.data.summary || ''; reportOptimize.value = res.data.optimize || ''
    }
  } catch(e) { existingData.value = false }
}

const skipAutoLoad = ref(false); let loadSeq = 0
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
  const hasData = ot.budget > 0 || ot.newCustomer > 0 || ot.grouped > 0 || reportSummary.value || reportOptimize.value
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

  if (reportSummary.value || reportOptimize.value) {
    text += '\n'
    if (reportSummary.value) text += `\n7. 总结：${reportSummary.value}`
    if (reportOptimize.value) text += `\n8. 优化：${reportOptimize.value}`
  }
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

async function saveData() {
  const date = reportDate.value; if (!date) { ElMessage.warning('请选择日期'); return }
  const countries = {}
  for (const c of activeCountries.value) {
    const d = countryData[c]; if (!d) continue
    countries[c] = { budget: n(d.budget), usdBudget: n(d.usdBudget), newCustomer: n(d.newCustomer), grouped: n(d.grouped), groupEntries: (d.groupEntries || []).map(e => ({ text: e.text || '', status: e.status || '' })), catNoReply: n(d.catNoReply), msgIgnore: n(d.msgIgnore), lowBudget: n(d.lowBudget), competitor: n(d.competitor), harass: n(d.harass), visitPending: n(d.visitPending) }
  }
  saveMsg.value = '保存中...'; saveOk.value = true
  try {
    const res = await api.daily.save(date, { countries, summary: reportSummary.value, optimize: reportOptimize.value }, { accountId: selectedAccountId.value })
    if (res.success) { saveMsg.value = ' 已保存'; saveOk.value = true; existingData.value = true }
    else { saveMsg.value = '❌ ' + (res.error||'未知错误'); saveOk.value = false }
  } catch(e) { saveMsg.value = '❌ ' + e.message; saveOk.value = false }
}

async function clearForm() {
  try { await ElMessageBox.confirm('确定清空表单？未保存的数据将丢失。', '确认清空', { confirmButtonText: '确认清空', cancelButtonText: '取消', type: 'warning' }) } catch { return }
  for (const c of activeCountries.value) { if (c in countryData) { Object.keys(countryData[c]).forEach(k => { if (k === 'groupEntries') countryData[c][k] = []; else countryData[c][k] = (typeof countryData[c][k] === 'number' || countryData[c][k] === null) ? null : '' }) } }
  reportSummary.value = ''; reportOptimize.value = ''; saveMsg.value = ''
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
  const summM = text.match(/7[\\.、]?\\s*总结\\s*[:]([\\s\\S]*?)(?=\\n8[\\.、]|$)/i); if (summM) { reportSummary.value = summM[1].trim(); parseDetail.value.push('总结已识别') }
  const optM = text.match(/8[\\.、]?\\s*优化\\s*[:]([\\s\\S]*?)$/i); if (optM) { reportOptimize.value = optM[1].trim(); parseDetail.value.push('优化已识别') }
  pasteVisible.value = false
  parseDetail.value.length ? ElMessage.success('识别 '+parseDetail.value.length+' 个字段') : ElMessage.warning('未识别到数据')
}

onMounted(async () => {
  if (!weekStore.currentWeek) await weekStore.load()
  const t = sessionStorage.getItem('targetDate'); if (t) { reportDate.value = t; sessionStorage.removeItem('targetDate') }
  const e = sessionStorage.getItem('editDaily')
  if (e) {
    try {
      const { date, data: d } = JSON.parse(e); reportDate.value = date
      if (d.countries) { for (const [c, fb] of Object.entries(d.countries)) { if (c in countryData) Object.keys(countryData[c]).forEach(k => { if (k in fb) countryData[c][k] = fb[k] ?? null }) }; reportSummary.value = d.summary || ''; reportOptimize.value = d.optimize || '' }
    } catch {}
    sessionStorage.removeItem('editDaily')
  }
})
</script>

<style scoped>
.report-page { animation: fadeIn .3s ease; max-width: 1300px; margin: 0 auto; padding-bottom: 40px; }
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

/* ====== 顶部 ====== */
.top-bar {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 16px 24px 12px; margin-bottom: 10px;
  box-shadow: 0 1px 2px rgba(0,0,0,.03);
  display: flex; flex-direction: column; gap: 10px;
}
.top-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.top-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.top-left h2 { font-size: 20px; font-weight: 700; margin: 0; white-space: nowrap; }

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
  padding: 6px 14px; border: 1.5px dashed #c7d2fe;
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
.action-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 20px; margin-bottom: 16px; }
.save-msg { font-size: 12px; font-weight: 600; margin-left: 8px; }
.save-msg.ok { color: #059669; }
.save-msg.err { color: #ef4444; }

/* ====== 布局 ====== */
.main-layout { display: flex; gap: 20px; align-items: flex-start; }
.left-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.right-panel { width: 380px; flex-shrink: 0; }

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
.ov-item-usd { background: rgba(253,224,71,.2); }
.ov-item-usd .ov-val { color: #fef08a; }
.ov-val { font-size: 20px; font-weight: 800; }
.ov-val.highlight { color: #c7d2fe; }
.ov-label { font-size: 11px; opacity: .65; margin-top: 2px; }
/* 拉群全局 */
.gd-global { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 12px; }
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
.country-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; transition: border-color .2s; position: relative; }
.country-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--cc-color, #6366f1); border-radius: 12px 0 0 12px; }
.country-card:hover { border-color: var(--cc-color, #6366f1); }
.cc-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: var(--cc-color-light, #f8fafc); border-bottom: 1px solid #f3f4f6; }
.cc-header-left { display: flex; align-items: center; gap: 10px; }
.cc-header-right { display: flex; align-items: center; gap: 2px; }
.cc-num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: #6366f1; color: #fff; font-size: 12px; font-weight: 700; }
.cc-name { font-size: 15px; font-weight: 700; color: #1f2937; }
.cc-remove-btn { flex-shrink:0; font-size:12px; padding:2px 8px; opacity:.6; }
.cc-remove-btn:hover { opacity:1; }
.cc-body { padding: 16px 18px; }
.cc-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.cc-field { flex: 1; min-width: 100px; }
.cc-field label { display: block; font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 4px; }
.cc-input { width: 100%; }
.cc-input :deep(.el-input__wrapper) { background: #f9fafb; border-radius: 8px; box-shadow: none; padding: 2px 10px; }
.cc-input :deep(.el-input__inner) { font-size: 18px; font-weight: 700; color: #1f2937; height: 36px; }

/* 美金字段 */
.cc-field-usd { border-left: 1px dashed #e5e7eb; padding-left: 10px; }
.cc-input-usd :deep(.el-input__wrapper) { background: #fefce8; }
.cc-input-usd :deep(.el-input__inner) { color: #a16207; }
.usd-hint {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fef3c7; color: #a16207; font-size: 10px; font-weight: 700;
  cursor: help; margin-left: 2px;
}
.cc-unit { font-size: 11px; color: #9ca3af; margin-left: 4px; }
.cc-field.cc-computed { background: var(--cc-color-light, #f5f3ff); border-radius: 8px; padding: 6px 10px; }
.cc-computed-val { font-size: 18px; font-weight: 700; color: var(--cc-color, #6366f1); height: 36px; display: flex; align-items: center; }
.cc-gd label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }

/* 客户详情条目 */
.gd-entries { display:flex; flex-direction:column; gap:8px; }
.gd-entry-row {
  display:flex; align-items:center; gap:8px;
  background:#f9fafb; border:1px solid #e5e7eb;
  border-radius:8px; padding:8px 10px;
  transition: border-color .15s;
}
.gd-entry-row:hover { border-color:#c7d2fe; background:#fff; }
.gd-entry-text { flex:1; }
.gd-entry-text :deep(.el-input__wrapper) { background:#fff; }
.gd-entry-status { width:110px; flex-shrink:0; }
.gd-add-btn {
  align-self:flex-start; padding:6px 12px;
  border:1px dashed #d1d5db; border-radius:8px;
  font-weight:600; color:#6b7280; transition:all .15s;
}
.gd-add-btn:hover { border-color:#6366f1; color:#6366f1; background:#f5f3ff; }
.gd-entry-pill {
  display:inline-block; font-size:12px; color:#374151; margin:2px 4px 2px 0;
  padding:2px 8px; background:#f3f4f6; border-radius:5px;
  white-space:nowrap;
}
.gd-global-val { font-size: 13px; color: #6b7280; line-height: 1.8; }

/* ====== 总结优化 ====== */
.so-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; }
.so-field { margin-bottom: 16px; }
.so-field:last-child { margin-bottom: 0; }
.so-field label { display: block; font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
.so-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: #fef2f2; color: #ef4444; font-size: 12px; margin-right: 4px; }

/* ====== 预览（右侧固定） ====== */
.preview-sticky { position: sticky; top: 16px; background: #fff; border: 2px solid #6366f1; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(99,102,241,.1); }
.preview-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #f5f3ff; border-bottom: 1px solid #e0e7ff; font-weight: 700; font-size: 14px; }
.preview-content { white-space: pre-wrap; line-height: 1.9; font-size: 13px; padding: 16px 18px; color: #1f2937; max-height: calc(100vh - 180px); overflow-y: auto; }
.preview-empty { text-align: center; padding: 60px 20px; color: #9ca3af; background: #fff; border: 1px dashed #e5e7eb; border-radius: 14px; position: sticky; top: 16px; }
.preview-empty p { margin: 10px 0 0; font-size: 14px; line-height: 1.6; }

/* ====== 空状态 ====== */
.empty-state { text-align: center; padding: 80px 20px; color: #9ca3af; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
.empty-state p { font-size: 16px; font-weight: 600; margin: 12px 0 4px; color: #6b7280; }
.empty-state span { font-size: 13px; }

/* ====== 模版弹窗 ====== */
.template-item { display:flex; align-items:center; gap:10px; padding:10px 12px; margin-bottom:6px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer; transition:all 0.2s; }
.template-item:hover { border-color:#6366f1; background:#eef2ff; }
.template-content { flex:1; font-size:12px; color:#374151; line-height:1.6; }

@media (max-width: 960px) { .main-layout { flex-direction: column; } .right-panel { width: 100%; } .preview-sticky { position: static; } }
</style>
