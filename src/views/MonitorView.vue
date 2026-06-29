<template>
  <div class="monitor-page">
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h2><el-icon :size="24" style="vertical-align:middle;"><Monitor /></el-icon> VPS管理中心</h2>
          <p class="sub">到期追踪 · 续费管理 · 状态监控</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <el-tag v-if="counts.overdue" type="danger" size="large" effect="dark" round> {{ counts.overdue }} 已过期</el-tag>
          <span @click="toggleCostLock" style="cursor:pointer;font-size:11px;color:#d1d5db;padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;user-select:none;"
                title="">
            <el-icon :size="14"><Lock v-if="!costUnlocked" /><Unlock v-else /></el-icon>
          </span>
        </div>
      </div>
    </div>

    <!-- 总览统计条 — 始终显示所有卡片 -->
    <div class="vps-overview-bar">
      <div class="vps-ov-item" :class="{ danger: counts.overdue, 'ov-dim': !counts.overdue }">
        <div class="vps-ov-icon">❗</div><div class="vps-ov-info"><div class="vps-ov-num">{{ counts.overdue }}</div><div class="vps-ov-label">已过期</div></div>
      </div>
      <div class="vps-ov-item" :class="{ urgent: counts.urgent, 'ov-dim': !counts.urgent }">
        <div class="vps-ov-icon"><el-icon :size="22"><Warning /></el-icon></div><div class="vps-ov-info"><div class="vps-ov-num">{{ counts.urgent }}</div><div class="vps-ov-label">7天内到期</div></div>
      </div>
      <div class="vps-ov-item" :class="{ 'ov-dim': !counts.ok }">
        <div class="vps-ov-icon"><el-icon :size="22"><CircleCheck /></el-icon></div><div class="vps-ov-info"><div class="vps-ov-num">{{ counts.ok }}</div><div class="vps-ov-label">运行正常</div></div>
      </div>
      <div class="vps-ov-item" v-if="costUnlocked">
        <div class="vps-ov-icon"><el-icon :size="22"><Money /></el-icon></div><div class="vps-ov-info"><div class="vps-ov-num" style="color:#10b981;">¥{{ profit.total.toFixed(2) }}</div><div class="vps-ov-label">月利润</div></div>
      </div>
      <div class="vps-ov-item" v-if="costUnlocked">
        <div class="vps-ov-icon"><el-icon :size="22"><Box /></el-icon></div><div class="vps-ov-info"><div class="vps-ov-num" style="color:#6366f1;">¥{{ profit.totalCost.toFixed(2) }}</div><div class="vps-ov-label">月成本</div></div>
      </div>
      <div class="vps-ov-item" v-if="costUnlocked">
        <div class="vps-ov-icon"><el-icon :size="22"><Money /></el-icon></div><div class="vps-ov-info"><div class="vps-ov-num" style="color:#f59e0b;">¥{{ profit.totalSell.toFixed(2) }}</div><div class="vps-ov-label">总售价</div></div>
      </div>
    </div>

    <!-- 操作 & 筛选栏 -->
    <div class="vps-toolbar">
      <el-button
        :type="formOpen ? '' : 'primary'"
        @click="formOpen = !formOpen"
        class="vps-btn-add">
        <el-icon :size="16"><Plus /></el-icon>
        <span>{{ formOpen ? '收起表单' : '添加VPS' }}</span>
      </el-button>

      <span class="vps-count-badge">
        <span class="vps-count-num">{{ list.length }}</span>
        <span class="vps-count-label">台</span>
      </span>

      <div class="vps-search-box">
        <el-icon :size="16" class="vps-search-icon"><Search /></el-icon>
        <input
          v-model="searchText"
          class="vps-search-input"
          placeholder="搜索名称、服务商、国家、备注..."
        />
        <span v-if="searchText" class="vps-search-clear" @click="searchText = ''">
          <el-icon :size="14"><Close /></el-icon>
        </span>
      </div>

      <div class="vps-filter-pills">
        <button
          v-for="f in statusFilters"
          :key="f.key"
          class="vps-filter-pill"
          :class="{ active: filterType === f.key }"
          @click="filterType = (filterType === f.key ? 'all' : f.key)"
        >
          {{ f.label }}
          <span v-if="countByType(f.key)" class="vps-pill-count" :class="{ 'count-active': filterType === f.key }">{{ countByType(f.key) }}</span>
        </button>
      </div>

      <div class="vps-filter-dropdowns">
        <el-select v-model="filterProvider" size="default" placeholder="全部服务商" clearable class="vps-select">
          <el-option v-for="p in providerOptions" :key="p" :label="p" :value="p" />
        </el-select>
        <el-select v-model="filterCountry" size="default" placeholder="全部国家" clearable filterable class="vps-select">
          <el-option v-for="c in allCountryOpts" :key="c.code" :label="c.code" :value="c.code" />
        </el-select>
        <el-select v-model="sortOrder" size="default" class="vps-select vps-select-sort">
          <el-option label="⏱ 最快到期" value="asc" />
          <el-option label="⏱ 最晚到期" value="desc" />
        </el-select>
      </div>

      <span v-if="hasActiveFilters" class="vps-filter-reset" @click="clearFilters">
        <el-icon :size="13"><RefreshLeft /></el-icon> 清除筛选
      </span>
    </div>

    <transition name="slide">
      <div v-if="formOpen" class="vps-form-card">
        <div class="vps-form-grid">
          <div class="form-group"><label>VPS名称 *</label><el-input v-model="form.name" placeholder="印尼VPN节点" size="large" /></div>
          <div class="form-group"><label>国家/地区</label>
            <el-select v-model="form.country" size="large" @change="onCountryChange" style="width:100%;" placeholder="选择国家/地区" filterable>
              <el-option-group v-for="g in countryGroups" :key="g.label" :label="g.label">
                <el-option v-for="c in g.options" :key="c.code" :label="c.code + ' ' + c.en" :value="c.code">
                  <span class="country-option">
                    <span :class="'fi fi-'+c.iso2"></span>
                    <span class="country-zh">{{ c.code }}</span>
                    <span class="country-en">{{ c.en }}</span>
                    <span class="country-code">{{ c.iso2.toUpperCase() }}</span>
                  </span>
                </el-option>
              </el-option-group>
            </el-select>
          </div>
          <div class="form-group"><label>图标</label>
            <div class="icon-picker">
              <div class="icon-preview" :class="{ empty: !form.icon && !form.country }">
                <span v-if="form.icon" class="icon-preview-custom">{{ form.icon }}</span>
                <span v-else-if="form.country" :class="'fi fi-'+countryIso2(form.country)" class="icon-preview-flag"></span>
                <el-icon v-else :size="22"><Monitor /></el-icon>
              </div>
              <el-input v-model="form.icon" placeholder="可选：自定义emoji图标" size="large" style="flex:1;" />
            </div>
          </div>
          <div class="form-group"><label>类型</label>
            <el-select v-model="form.type" size="large" style="width:100%;">
              <el-option v-for="t in vpsTypes" :key="t" :label="t" :value="t" />
            </el-select>
          </div>
          <div class="form-group"><label>服务商</label>
            <el-select v-model="form.provider" size="large" style="width:100%;" filterable allow-create placeholder="选择或输入服务商">
              <el-option v-for="p in providerOptions" :key="p" :label="p" :value="p" />
            </el-select>
          </div>
          <div class="form-group"><label>管理网址</label><el-input v-model="form.url" placeholder="https://my.vultr.com/..." size="large" /></div>
          <div class="form-group"><label>到期日期 *</label><el-date-picker v-model="form.expire" type="date" value-format="YYYY-MM-DD" size="large" style="width:100%;" /></div>
          <div class="form-group" v-if="costUnlocked"><label>成本价 (元/月)</label><el-input-number v-model="form.costPrice" :min="0" size="large" style="width:100%;" /></div>
          <div class="form-group"><label>售价 (元/月)</label><el-input-number v-model="form.sellPrice" :min="0" size="large" style="width:100%;" /></div>
          <div class="form-group"><label>运行状态</label>
            <el-select v-model="form.status" size="large" style="width:100%;">
              <el-option v-for="s in vpsStatuses" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
          </div>
          <div class="form-group"><label>备注</label><el-input v-model="form.note" placeholder="IP地址、配置等" size="large" /></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <el-button type="primary" size="large" @click="addVps"><el-icon :size="14"><Check /></el-icon> 保存VPS</el-button>
        </div>
      </div>
    </transition>

    <!-- VPS列表 -->
    <div v-if="!filteredList.length" class="vps-empty">
      <div class="vps-empty-icon"><el-icon :size="56"><Monitor /></el-icon></div>
      <p v-if="!list.length">暂无VPS，点击上方按钮添加</p>
      <p v-else>无匹配结果</p>
    </div>

    <div v-else class="vps-grid">
      <div
        v-for="v in filteredList"
        :key="v.id"
        class="vps-card"
        :class="['vps-' + v.severity, { 'vps-editing': editingId === v.id }]"
      >
        <!-- 编辑模式 -->
        <template v-if="editingId === v.id">
          <div class="vps-edit-header">
            <span> 编辑 {{ v.name }}</span>
            <el-button size="small" text @click="cancelEdit">取消</el-button>
          </div>
          <div class="vps-form-grid vps-form-grid--inline">
            <div class="form-group"><label>VPS名称</label><el-input v-model="editForm.name" size="default" /></div>
            <div class="form-group"><label>国家/地区</label>
              <el-select v-model="editForm.country" size="default" filterable style="width:100%;" placeholder="选择国家">
                <el-option-group v-for="g in countryGroups" :key="g.label" :label="g.label">
                  <el-option v-for="c in g.options" :key="c.code" :label="c.code + ' ' + c.en" :value="c.code">
                    <span :class="'fi fi-'+c.iso2"></span> {{ c.code }} {{ c.en }}
                  </el-option>
                </el-option-group>
              </el-select>
            </div>
            <div class="form-group"><label>图标</label><el-input v-model="editForm.icon" size="default" /></div>
            <div class="form-group"><label>类型</label>
              <el-select v-model="editForm.type" size="default" style="width:100%;">
                <el-option v-for="t in vpsTypes" :key="t" :label="t" :value="t" />
              </el-select>
            </div>
            <div class="form-group"><label>服务商</label>
              <el-select v-model="editForm.provider" size="default" style="width:100%;" filterable allow-create>
                <el-option v-for="p in providerOptions" :key="p" :label="p" :value="p" />
              </el-select>
            </div>
            <div class="form-group"><label>管理网址</label><el-input v-model="editForm.url" size="default" /></div>
            <div class="form-group"><label>到期日期</label><el-date-picker v-model="editForm.expire" type="date" value-format="YYYY-MM-DD" size="default" style="width:100%;" /></div>
            <div class="form-group" v-if="costUnlocked"><label>成本价 (元/月)</label><el-input-number v-model="editForm.costPrice" :min="0" size="default" style="width:100%;" /></div>
            <div class="form-group"><label>售价 (元/月)</label><el-input-number v-model="editForm.sellPrice" :min="0" size="default" style="width:100%;" /></div>
            <div class="form-group"><label>运行状态</label>
              <el-select v-model="editForm.status" size="default" style="width:100%;">
                <el-option v-for="s in vpsStatuses" :key="s.value" :label="s.label" :value="s.value" />
              </el-select>
            </div>
            <div class="form-group"><label>备注</label><el-input v-model="editForm.note" size="default" /></div>
          </div>
          <div class="vps-card-actions">
            <el-button type="primary" size="small" round @click="doUpdateVps(v.id)"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
            <el-button size="small" round @click="cancelEdit">取消</el-button>
          </div>
        </template>

        <!-- 展示模式 -->
        <template v-else>
          <!-- 背景光晕 -->
          <div v-if="v.severity === 'urgent' || v.severity === 'overdue'" class="vps-glow"></div>

          <div class="vps-card-top">
            <div class="vps-card-icon-wrap" :class="'icon-'+v.severity">
              <span v-if="v.icon" class="vps-custom-icon">{{ v.icon }}</span>
              <span v-else-if="v.countryIso" :class="'fi fi-'+v.countryIso" class="vps-flag-icon"></span>
              <el-icon v-else :size="28"><Monitor /></el-icon>
            </div>
            <div class="vps-card-title">
              <div class="vps-name">
                {{ v.name }}
                <span v-if="v.country" class="vps-country-tag">
                  <span :class="'fi fi-'+v.countryIso"></span>
                  {{ v.country }}
                </span>
              </div>
              <div class="vps-meta">
                <span v-if="v.type" class="vps-type-tag">{{ v.type }}</span>
                <span v-if="v.status" class="vps-status-tag" :class="'vps-status--' + v.status">
                  {{ statusLabel(v.status) }}
                </span>
                <span v-if="v.provider">@{{ v.provider }}</span>
                <span v-if="v.sellPrice">· 售价 ¥{{ v.sellPrice }}/月</span>
              </div>
            </div>
            <div class="vps-card-badge" :class="v.severity">
              <template v-if="v.severity === 'overdue'">已过期 {{ v.daysAbs }} 天</template>
              <template v-else>剩余 {{ v.daysLeft }} 天</template>
            </div>
          </div>

          <!-- 进度条 -->
          <div class="vps-timeline">
            <div class="vps-timeline-bar">
              <div class="vps-timeline-fill" :class="v.barColor" :style="{ width: v.barPct + '%' }"></div>
            </div>
            <div class="vps-timeline-labels">
              <span>{{ v.daysLeft >= 0 ? '已用 '+v.daysUsed+' 天 / 30 天' : '已过期 '+v.daysAbs+' 天' }}</span>
              <span>到期日 {{ v.expireShort }}</span>
            </div>
          </div>

          <!-- 成本/利润 (仅密码解锁后显示) -->
          <div v-if="costUnlocked" class="vps-cost-row">
            <span class="vps-cost-item cost">成本 ¥{{ (v.costPrice || v.price || 0).toFixed(2) }}</span>
            <span class="vps-cost-item sell">售价 ¥{{ (v.sellPrice || v.price || 0).toFixed(2) }}</span>
            <span class="vps-cost-item profit" :class="{ negative: ((v.sellPrice||v.price||0) - (v.costPrice||v.price||0)) < 0 }">利润 ¥{{ ((v.sellPrice||v.price||0) - (v.costPrice||v.price||0)).toFixed(2) }}</span>
          </div>

          <!-- 详细信息 -->
          <div class="vps-card-details">
            <div class="vps-detail" v-if="v.url">
              <span class="vps-detail-label"><el-icon :size="14"><Link /></el-icon></span>
              <a :href="v.url" target="_blank" rel="noopener" class="vps-link">{{ v.url }}</a>
            </div>
            <div class="vps-detail" v-if="v.note">
              <span class="vps-detail-label"><el-icon :size="14"><Edit /></el-icon></span>
              <span>{{ v.note }}</span>
            </div>
          </div>

          <!-- 警告文字 -->
          <div v-if="v.warnText" class="vps-alert" :class="v.severity">
            <span class="vps-alert-icon"><el-icon :size="16"><WarningFilled /></el-icon></span>
            <span>{{ v.warnText }}</span>
          </div>

          <!-- 操作 -->
          <div class="vps-card-actions">
            <el-button size="small" round @click="renew(v, 30)">+30天</el-button>
            <el-button size="small" round @click="renew(v, 90)">+90天</el-button>
            <el-button size="small" round @click="renew(v, 365)">+1年</el-button>
            <div style="flex:1;"></div>
            <el-button size="small" round type="primary" plain @click="editVps(v)"><el-icon :size="14"><Edit /></el-icon> 编辑</el-button>
            <el-button size="small" round type="danger" plain @click="remove(v)"><el-icon :size="14"><Delete /></el-icon> 删除</el-button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, formatDateCN, todayStr, daysBetween } from '../api'

