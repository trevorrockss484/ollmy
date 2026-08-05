<template>
 <!-- 登录页全屏独立 -->
 <div v-if="route.path === '/login'" style="height:100vh;">
 <router-view />
 </div>

 <el-container v-else class="app-layout">
 <!-- 侧边栏 -->
 <el-aside :width="isCollapse ? '64px' : '220px'" class="app-sidebar">
 <div class="sidebar-logo" @click="isCollapse = !isCollapse">
 <span class="logo-icon">🐼</span>
 <span v-show="!isCollapse" class="logo-text">Pan助手</span>
 </div>

 <el-menu
 :default-active="activeMenu"
 :collapse="isCollapse"
 :collapse-transition="false"
 background-color="#1e1f2a"
 text-color="#a0a3b1"
 active-text-color="#ffffff"
 router
 class="sidebar-menu"
 >
 <el-menu-item index="/">
 <el-icon><Odometer /></el-icon>
 <template #title>仪表盘</template>
 </el-menu-item>
 <el-menu-item index="/plan">
 <el-icon><Calendar /></el-icon>
 <template #title>周计划</template>
 </el-menu-item>
 <el-menu-item index="/report">
 <el-icon><Edit /></el-icon>
 <template #title>日报生成</template>
 </el-menu-item>
 <el-menu-item index="/history">
 <el-icon><Clock /></el-icon>
 <template #title>数据查询</template>
 </el-menu-item>
 <el-menu-item index="/monitor">
 <el-icon><Monitor /></el-icon>
 <template #title>监控中心</template>
 </el-menu-item>
 <el-menu-item index="/clock">
 <el-icon><Clock /></el-icon>
 <template #title>世界时钟</template>
 </el-menu-item>
 <el-menu-item index="/assets">
 <el-icon><PictureFilled /></el-icon>
 <template #title>AI资产管理</template>
 </el-menu-item>
 <el-menu-item index="/media">
 <el-icon><PictureFilled /></el-icon>
 <template #title>图片素材库</template>
 </el-menu-item>
 <el-menu-item index="/video-library">
 <el-icon><VideoCameraFilled /></el-icon>
 <template #title>视频素材库</template>
 </el-menu-item>
 <el-menu-item index="/scripts">
 <el-icon><ChatDotRound /></el-icon>
 <template #title>话术库</template>
 </el-menu-item>
 <el-menu-item index="/customer-stats">
 <el-icon><DataAnalysis /></el-icon>
 <template #title>客户统计</template>
 </el-menu-item>
 <el-menu-item index="/compress">
 <el-icon><Scissor /></el-icon>
 <template #title>图片压缩</template>
 </el-menu-item>
 <el-menu-item index="/video-compress">
 <el-icon><VideoCameraFilled /></el-icon>
 <template #title>视频压缩</template>
 </el-menu-item>
 </el-menu>

 <!-- 侧边栏底部 -->
 <div class="sidebar-footer-status" v-show="!isCollapse">
 <span style="font-size:11px;color:#6b7280;"><el-icon :size="14"><User /></el-icon> {{ authStore.username }}</span>
 </div>
 </el-aside>

 <!-- 主内容 -->
 <el-container>
 <el-header class="app-topbar">
 <el-button text @click="isCollapse = !isCollapse">
 <el-icon :size="20"><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
 </el-button>
 <el-button text @click="goBack" class="topbar-back" :disabled="!hasHistory">
 <el-icon :size="18"><ArrowLeft /></el-icon>
 </el-button>
 <span class="topbar-info" v-if="route.path === '/plan'">{{ weekTitle }}</span>
 <span class="topbar-info" v-else>{{ pageTitle }}</span>
 <div style="flex:1;" />
 <span style="font-size:11px;color:#9ca3af;margin-right:12px;">{{ authStore.username }}</span>
 <el-button size="small" text @click="authStore.logout()" style="color:#9ca3af;">退出</el-button>
 </el-header>

 <!-- VPS 到期通知条 -->
 <transition name="slide-down">
 <div v-if="vpsAlerts.length && !alertDismissed" class="vps-alert-bar" :class="vpsAlerts[0].severity">
 <span class="alert-icon">
            <el-icon color="#ef4444" :size="18" v-if="vpsAlerts[0].severity === 'overdue'"><WarningFilled /></el-icon>
            <el-icon color="#f59e0b" :size="18" v-else><WarningFilled /></el-icon>
          </span>
 <span class="alert-text">
 <template v-if="vpsAlerts[0].severity === 'overdue'">
 <b>{{ vpsAlerts[0].name }}</b> 已过期 <b>{{ vpsAlerts[0].days }} 天</b>
 <template v-if="vpsAlerts.length > 1">，另有 <b>{{ vpsAlerts.length - 1 }}</b> 台即将到期</template>
 </template>
 <template v-else>
 <b>{{ vpsAlerts[0].name }}</b> 仅剩 <b>{{ vpsAlerts[0].days }} 天</b> 到期
 <template v-if="vpsAlerts.length > 1">，另有 <b>{{ vpsAlerts.length - 1 }}</b> 台需关注</template>
 </template>
 — <a @click="$router.push('/monitor')" class="alert-link">查看详情 →</a>
 </span>
 <el-button size="small" circle text @click="alertDismissed = true" class="alert-close"><el-icon><Close /></el-icon></el-button>
 </div>
 </transition>

 <el-main class="app-main">
 <router-view v-slot="{ Component, route }">
 <keep-alive :include="['compress','video-compress']">
 <component :is="Component" :key="route.name" />
 </keep-alive>
 </router-view>
 </el-main>
 </el-container>
 </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWeekStore } from './stores/week'
