<template>
 <div class="clock-root">
 <!-- 顶部状态栏 -->
 <div class="top-bar">
 <div class="top-left">
 <span class="top-dot"></span>
 <span class="top-title">全球运营指挥中心</span>
 <span class="top-sub">GLOBAL COMMAND CENTER</span>
 </div>
 <div class="top-center">
 <div class="top-badge" v-for="r in regions" :key="r.name">
 <span class="badge-dot" :style="{background: r.color}"></span>
 {{ r.name }} {{ r.cities.length }}
 </div>
 </div>
 <div class="top-right">
 <span class="fi fi-cn" style="width:20px;height:14px;border-radius:2px;"></span>
 <span class="top-bjt">{{ beijingTime }}</span>
 <span class="top-bjt-label">BJT</span>
 </div>
 </div>

 <!-- 主区域 -->
 <div class="main-body">
 <!-- 水平时钟卡片横排 -->
 <div class="time-row">
 <div
 v-for="(c, i) in flatCities"
 :key="c.code"
 :class="['time-card', { highlight: activeIdx === i }]"
 @click="setActive(i)"
 >
 <div class="tc-accent" :style="{background: c.color}"></div>
 <div class="tc-body">
 <div class="tc-top">
 <span :class="['fi', c.flag]" class="tc-flag"></span>
 <span class="tc-name">{{ c.name }}</span>
 <span class="tc-gmt">{{ c.gmt }}</span>
 </div>
 <div class="tc-time">{{ c.display.time }}</div>
 <div class="tc-meta">{{ c.display.date }} · {{ c.display.diff }}</div>
 </div>
 </div>
 </div>

 <!-- 下方地图 -->
 <div class="map-panel">
 <div ref="mapEl" class="map-container"></div>
 </div>
 </div>
 </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'