const list = ref([])
const formOpen = ref(false)
const editingId = ref(0)
// 成本锁
const costUnlocked = ref(false)
async function toggleCostLock() {
  if (costUnlocked.value) { costUnlocked.value = false; return }
  try {
    const { value: pin } = await ElMessageBox.prompt('输入密码', '', { inputType:'password', confirmButtonText:'确认', cancelButtonText:'取消' })
    if (pin === 'Pan18218040143') costUnlocked.value = true
  } catch { /* 取消 */ }
}
const filterType = ref('all')
const filterProvider = ref('')
const filterCountry = ref('')
const sortOrder = ref('asc')
const searchText = ref('')
const form = reactive({ name:'', type:'VPN', country:'', icon:'', provider:'', url:'', expire:'', costPrice:0, sellPrice:0, price:0, status:'running', note:'' })
const editForm = reactive({ name:'', type:'VPN', country:'', icon:'', provider:'', url:'', expire:'', costPrice:0, sellPrice:0, price:0, status:'running', note:'' })

// 利润统计
const profit = computed(() => {
  let totalCost = 0, totalSell = 0
  list.value.forEach(v => {
    totalCost += v.costPrice || v.price || 0
    totalSell += v.sellPrice || v.price || 0
  })
  return { total: totalSell - totalCost, totalCost, totalSell }
})