import { useAuthStore } from './stores/auth'
import { ElMessage } from 'element-plus'
import { api, formatDateCN, formatDate, todayStr, daysBetween } from './api'

const route = useRoute()
const r = useRouter()
const weekStore = useWeekStore()
const authStore = useAuthStore()

const isCollapse = ref(false)
// 返回按钮
const hasHistory = computed(() => {
  if (typeof window === 'undefined') return false
  try { return window.history.length > 1 } catch { return false }
})
function goBack() { r.go(-1) }
const selectedWeekId = ref(null)
const vpsAlert = ref(0)
const vpsAlerts = ref([]) // [{name, days, severity, expireShort}]
const alertDismissed = ref(false)
let vpsTimer = null

const activeMenu = computed(() => route.path)

// 切换页面时，如果 VPS 仍有过期/即将到期，重新弹出提醒
watch(() => route.path, () => {
 if (vpsAlerts.value.length) alertDismissed.value = false
})

const weekTitle = computed(() => {
 if (!weekStore.currentWeek) return ''
 return formatDateCN(weekStore.currentWeek.startDate) + ' — ' + formatDateCN(weekStore.currentWeek.endDate)
})

const pageTitles = {
  '/': '仪表盘',
  '/plan': '周计划',
  '/report': '日报生成',
  '/history': '数据查询',
  '/monitor': '监控中心',
  '/clock': '世界时钟',
  '/assets': 'AI资产管理',
  '/media': '图片素材库',
  '/video-library': '视频素材库',
  '/video-compress': '视频压缩',
  '/scripts': '话术库',
  '/customer-stats': '客户数据统计',
  '/user-manage': '用户管理',
  '/compress': '图片压缩',
}
const pageTitle = computed(() => pageTitles[route.path] || 'Pan助手')

function shortDate(str) {
 return str ? formatDate(str) : ''
}

watch(() => weekStore.currentWeek, (w) => {
 if (w) selectedWeekId.value = w.id
}, { immediate: true })


onMounted(async () => {
 // 登录页不加载数据，避免API 401触发无限重定向
 if (route.path === '/login') return
 if (!authStore.isLoggedIn()) return
 await weekStore.load()
 if (!weekStore.currentWeek) await weekStore.createWeek()
 checkVps()
 vpsTimer = setInterval(checkVps, 120000)
})
onUnmounted(() => { if (vpsTimer) clearInterval(vpsTimer) })