// ===================== 数据 =====================
// 177国中英文映射
const CN_NAMES = {
 'Afghanistan':'阿富汗','Albania':'阿尔巴尼亚','Algeria':'阿尔及利亚','Angola':'安哥拉',
 'Antarctica':'南极洲','Argentina':'阿根廷','Armenia':'亚美尼亚','Australia':'澳大利亚',
 'Austria':'奥地利','Azerbaijan':'阿塞拜疆','Bangladesh':'孟加拉国','Belarus':'白俄罗斯',
 'Belgium':'比利时','Belize':'伯利兹','Benin':'贝宁','Bhutan':'不丹','Bolivia':'玻利维亚',
 'Bosnia and Herzegovina':'波黑','Botswana':'博茨瓦纳','Brazil':'巴西','Brunei':'文莱',
 'Bulgaria':'保加利亚','Burkina Faso':'布基纳法索','Burundi':'布隆迪','Cambodia':'柬埔寨',
 'Cameroon':'喀麦隆','Canada':'加拿大','Central African Republic':'中非','Chad':'乍得',
 'Chile':'智利','China':'中国','Colombia':'哥伦比亚','Costa Rica':'哥斯达黎加',
 'Croatia':'克罗地亚','Cuba':'古巴','Cyprus':'塞浦路斯','Czech Republic':'捷克',
 'Democratic Republic of the Congo':'刚果民主共和国','Denmark':'丹麦','Djibouti':'吉布提',
 'Dominican Republic':'多米尼加','East Timor':'东帝汶','Ecuador':'厄瓜多尔','Egypt':'埃及',
 'El Salvador':'萨尔瓦多','Equatorial Guinea':'赤道几内亚','Eritrea':'厄立特里亚',
 'Estonia':'爱沙尼亚','Ethiopia':'埃塞俄比亚','Falkland Islands':'福克兰群岛','Fiji':'斐济',
 'Finland':'芬兰','France':'法国','French Southern and Antarctic Lands':'法属南半球领地',
 'Gabon':'加蓬','Gambia':'冈比亚','Georgia':'格鲁吉亚','Germany':'德国','Ghana':'加纳',
 'Greece':'希腊','Greenland':'格陵兰','Guatemala':'危地马拉','Guinea':'几内亚',
 'Guinea Bissau':'几内亚比绍','Guyana':'圭亚那','Haiti':'海地','Honduras':'洪都拉斯',
 'Hungary':'匈牙利','Iceland':'冰岛','India':'印度','Indonesia':'印度尼西亚','Iran':'伊朗',
 'Iraq':'伊拉克','Ireland':'爱尔兰','Israel':'以色列','Italy':'意大利',
 'Ivory Coast':'科特迪瓦','Jamaica':'牙买加','Japan':'日本','Jordan':'约旦',
 'Kazakhstan':'哈萨克斯坦','Kenya':'肯尼亚','Kosovo':'科索沃','Kuwait':'科威特',
 'Kyrgyzstan':'吉尔吉斯斯坦','Laos':'老挝','Latvia':'拉脱维亚','Lebanon':'黎巴嫩',
 'Lesotho':'莱索托','Liberia':'利比里亚','Libya':'利比亚','Lithuania':'立陶宛',
 'Luxembourg':'卢森堡','Macedonia':'北马其顿','Madagascar':'马达加斯加','Malawi':'马拉维',
 'Malaysia':'马来西亚','Mali':'马里','Mauritania':'毛里塔尼亚','Mexico':'墨西哥',
 'Moldova':'摩尔多瓦','Mongolia':'蒙古','Montenegro':'黑山','Morocco':'摩洛哥',
 'Mozambique':'莫桑比克','Myanmar':'缅甸','Namibia':'纳米比亚','Nepal':'尼泊尔',
 'Netherlands':'荷兰','New Caledonia':'新喀里多尼亚','New Zealand':'新西兰',
 'Nicaragua':'尼加拉瓜','Niger':'尼日尔','Nigeria':'尼日利亚','North Korea':'朝鲜',
 'Northern Cyprus':'北塞浦路斯','Norway':'挪威','Oman':'阿曼','Pakistan':'巴基斯坦',
 'Panama':'巴拿马','Papua New Guinea':'巴布亚新几内亚','Paraguay':'巴拉圭','Peru':'秘鲁',
 'Philippines':'菲律宾','Poland':'波兰','Portugal':'葡萄牙','Puerto Rico':'波多黎各',
 'Qatar':'卡塔尔','Republic of Serbia':'塞尔维亚','Republic of the Congo':'刚果共和国',
 'Romania':'罗马尼亚','Russia':'俄罗斯','Rwanda':'卢旺达','Saudi Arabia':'沙特阿拉伯',
 'Senegal':'塞内加尔','Sierra Leone':'塞拉利昂','Slovakia':'斯洛伐克','Slovenia':'斯洛文尼亚',
 'Solomon Islands':'所罗门群岛','Somalia':'索马里','Somaliland':'索马里兰',
 'South Africa':'南非','South Korea':'韩国','South Sudan':'南苏丹','Spain':'西班牙',
 'Sri Lanka':'斯里兰卡','Sudan':'苏丹','Suriname':'苏里南','Swaziland':'斯威士兰',
 'Sweden':'瑞典','Switzerland':'瑞士','Syria':'叙利亚','Taiwan':'台湾',
 'Tajikistan':'塔吉克斯坦','Thailand':'泰国','The Bahamas':'巴哈马','Togo':'多哥',
 'Trinidad and Tobago':'特立尼达和多巴哥','Tunisia':'突尼斯','Turkey':'土耳其',
 'Turkmenistan':'土库曼斯坦','Uganda':'乌干达','Ukraine':'乌克兰',
 'United Arab Emirates':'阿联酋','United Kingdom':'英国',
 'United Republic of Tanzania':'坦桑尼亚','United States of America':'美国',
 'Uruguay':'乌拉圭','Uzbekistan':'乌兹别克斯坦','Vanuatu':'瓦努阿图','Venezuela':'委内瑞拉',
 'Vietnam':'越南','West Bank':'约旦河西岸','Western Sahara':'西撒哈拉','Yemen':'也门',
 'Zambia':'赞比亚','Zimbabwe':'津巴布韦',
}