function editVps(v) {
  editingId.value = v.id
  editForm.name = v.name || ''
  editForm.type = v.type || 'VPN'
  editForm.country = v.country || ''
  editForm.icon = v.icon || ''
  editForm.provider = v.provider || ''
  editForm.url = v.url || ''
  editForm.expire = (v.expire || '').substring(0, 10)
  editForm.costPrice = v.costPrice || 0
  editForm.sellPrice = v.sellPrice || 0
  editForm.price = v.price || 0
  editForm.status = v.status || 'running'
  editForm.note = v.note || ''
}

async function doUpdateVps(id) {
  if (!editForm.name) { ElMessage.warning('请输入VPS名称'); return }
  const res = await api.vps.update(id, {
    name: editForm.name, type: editForm.type, country: editForm.country,
    icon: editForm.icon, provider: editForm.provider, url: editForm.url,
    expire: editForm.expire, costPrice: editForm.costPrice, sellPrice: editForm.sellPrice, price: editForm.price, status: editForm.status, note: editForm.note
  })
  if (res.success) { ElMessage.success('VPS已更新'); editingId.value = 0; load() }
  else { ElMessage.error('更新失败') }
}

function cancelEdit() { editingId.value = 0 }

// 国家分组 (flag-icons使用ISO2代码, 中英双语)
const countryGroups = [
  { label:'东南亚 Southeast Asia', options:[
    {code:'越南',iso2:'vn',en:'Vietnam'},{code:'印度尼西亚',iso2:'id',en:'Indonesia'},
    {code:'泰国',iso2:'th',en:'Thailand'},{code:'菲律宾',iso2:'ph',en:'Philippines'},
    {code:'马来西亚',iso2:'my',en:'Malaysia'},{code:'新加坡',iso2:'sg',en:'Singapore'},
    {code:'缅甸',iso2:'mm',en:'Myanmar'},{code:'柬埔寨',iso2:'kh',en:'Cambodia'},
  ]},
  { label:'非洲 Africa', options:[
    {code:'尼日利亚',iso2:'ng',en:'Nigeria'},{code:'埃塞俄比亚',iso2:'et',en:'Ethiopia'},
    {code:'南非',iso2:'za',en:'South Africa'},{code:'肯尼亚',iso2:'ke',en:'Kenya'},
    {code:'埃及',iso2:'eg',en:'Egypt'},{code:'加纳',iso2:'gh',en:'Ghana'},
  ]},
  { label:'中东 Middle East', options:[
    {code:'阿联酋',iso2:'ae',en:'UAE'},{code:'迪拜',iso2:'ae',en:'Dubai'},
    {code:'沙特阿拉伯',iso2:'sa',en:'Saudi Arabia'},{code:'土耳其',iso2:'tr',en:'Turkey'},
    {code:'阿曼',iso2:'om',en:'Oman'},{code:'卡塔尔',iso2:'qa',en:'Qatar'},
  ]},
  { label:'南亚 South Asia', options:[
    {code:'印度',iso2:'in',en:'India'},{code:'巴基斯坦',iso2:'pk',en:'Pakistan'},
    {code:'孟加拉国',iso2:'bd',en:'Bangladesh'},
  ]},
  { label:'东亚 East Asia', options:[
    {code:'韩国',iso2:'kr',en:'South Korea'},{code:'日本',iso2:'jp',en:'Japan'},
    {code:'中国',iso2:'cn',en:'China'},
  ]},
  { label:'拉美 Latin America', options:[
    {code:'巴西',iso2:'br',en:'Brazil'},{code:'墨西哥',iso2:'mx',en:'Mexico'},
    {code:'阿根廷',iso2:'ar',en:'Argentina'},{code:'哥伦比亚',iso2:'co',en:'Colombia'},
  ]},
  { label:'欧美 Europe & Americas', options:[
    {code:'美国',iso2:'us',en:'USA'},{code:'英国',iso2:'gb',en:'UK'},
    {code:'德国',iso2:'de',en:'Germany'},{code:'法国',iso2:'fr',en:'France'},
    {code:'澳大利亚',iso2:'au',en:'Australia'},{code:'俄罗斯',iso2:'ru',en:'Russia'},
  ]}
]