async function checkVps() {
 try {
 const res = await api.vps.list()
 if (res.success) {
 vpsAlert.value = res.data.filter(v => daysBetween(todayStr(), v.expire) <= 14).length
 // 构建告警列表：已过期、7天内、14天内，按严重程度排序
 const today = todayStr()
 vpsAlerts.value = res.data
 .filter(v => {
 const d = daysBetween(today, v.expire)
 return d <= 14
 })
 .map(v => {
 const d = daysBetween(today, v.expire)
 return {
 name: v.name,
 days: Math.abs(d),
 severity: d < 0 ? 'overdue' : d <= 7 ? 'urgent' : 'warning',
 expireShort: (v.expire || '').substring(0, 10)
 }
 })
 .sort((a, b) => {
 const order = { overdue: 0, urgent: 1, warning: 2 }
 const bySeverity = (order[a.severity] || 3) - (order[b.severity] || 3)
 if (bySeverity !== 0) return bySeverity
 return a.days - b.days
 })
 }
 } catch(e) {}
}
</script>

<style scoped>
.app-layout { height: 100vh; }

.app-sidebar {
 background: #1e1f2a;
 display: flex; flex-direction: column;
 transition: width 0.3s;
 overflow: hidden;
}

.sidebar-logo {
 display: flex; align-items: center; gap: 10px;
 padding: 20px 20px 16px;
 cursor: pointer; user-select: none;
}
.logo-icon { font-size: 24px; }
.logo-text {
 font-size: 16px; font-weight: 800;
 background: linear-gradient(135deg, #818cf8, #a78bfa);
 -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

.sidebar-menu {
 flex: 1; border-right: none !important;
}
.sidebar-menu .el-menu-item {
 font-size: 14px; height: 48px; line-height: 48px;
 margin: 2px 8px; border-radius: 8px;
 transition: all 0.2s;
}
.sidebar-menu .el-menu-item:hover { background: #2a2b38 !important; }
.sidebar-menu .el-menu-item.is-active {
 background: linear-gradient(135deg, #6366f1, #818cf8) !important;
 color: #fff !important;
}

.sidebar-footer {
 display:none;
}

.sidebar-footer-status {
 padding:10px 12px 14px; text-align:center;
 border-top:1px solid rgba(255,255,255,.06);
}

.app-topbar {
 height: 48px; display: flex; align-items: center; gap: 12px;
 background: #fff; border-bottom: 1px solid #e5e7eb;
 padding: 0 16px;
}
.topbar-info { font-size: 12px; color: #9ca3af; }
.topbar-back { margin-right: 6px; color: #6b7280; }
.topbar-back:hover { color: #6366f1; }
.topbar-back.is-disabled { opacity: .25; cursor: default; }

.app-main {
 background: #f3f4f6;
 padding: 24px;
 overflow-y: auto;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 菜单项右上角badge */
.menu-item-title {
 position: relative; display: inline-block;
}
.menu-item-badge {
 position: absolute; top: -6px; right: -14px;
 min-width: 16px; height: 16px;
 background: #ef4444; color: #fff;
 font-size: 10px; font-weight: 700;
 border-radius: 8px;
 display: flex; align-items: center; justify-content: center;
 padding: 0 5px; line-height: 1;
 box-shadow: 0 0 0 2px #1e1f2a;
}

/* VPS告警通知条 */
.vps-alert-bar {
 display: flex; align-items: center; gap: 10px;
 padding: 10px 20px;
 font-size: 13px; font-weight: 600;
 border-bottom: 1px solid;
 animation: alertShake .6s ease-out;
}
.vps-alert-bar.overdue {
 background: #fef2f2; color: #b91c1c; border-color: #fecaca;
}
.vps-alert-bar.urgent {
 background: #fff7ed; color: #c2410c; border-color: #fed7aa;
}
.vps-alert-bar.warning {
 background: #fffbeb; color: #b45309; border-color: #fde68a;
}
.alert-icon { font-size: 18px; flex-shrink: 0; }
.alert-text { flex: 1; }
.alert-link { color: inherit; font-weight: 800; cursor: pointer; text-decoration: underline; }
.alert-close { opacity: .5; }
.alert-close:hover { opacity: 1; }

.slide-down-enter-active, .slide-down-leave-active { transition: all .3s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-100%); }
</style>