const CITIES = [
 { name: '中国', code: 'cn', flag: 'fi-cn', tz: 'Asia/Shanghai', gmt: 'GMT+8', pos: [116.4, 39.9], geoName: 'China', region: 'east' },
 { name: '马来西亚', code: 'my', flag: 'fi-my', tz: 'Asia/Kuala_Lumpur', gmt: 'GMT+8', pos: [101.7, 3.1], geoName: 'Malaysia', region: 'se-asia' },
 { name: '印度尼西亚', code: 'id', flag: 'fi-id', tz: 'Asia/Jakarta', gmt: 'GMT+7', pos: [106.8, -6.2], geoName: 'Indonesia', region: 'se-asia' },
 { name: '埃塞俄比亚', code: 'et', flag: 'fi-et', tz: 'Africa/Addis_Ababa', gmt: 'GMT+3', pos: [38.7, 9.0], geoName: 'Ethiopia', region: 'africa' },
 { name: '尼日利亚', code: 'ng', flag: 'fi-ng', tz: 'Africa/Lagos', gmt: 'GMT+1', pos: [3.4, 6.5], geoName: 'Nigeria', region: 'africa' },
 { name: '南非', code: 'za', flag: 'fi-za', tz: 'Africa/Johannesburg', gmt: 'GMT+2', pos: [28.0, -26.2], geoName: 'South Africa', region: 'africa' },
 { name: '沙特', code: 'sa', flag: 'fi-sa', tz: 'Asia/Riyadh', gmt: 'GMT+3', pos: [46.7, 24.7], geoName: 'Saudi Arabia', region: 'mid-east' },
 { name: '迪拜', code: 'ae', flag: 'fi-ae', tz: 'Asia/Dubai', gmt: 'GMT+4', pos: [55.3, 25.2], geoName: 'United Arab Emirates', region: 'mid-east' },
]

const regionColors = { 'east': '#f43f5e', 'se-asia': '#06b6d4', 'africa': '#f59e0b', 'mid-east': '#10b981' }
const regionNames = { 'east': '东亚', 'se-asia': '东南亚', 'africa': '非洲', 'mid-east': '中东' }

const regions = reactive([
 { name: '东亚', color: '#f43f5e', cities: [] },
 { name: '东南亚', color: '#06b6d4', cities: [] },
 { name: '非洲', color: '#f59e0b', cities: [] },
 { name: '中东', color: '#10b981', cities: [] },
])

const regionMap = { 'east': 0, 'se-asia': 1, 'africa': 2, 'mid-east': 3 }

const beijingTime = ref('')
const activeIdx = ref(0)

const flatCities = reactive([])

// 初始化
CITIES.forEach(c => {
 const ri = regionMap[c.region]
 const enriched = {
 ...c,
 color: regionColors[c.region],
 regionName: regionNames[c.region],
 display: { time: '', date: '', diff: '' },
 }
 regions[ri].cities.push(enriched)
 flatCities.push(enriched)
})

// ===================== 时钟逻辑 =====================
const timeFmt = new Intl.DateTimeFormat('zh-CN', {
 hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
})
const dateFmt = new Intl.DateTimeFormat('zh-CN', {
 month: 'long', day: 'numeric', weekday: 'short',
})

function getNowParts(tz) {
 const now = new Date()
 const tzStr = now.toLocaleString('en-US', { timeZone: tz })
 const date = new Date(tzStr)
 const tp = timeFmt.formatToParts(date)
 const h = tp.find(p => p.type === 'hour').value
 const m = tp.find(p => p.type === 'minute').value
 const s = tp.find(p => p.type === 'second').value
 return {
 time: `${h}:${m}:${s}`,
 date: dateFmt.format(date),
 hours: parseInt(h,10) + parseInt(m,10)/60 + parseInt(s,10)/3600,
 }
}

function computeDiff(bjH, cityH) {
 const d = bjH - cityH
 if (Math.abs(d) < 0.01) return '同时区'
 if (d > 0) return `晚${Math.round(d)}h`
 return `早${Math.round(-d)}h`
}

let timer = null
let scatterTimer = null
let mapObserver = null

function tick() {
 const bj = getNowParts('Asia/Shanghai')
 beijingTime.value = bj.time
 flatCities.forEach(c => {
 const p = getNowParts(c.tz)
 c.display.time = p.time
 c.display.date = p.date
 c.display.diff = computeDiff(bj.hours, p.hours)
 })
}

// ===================== ECharts 地图 =====================
const mapEl = ref(null)
let chart = null

const MAP_GEO_URL = '/world.json'

function setActive(i) {
 activeIdx.value = i
 if (chart) {
 chart.dispatchAction({ type: 'downplay', seriesIndex: 1 })
 chart.dispatchAction({ type: 'highlight', seriesIndex: 1, dataIndex: i })
 chart.dispatchAction({ type: 'showTip', seriesIndex: 1, dataIndex: i })
 }
}