// country name → iso2 map
const countryIsoMap = {}
countryGroups.forEach(g => g.options.forEach(c => { countryIsoMap[c.code] = c.iso2 }))
function countryIso2(name) { return countryIsoMap[name] || '' }

function onCountryChange(code) {
  form.icon = ''
}

// buildVpsCard — 按月周期进度条
function buildVpsCard(v) {
  const today = todayStr()
  const daysLeft = daysBetween(today, v.expire)
  const expireDate = new Date(v.expire)
  // 月付周期：到期日往前推30天
  const cycleDays = 30
  const startDate = new Date(expireDate)
  startDate.setDate(startDate.getDate() - cycleDays)
  const startStr = startDate.toISOString().split('T')[0]
  const totalSpan = daysBetween(startStr, v.expire)
  const elapsed = daysBetween(startStr, today)
  const barPct = totalSpan > 0 ? Math.min(100, Math.max(0, Math.round(elapsed / totalSpan * 100))) : 50
  // 本月已用天数
  const daysUsed = Math.max(0, cycleDays - Math.max(0, daysLeft))

  let severity='ok', barColor='green', warnText=''
  if (daysLeft < 0) {
    severity='overdue'; barColor='expired'
    warnText = '该VPS已过期 ' + Math.abs(daysLeft) + ' 天，请立即续费或释放资源'
  } else if (daysLeft <= 7) {
    severity='urgent'; barColor='red'
    warnText = '仅剩 ' + daysLeft + ' 天即将到期，请尽快续费！'
  } else if (daysLeft <= 14) {
    severity='warning'; barColor='orange'
    warnText = daysLeft + ' 天后到期，建议提前续费'
  } else {
    severity='ok'; barColor='green'
  }

  const expireStr = (v.expire || '').substring(0, 10)
  return {
    ...v, id: v.id, name: v.name,
    countryIso: countryIsoMap[v.country] || '',
    daysLeft, daysAbs: Math.abs(daysLeft),
    daysUsed, cycleDays,
    barPct, severity, barColor, warnText,
    expireShort: expireStr ? expireStr.substring(5) : '--',
    expireCN: expireStr ? formatDateCN(expireStr) : '未知'
  }
}