function highlightMap(i) {
 setActive(i)
}

async function initMap() {
 await nextTick()
 if (!mapEl.value) return

 // 加载世界地图 GeoJSON
 const resp = await fetch(MAP_GEO_URL)
 const geoJson = await resp.json()
 echarts.registerMap('world', geoJson)

 chart = echarts.init(mapEl.value)

 const scatterData = flatCities.map((c, i) => ({
 name: c.name,
 value: [...c.pos, c.display.time || '00:00:00', c.gmt, c.flag, i],
 }))

 // 9国地图板块高亮配置
 const highlightRegions = CITIES.map(c => ({
 name: c.geoName,
 itemStyle: {
 areaColor: regionColors[c.region],
 opacity: 0.18,
 },
 label: {
 show: true,
 formatter: () => c.name,
 color: '#6b7280',
 fontSize: 10,
 distance: 0,
 },
 }))

 const option = {
 backgroundColor: 'transparent',
 tooltip: {
 trigger: 'item',
 backgroundColor: '#fff',
 borderColor: '#e5e7eb',
 textStyle: { color: '#374151', fontSize: 13 },
 formatter: (p) => {
 if (p.seriesType === 'scatter' || p.seriesType === 'effectScatter') {
 const d = flatCities[p.dataIndex]
 return `<b>${d.name}</b><br/>${d.display.time} ${d.gmt}<br/>${d.display.date}`
 }
 const cn = CN_NAMES[p.name] || p.name
 const c = CITIES.find(c => c.geoName === p.name)
 if (c) {
 const d = flatCities.find(f => f.code === c.code)
 return `<b>${cn}</b><br/>${d?.display.time || ''} ${c.gmt}<br/>${d?.display.date || ''}`
 }
 return cn
 },
 },
 geo: {
 map: 'world',
 roam: true,
 zoom: 1.2,
 center: [55, 10],
 scaleLimit: { min: 0.8, max: 6 },
 aspectScale: 0.85,
 regions: highlightRegions,
 itemStyle: {
 areaColor: '#e5e7eb',
 borderColor: '#d1d5db',
 borderWidth: 0.5,
 },
 emphasis: {
 label: {
 show: true,
 formatter: (p) => CN_NAMES[p.name] || p.name,
 color: '#1f2937',
 fontSize: 14,
 fontWeight: 'bold',
 },
 itemStyle: {
 areaColor: '#818cf8',
 opacity: 0.5,
 shadowBlur: 10,
 shadowColor: '#c7d2fe',
 },
 },
 },
 series: [
 // 光晕脉冲
 {
 type: 'effectScatter',
 coordinateSystem: 'geo',
 data: scatterData,
 symbolSize: 8,
 showEffectOn: 'render',
 rippleEffect: {
 brushType: 'stroke',
 scale: 4,
 period: 4,
 color: '#6366f1',
 },
 itemStyle: {
 color: (p) => flatCities[p.dataIndex]?.color || '#6366f1',
 },
 label: {
 show: false,
 position: 'right',
 formatter: '{b}',
 color: '#6b7280',
 fontSize: 11,
 distance: 6,
 },
 zlevel: 1,
 },
 // 标记点
 {
 type: 'scatter',
 coordinateSystem: 'geo',
 data: scatterData,
 symbolSize: 10,
 itemStyle: {
 color: (p) => flatCities[p.dataIndex]?.color || '#6366f1',
 shadowBlur: 6,
 shadowColor: '#c7d2fe',
 },
 label: { show: false },
 emphasis: {
 scale: 1.6,
 itemStyle: { shadowBlur: 16, shadowColor: '#6366f1' },
 },
 zlevel: 2,
 },
 ],
 }

 chart.setOption(option)

 // 点击国家板块 / 散点联动右侧卡片
 chart.on('click', (p) => {
 if (p.seriesType === 'scatter' || p.seriesType === 'effectScatter') {
 setActive(p.dataIndex)
 } else if (p.componentType === 'geo') {
 const idx = flatCities.findIndex(f => f.geoName === p.name)
 if (idx >= 0) setActive(idx)
 }
 })

 // 初始选中
 chart.dispatchAction({ type: 'highlight', seriesIndex: 1, dataIndex: 0 })

 // resize
 mapObserver = new ResizeObserver(() => chart?.resize())
 mapObserver.observe(mapEl.value)
}

// ===================== 生命周期 =====================
onMounted(async () => {
 tick()
 timer = setInterval(tick, 1000)
 await initMap()

 // 每秒更新地图散点 tooltip 数据
 scatterTimer = setInterval(() => {
 if (!chart) return
 const scatterData = flatCities.map((c, i) => ({
 name: c.name,
 value: [...c.pos, c.display.time || '00:00:00', c.gmt, c.flag, i],
 }))
 chart.setOption({
 series: [
 { data: scatterData },
 { data: scatterData },
 ],
 })
 }, 1000)
})

onUnmounted(() => {
 clearInterval(timer)
 clearInterval(scatterTimer)
 mapObserver?.disconnect()
 mapObserver = null
 chart?.dispose()
 chart = null
})
</script>

<style scoped>
.clock-root {
 margin: -24px;
 min-height: calc(100vh - 48px);
 background: #f3f4f6;
 color: #374151;
 display: flex; flex-direction: column;
 font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* ====== 顶部状态栏 ====== */
.top-bar {
 display: flex; align-items: center;
 height: 48px; flex-shrink: 0;
 padding: 0 24px;
 border-bottom: 1px solid #e5e7eb;
 background: #fff;
}
.top-left { display: flex; align-items: center; gap: 10px; }
.top-dot {
 width: 8px; height: 8px; border-radius: 50%;
 background: #10b981;
 box-shadow: 0 0 6px #10b981;
 animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
 0%,100% { opacity: 1; }
 50% { opacity: .3; }
}
.top-title { font-size: 14px; font-weight: 700; color: #1f2937; letter-spacing: 2px; }
.top-sub { font-size: 11px; color: #6b7280; letter-spacing: 3px; }

.top-center { flex: 1; display: flex; justify-content: center; gap: 20px; }
.badge-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; }
.top-badge { font-size: 11px; color: #6b7280; }

.top-right { display: flex; align-items: center; gap: 8px; }
.top-bjt { font-size: 22px; font-weight: 800; color: #1f2937; font-variant-numeric: tabular-nums; }
.top-bjt-label { font-size: 10px; color: #6b7280; }

/* ====== 主体 ====== */
.main-body {
 flex: 1; display: flex; flex-direction: column; overflow: hidden;
}

/* 横排时钟卡片 */
.time-row {
 display: flex; gap: 10px;
 padding: 14px 18px; flex-shrink: 0;
 overflow-x: auto;
 border-bottom: 1px solid #e5e7eb;
 background: #fff;
}
.time-row::-webkit-scrollbar { height: 4px; }
.time-row::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

.time-card {
 display: flex; flex-shrink: 0;
 min-width: 195px;
 background: #f9fafb;
 border: 1px solid #e5e7eb;
 border-radius: 12px;
 overflow: hidden;
 cursor: pointer;
 transition: all .2s;
}
.time-card:hover { background: #f3f4f6; border-color: #c7d2fe; }
.time-card.highlight {
 background: #eef2ff;
 border-color: #818cf8;
 box-shadow: 0 0 0 2px rgba(99,102,241,.12);
}

.tc-accent { width: 3px; flex-shrink: 0; }

.tc-body { padding: 12px 16px; min-width: 0; }

.tc-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.tc-flag { width: 20px; height: 14px; border-radius: 2px; flex-shrink: 0; }
.tc-name { font-size: 12px; font-weight: 700; color: #374151; flex: 1; white-space: nowrap; }
.tc-gmt {
 font-size: 10px; color: #6b7280;
 background: #e5e7eb; padding: 2px 5px; border-radius: 3px;
}

.tc-time {
 font-size: 28px; font-weight: 800;
 font-variant-numeric: tabular-nums;
 color: #1f2937;
 letter-spacing: 1px;
 line-height: 1.15;
}

.tc-meta {
 font-size: 11px; color: #6b7280; margin-top: 4px;
 white-space: nowrap;
}

/* 下方地图 */
.map-panel {
 flex: 1;
 min-height: 200px;
 position: relative;
 overflow: hidden;
}
.map-container {
 position: absolute; inset: 0;
}
</style>