// VPS 类型预设
const vpsTypes = ['VPN', 'Web服务器', '数据库', 'CDN/加速', '备份存储', '测试节点', '其他']

// 服务商选项
const providerOptions = [
  'Panry',
  '跨境独享网络IP（服务商）',
  'Tk专线-甜甜',
  '她爱笑牙还黄',
  'camille'
]

// VPS 运行状态
const vpsStatuses = [
  { value:'running', label:'运行中' },
  { value:'stopping', label:'即将停用' },
  { value:'stopped', label:'已停用' },
  { value:'observing', label:'观察中' },
  { value:'other', label:'其他' }
]
function statusLabel(v) {
  const s = vpsStatuses.find(s => s.value === v)
  return s ? s.label : ''
}

// 所有国家扁平选项
const allCountryOpts = computed(() => {
  const arr = []
  countryGroups.forEach(g => g.options.forEach(c => arr.push(c)))
  return arr
})

// 状态筛选按钮
const statusFilters = [
  { key: 'overdue', label: '已过期' },
  { key: 'urgent', label: '7天内' },
  { key: 'warning', label: '14天内' },
]

function countByType(key) {
  return list.value.filter(v => {
    if (key === 'overdue') return v.severity === 'overdue'
    if (key === 'urgent') return v.severity === 'urgent'
    if (key === 'warning') return v.severity === 'warning'
    return false
  }).length
}

// 筛选+排序
const filteredList = computed(() => {
  let arr = [...list.value]
  // 状态筛选
  if (filterType.value === 'overdue') arr = arr.filter(v => v.severity === 'overdue')
  else if (filterType.value === 'urgent') arr = arr.filter(v => v.severity === 'urgent')
  else if (filterType.value === 'warning') arr = arr.filter(v => v.severity === 'warning')
  // 模糊搜索 — 含名称/服务商/国家/备注/网址
  const kw = searchText.value.trim().toLowerCase()
  if (kw) arr = arr.filter(v =>
    (v.name||'').toLowerCase().includes(kw) ||
    (v.provider||'').toLowerCase().includes(kw) ||
    (v.country||'').toLowerCase().includes(kw) ||
    (v.note||'').toLowerCase().includes(kw) ||
    (v.url||'').toLowerCase().includes(kw)
  )
  // 服务商筛选
  if (filterProvider.value) arr = arr.filter(v => v.provider === filterProvider.value)
  // 国家筛选
  if (filterCountry.value) arr = arr.filter(v => v.country === filterCountry.value)
  // 排序
  arr.sort((a, b) => {
    if (sortOrder.value === 'asc') return a.daysLeft - b.daysLeft
    return b.daysLeft - a.daysLeft
  })
  return arr
})

// 统计
const counts = computed(() => {
  const c = { overdue:0, urgent:0, warning:0, ok:0 }
  list.value.forEach(v => {
    if (v.severity === 'overdue') c.overdue++
    else if (v.severity === 'urgent') c.urgent++
    else if (v.severity === 'warning') c.warning++
    else c.ok++
  })
  return c
})

// 是否有活跃筛选
const hasActiveFilters = computed(() =>
  filterType.value !== 'all' || filterProvider.value || filterCountry.value
)
function clearFilters() {
  filterType.value = 'all'
  filterProvider.value = ''
  filterCountry.value = ''
  searchText.value = ''
}

async function load() {
  const res = await api.vps.list()
  if (res.success) {
    list.value = res.data.sort((a,b) => new Date(a.expire) - new Date(b.expire)).map(x => buildVpsCard(x))
  }
}

function resetForm() {
  formOpen.value = false
  Object.keys(form).forEach(k => form[k] = '')
  form.type = 'VPN'; form.costPrice = 0; form.sellPrice = 0; form.price = 0; form.icon = ''; form.country = ''; form.status = 'running'
}

async function addVps() {
  if (!form.name) { ElMessage.warning('请输入VPS名称'); return }
  if (!form.expire) { ElMessage.warning('请选择到期日期'); return }
  const expireStr = typeof form.expire === 'string' ? form.expire : String(form.expire)
  const res = await api.vps.add({ name: form.name, type: form.type, country: form.country, icon: form.icon, provider: form.provider, url: form.url, expire: expireStr, costPrice: form.costPrice, sellPrice: form.sellPrice, price: form.price, status: form.status, note: form.note })
  if (res.success) {
    ElMessage.success('VPS已保存')
    resetForm()
    load()
  } else { ElMessage.error('保存失败: ' + (res.error || '未知错误')) }
}

async function renew(v, days) {
  const currentExpire = new Date(v.expire)
  const base = currentExpire < new Date() ? new Date() : currentExpire
  base.setDate(base.getDate() + days)
  const res = await api.vps.update(v.id, { expire: base.toISOString().split('T')[0] })
  if (res.success) { ElMessage.success('续费 ' + days + ' 天'); load() }
  else { ElMessage.error(res.error || '续费失败') }
}

async function remove(v) {
  try { await ElMessageBox.confirm('确定删除 ' + v.name + '？', '确认删除', { type: 'warning' }) } catch { return }
  const res = await api.vps.delete(v.id)
  if (res.success) { ElMessage.success('已删除'); load() }
  else { ElMessage.error(res.error || '删除失败') }
}

onMounted(load)
</script>

<style scoped>
.monitor-page { animation: fadeIn .3s ease; }
.page-header { margin-bottom:24px; }
.page-header h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }

/* 总览条 */
.vps-overview-bar {
  display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap;
}
.vps-ov-item {
  display:flex; align-items:center; gap:10px;
  padding:16px 20px; border-radius:14px;
  background:#fff; border:1.5px solid #e5e7eb;
  flex:1; min-width:140px;
  transition:all 0.2s;
}
.vps-ov-item:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.06); }
.vps-ov-item.danger { border-color:#fecaca; background:linear-gradient(135deg,#fff5f5,#fff); }
.vps-ov-item.urgent { border-color:#fde68a; background:linear-gradient(135deg,#fffdf5,#fff); }
.vps-ov-item.ov-dim { opacity:.45; }
.vps-ov-icon { font-size:24px; }
.vps-ov-num { font-size:28px; font-weight:800; color:#1f2937; line-height:1.1; }
.vps-ov-label { font-size:11px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:.3px; }

/* ===== 工具栏 ===== */
.vps-toolbar {
  display:flex; align-items:center; gap:12px;
  margin-bottom:24px; flex-wrap:wrap;
  padding:14px 18px;
  background:#fff; border-radius:14px;
  border:1px solid #e5e7eb;
  box-shadow:0 1px 3px rgba(0,0,0,.03);
}

/* 添加按钮 */
.vps-btn-add {
  display:inline-flex !important; align-items:center; gap:6px;
  font-weight:700 !important; border-radius:10px !important;
  padding:9px 18px !important; font-size:14px !important;
  transition:all 0.2s !important;
}
.vps-btn-add:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.25); }

/* 台数徽标 */
.vps-count-badge {
  display:inline-flex; align-items:baseline; gap:2px;
  padding:6px 12px; border-radius:8px;
  background:#f3f4f6; border:1px solid #e5e7eb;
}
.vps-count-num { font-size:16px; font-weight:800; color:#6366f1; }
.vps-count-label { font-size:11px; color:#9ca3af; font-weight:600; }

/* 搜索框 */
.vps-search-box {
  position:relative; display:flex; align-items:center;
  flex:1; min-width:200px; max-width:320px;
}
.vps-search-icon {
  position:absolute; left:12px; color:#9ca3af; pointer-events:none;
}
.vps-search-input {
  width:100%; height:38px; padding:0 34px 0 36px;
  border:1.5px solid #e5e7eb; border-radius:10px;
  background:#f9fafb; font-size:13px; color:#374151;
  outline:none; transition:all 0.2s;
}
.vps-search-input:focus { border-color:#6366f1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.08); }
.vps-search-input::placeholder { color:#9ca3af; }
.vps-search-clear {
  position:absolute; right:10px; cursor:pointer;
  color:#9ca3af; padding:2px; border-radius:4px;
}
.vps-search-clear:hover { color:#6b7280; background:#e5e7eb; }

/* 状态筛选 pills */
.vps-filter-pills {
  display:flex; gap:6px;
}
.vps-filter-pill {
  display:inline-flex; align-items:center; gap:5px;
  padding:7px 14px; border-radius:20px;
  border:1.5px solid #e5e7eb; background:#fff;
  font-size:12px; font-weight:600; color:#6b7280;
  cursor:pointer; transition:all 0.2s;
  white-space:nowrap;
}
.vps-filter-pill:hover { border-color:#c7d2fe; color:#6366f1; background:#eef2ff; }
.vps-filter-pill.active { border-color:#6366f1; background:#6366f1; color:#fff; }
.vps-pill-count {
  display:inline-flex; align-items:center; justify-content:center;
  min-width:18px; height:18px; padding:0 5px;
  border-radius:9px; background:#e5e7eb; color:#6b7280;
  font-size:10px; font-weight:700;
}
.vps-pill-count.count-active { background:rgba(255,255,255,.25); color:#fff; }

/* 下拉筛选 */
.vps-filter-dropdowns {
  display:flex; gap:8px; margin-left:auto;
}
.vps-select { width:140px; }
.vps-select-sort { width:130px; }
.vps-select :deep(.el-input__wrapper) { border-radius:10px !important; }

/* 清除筛选 */
.vps-filter-reset {
  display:inline-flex; align-items:center; gap:4px;
  padding:7px 12px; border-radius:8px;
  font-size:12px; font-weight:600; color:#6366f1;
  cursor:pointer; transition:all 0.2s;
  white-space:nowrap;
}
.vps-filter-reset:hover { background:#eef2ff; }

/* 表单卡片 */
.vps-form-card {
  background:#fff; border-radius:16px; padding:24px;
  border:1px solid #e5e7eb; box-shadow:0 4px 16px rgba(0,0,0,.04);
  margin-bottom:24px;
}
.vps-form-grid {
  display:grid; grid-template-columns:repeat(3,1fr); gap:16px;
}
.vps-form-grid--inline {
  grid-template-columns:repeat(3,1fr); gap:12px; padding:16px 0;
}
.vps-form-grid .form-group { display:flex; flex-direction:column; gap:4px; }
.vps-form-grid label { font-size:12px; font-weight:600; color:#6b7280; }
@media (max-width:768px) { .vps-form-grid, .vps-form-grid--inline { grid-template-columns:1fr 1fr; } }

/* 编辑模式 */
.vps-editing { border-color:#6366f1 !important; box-shadow:0 0 0 3px rgba(99,102,241,.1),0 8px 32px rgba(99,102,241,.08) !important; }
.vps-edit-header {
  display:flex; justify-content:space-between; align-items:center;
  padding:0 0 12px; margin-bottom:4px;
  font-size:14px; font-weight:700; color:#6366f1;
  border-bottom:1px solid #e0e7ff;
}

.slide-enter-active, .slide-leave-active { transition:all 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity:0; transform:translateY(-12px); }

.vps-empty { text-align:center; padding:60px 20px; }
.vps-empty-icon { margin-bottom:12px; color:#9ca3af; }
.vps-empty p { font-size:14px; color:#9ca3af; }

/* === VPS 卡片网格 === */
.vps-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(420px, 1fr));
  gap:20px;
}
@media (max-width:480px) {
  .vps-grid { grid-template-columns: 1fr; }
}

.vps-card {
  position:relative;
  background:#fff; border-radius:18px; border:1.5px solid #e5e7eb;
  padding:24px;
  box-shadow:0 1px 3px rgba(0,0,0,.04);
  transition:all 0.3s;
  overflow:hidden;
}
.vps-card:hover { box-shadow:0 12px 40px rgba(0,0,0,.08); transform:translateY(-2px); }

/* 光晕 */
.vps-glow {
  position:absolute; inset:0; pointer-events:none;
}
.vps-urgent .vps-glow {
  background:radial-gradient(ellipse at 80% 20%, rgba(239,68,68,.08) 0%, transparent 60%);
  animation:glowPulse 2s ease-in-out infinite;
}
.vps-overdue .vps-glow {
  background:radial-gradient(ellipse at 80% 20%, rgba(220,38,38,.12) 0%, transparent 60%);
  animation:glowPulse 1s ease-in-out infinite;
}
@keyframes glowPulse {
  0%,100% { opacity:.6; }
  50% { opacity:1; }
}

/* 卡片顶部 */
.vps-card-top {
  display:flex; align-items:center; gap:14px;
  margin-bottom:20px;
}
.vps-card-icon { font-size:32px; line-height:1; }

/* 图标容器 */
.vps-card-icon-wrap {
  width:56px; height:56px; border-radius:16px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
  background:#f3f4f6;
  transition:all 0.3s;
}
.vps-card-icon-wrap.icon-overdue { background:#fef2f2; }
.vps-card-icon-wrap.icon-urgent { background:#fff7ed; }
.vps-card-icon-wrap.icon-warning { background:#fffbeb; }

.vps-flag-icon {
  font-size:28px; line-height:1; border-radius:4px;
  box-shadow:0 2px 6px rgba(0,0,0,.1);
}
.fi {
  width:36px !important; height:24px !important;
  border-radius:3px;
}
.vps-custom-icon { font-size:28px; line-height:1; }

/* 图标选择器 */
.icon-picker { display:flex; align-items:center; gap:8px; }
.icon-preview {
  width:44px; height:44px; border-radius:10px;
  background:#f3f4f6; border:2px dashed #d1d5db;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.icon-preview.empty { border-style:dashed; }
.icon-preview-custom { font-size:24px; line-height:1; }
.icon-preview-flag { font-size:20px; line-height:1; }
.icon-preview .fi { width:28px !important; height:18px !important; border-radius:2px; }
.vps-card-title { flex:1; min-width:0; }
.vps-name { font-size:18px; font-weight:800; color:#111827; }
.vps-meta { font-size:12px; color:#9ca3af; margin-top:2px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.vps-type-tag {
  display:inline-block; padding:2px 8px; border-radius:4px;
  background:#eef2ff; color:#6366f1;
  font-size:11px; font-weight:700;
}
.vps-country-tag {
  display:inline-flex; align-items:center; gap:4px;
  padding:2px 10px; border-radius:4px;
  background:#fef3c7; color:#92400e;
  font-size:12px; font-weight:600; margin-left:6px;
}
.vps-status-tag {
  display:inline-block; padding:2px 8px; border-radius:4px;
  font-size:11px; font-weight:700;
}
.vps-status--running { background:#ecfdf5; color:#047857; }
.vps-status--stopping { background:#fff7ed; color:#c2410c; }
.vps-status--stopped { background:#fef2f2; color:#b91c1c; }
.vps-status--observing { background:#fffbeb; color:#b45309; }
.vps-status--other { background:#f3f4f6; color:#6b7280; }
.vps-country-tag .fi { width:16px !important; height:12px !important; border-radius:2px; }

/* 国家选择器 */
.country-option {
  display:flex; align-items:center; gap:8px;
  width:100%;
}
.country-option .fi {
  width:24px !important; height:16px !important;
  border-radius:2px; flex-shrink:0;
  box-shadow:0 1px 2px rgba(0,0,0,.1);
}
.country-zh { font-size:14px; color:#1f2937; font-weight:600; }
.country-en { font-size:10px; color:#9ca3af; font-weight:400; }
.country-code { font-size:10px; color:#9ca3af; font-weight:500; text-transform:uppercase; letter-spacing:.5px; }

/* 分组标题 */
:deep(.el-select-group__title) {
  font-size:13px !important;
  font-weight:800 !important;
  color:#6366f1 !important;
  padding:10px 12px 6px !important;
  background:linear-gradient(135deg,#eef2ff,#f8fafc);
}

.vps-card-badge {
  padding:6px 16px; border-radius:20px;
  font-size:13px; font-weight:800;
  white-space:nowrap; flex-shrink:0;
}
.vps-card-badge.overdue { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
.vps-card-badge.urgent { background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }
.vps-card-badge.warning { background:#fffbeb; color:#b45309; border:1px solid #fde68a; }
.vps-card-badge.ok { background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; }

/* 时间线进度条 */
.vps-timeline { margin-bottom:18px; }
.vps-timeline-bar {
  height:16px; background:#f3f4f6; border-radius:8px;
  overflow:hidden; position:relative;
  box-shadow:inset 0 2px 4px rgba(0,0,0,.04);
}
.vps-timeline-fill {
  height:100%; border-radius:8px;
  transition:width 1s cubic-bezier(.4,0,.2,1);
  position:relative;
}
.vps-timeline-fill.green { background:linear-gradient(90deg,#10b981,#34d399,#6ee7b7); }
.vps-timeline-fill.yellow { background:linear-gradient(90deg,#f59e0b,#fbbf24,#fcd34d); }
.vps-timeline-fill.orange { background:linear-gradient(90deg,#f97316,#fb923c,#fdba74); }
.vps-timeline-fill.red { background:linear-gradient(90deg,#ef4444,#f87171,#fca5a5); animation:progressPulse 1.5s ease-in-out infinite; }
.vps-timeline-fill.expired { background:#9ca3af; }

@keyframes progressPulse {
  0%,100% { opacity:1; }
  50% { opacity:.75; }
}

.vps-timeline-labels {
  display:flex; justify-content:space-between;
  margin-top:6px;
  font-size:11px; color:#9ca3af; font-weight:500;
}

/* 成本/利润行 */
.vps-cost-row {
  display:flex; gap:16px; flex-wrap:wrap;
  padding:12px 16px; margin-bottom:12px;
  background:linear-gradient(135deg,#f0fdf4,#faf5ff);
  border-radius:10px; border:1px solid #e5e7eb;
}
.vps-cost-item {
  font-size:13px; font-weight:700; white-space:nowrap;
}
.vps-cost-item.cost { color:#6366f1; }
.vps-cost-item.sell { color:#f59e0b; }
.vps-cost-item.profit { color:#10b981; }
.vps-cost-item.profit.negative { color:#ef4444; }

/* 详细信息 */
.vps-card-details { margin-bottom:14px; display:flex; flex-direction:column; gap:6px; }
.vps-detail { display:flex; align-items:center; gap:6px; font-size:13px; color:#6b7280; }
.vps-detail-label { flex-shrink:0; }
.vps-link { color:#6366f1; text-decoration:none; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.vps-link:hover { text-decoration:underline; }

/* 警告 */
.vps-alert {
  display:flex; align-items:center; gap:8px;
  padding:12px 16px; border-radius:10px;
  margin-bottom:16px; font-size:13px; font-weight:600;
}
.vps-alert.overdue { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
.vps-alert.urgent { background:#fef2f2; color:#c2410c; border:1px solid #fed7aa; }
.vps-alert.warning { background:#fffbeb; color:#b45309; border:1px solid #fde68a; }
.vps-alert-icon { font-size:16px; flex-shrink:0; }

/* 操作 */
.vps-card-actions {
  display:flex; gap:8px; flex-wrap:wrap;
  padding-top:16px; border-top:1px solid #f3f4f6;
}
</style>
