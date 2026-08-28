<template>
 <el-config-provider :locale="zhCn">
 <!-- 登录页全屏独立 -->
 <div v-if="route.path === '/login'" style="height:100vh;">
 <router-view />
 </div>

 <el-container v-else class="app-layout">
 <!-- 侧边栏 -->
 <el-aside :width="isCollapse ? '64px' : '220px'" class="app-sidebar">
 <div class="sidebar-logo" @click="isCollapse = !isCollapse">
 <el-icon :size="24"><PictureFilled /></el-icon>
 <span v-show="!isCollapse" class="logo-text">Pan助手</span>
 </div>

 <nav class="sidebar-nav">
     <template v-for="item in groupedMenus" :key="item.isGroup ? 'grp-'+item.label : item.path">
       <div v-if="item.isGroup && !isCollapse" class="sidebar-group-label">{{ item.label }}</div>
       <router-link v-else-if="!item.isGroup"
         :to="item.path"
         class="sidebar-item"
         :class="{ active: activeMenu === item.path }">
         <el-icon :size="20"><component :is="item.icon" /></el-icon>
         <span v-show="!isCollapse" class="sidebar-item-label">{{ item.label }}</span>
       </router-link>
     </template>
     </nav>

 <div class="sidebar-footer">
 <div class="sidebar-footer-avatar">{{ authStore.username.charAt(0) }}</div>
 <div v-show="!isCollapse" class="sidebar-footer-info">
 <div class="sidebar-footer-name">{{ authStore.username }}</div>
 <div class="sidebar-footer-role">{{ authStore.role === 'admin' ? '管理员' : '成员' }}</div>
 <div class="sidebar-footer-shortcut" @click="shortcutOpen = true">? 快捷键</div>
 </div>
 <el-button v-show="!isCollapse" size="small" text @click="authStore.logout()" class="sidebar-footer-logout">
 <el-icon :size="14"><SwitchButton /></el-icon>
 </el-button>
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
 <span class="topbar-breadcrumb">
 <el-icon :size="14" style="color:#9ca3af;margin:0 4px;"><ArrowRight /></el-icon>
 <template v-for="(crumb, idx) in breadcrumbs" :key="idx">
 <span v-if="idx > 0" style="color:#d1d5db;">/</span>
 <span class="breadcrumb-item" :class="{ current: idx === breadcrumbs.length-1 }">{{ crumb }}</span>
 </template>
 </span>
 <div style="flex:1;" />
 <!-- 通知中心 -->
 <el-popover placement="bottom-end" :width="360" trigger="click" :show-arrow="false" popper-class="notif-popover">
 <template #reference>
 <el-badge :value="vpsAlerts.length" :hidden="!vpsAlerts.length" :max="99" class="notif-bell">
 <el-button size="small" text style="color:#9ca3af;font-size:16px;"><el-icon :size="16"><Bell /></el-icon></el-button>
 </el-badge>
 </template>
 <div class="notif-hd">通知中心<span v-if="vpsAlerts.length" class="notif-count">{{ vpsAlerts.length }}</span></div>
 <div v-if="!vpsAlerts.length" class="notif-empty">
 <el-icon :size="32" color="#d1d5db"><Bell /></el-icon>
 <p>暂无通知</p>
 </div>
 <div v-else class="notif-list">
 <div v-for="(a,i) in vpsAlerts.slice(0,5)" :key="i" class="notif-item" :class="a.severity" @click="r.push('/monitor')">
 <span class="notif-item-icon" :class="a.severity">
 <el-icon :size="16"><WarningFilled v-if="a.severity==='overdue'"/><Clock v-else/></el-icon>
 </span>
 <div class="notif-item-body">
 <div class="notif-item-title">{{ a.name }}</div>
 <div class="notif-item-desc">{{ a.severity==='overdue'?'已过期'+a.days+'天':'剩余'+a.days+'天到期' }} · {{ a.expireShort }}</div>
 </div>
 </div>
 <div class="notif-footer" @click="r.push('/monitor')">查看全部 VPS →</div>
 </div>
 </el-popover>
 <el-button size="small" text @click="toggleDark" style="color:#9ca3af;font-size:16px;" :title="isDark ? '切换亮色' : '切换暗色'">
 <el-icon :size="16"><Moon v-if="!isDark" /><Sunny v-else /></el-icon>
 </el-button>
 <span style="font-size:11px;color:#9ca3af;margin-right:12px;">{{ authStore.username }}</span>
 <el-button size="small" text @click="logout" style="color:#9ca3af;">退出</el-button>
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

   <!-- 快捷键帮助面板 -->
   <teleport to="body">
    <el-dialog v-model="shortcutOpen" title="⌨ 快捷键" width="440px" destroy-on-close :show-close="false">
     <div class="shortcut-grid">
      <div class="sk-row"><kbd>Ctrl/Cmd + K</kbd><span>全局搜索</span></div>
      <div class="sk-row"><kbd>Ctrl/Cmd + S</kbd><span>强制保存(剧本编辑时)</span></div>
      <div class="sk-row"><kbd>Esc</kbd><span>关闭预览/弹窗</span></div>
      <div class="sk-row"><kbd>← →</kbd><span>Lightbox 切换图片</span></div>
      <div class="sk-row"><kbd>?</kbd><span>显示此面板</span></div>
     </div>
     <template #footer><el-button @click="shortcutOpen = false">关闭</el-button></template>
    </el-dialog>
   </teleport>

 <el-main class="app-main">
 <div v-if="hasError" class="error-fallback">
 <el-icon :size="48" color="#ef4444"><WarningFilled /></el-icon>
 <h3>页面加载异常</h3>
 <p>{{ appError }}</p>
 <el-button type="primary" @click="hasError = false; appError = null">重试</el-button>
 </div>
 <router-view v-else v-slot="{ Component, route }">
 <keep-alive :include="['compress','video-compress']">
 <component :is="Component" :key="route.name" />
 </keep-alive>
 </router-view>
 </el-main>
 </el-container>
 </el-container>
 </el-config-provider>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, onErrorCaptured } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useWeekStore } from './stores/week'
import { useAuthStore } from './stores/auth'
import { ElMessage } from 'element-plus'
import { api, formatDateCN, formatDate, todayStr, daysBetween } from './api'

const route = useRoute()
const r = useRouter()
const weekStore = useWeekStore()
const authStore = useAuthStore()

// Menu items with access control
const allMenuItems = [
  { path: '/', label: '仪表盘', icon: 'Odometer', group: '核心' },
  { path: '/plan', label: '周计划', icon: 'Calendar', group: '核心' },
  { path: '/report', label: '日报生成', icon: 'Edit', group: '核心' },
  { path: '/history', label: '数据查询', icon: 'TrendCharts', group: '核心' },
  { path: '/customer-stats', label: '客户统计', icon: 'DataAnalysis', group: '工具' },
  { path: '/monitor', label: '监控中心', icon: 'Monitor', group: '工具' },

  { path: '/assets', label: 'AI资产管理', icon: 'PictureFilled', group: '资源' },
  { path: '/media', label: '图片素材库', icon: 'PictureFilled', group: '资源' },
  { path: '/video-library', label: '视频素材库', icon: 'VideoCameraFilled', group: '资源' },

  { path: '/compress', label: '图片压缩', icon: 'Scissor', group: '工具' },
  { path: '/video-compress', label: '视频压缩', icon: 'VideoCameraFilled', group: '工具' },
  { path: '/logs', label: '操作日志', icon: 'Notebook', group: '管理' },
  { path: '/settings', label: '系统设置', icon: 'Setting', group: '管理' },
  { path: '/role-manage', label: '角色管理', icon: 'Key', group: '管理' },
  { path: '/user-manage', label: '用户管理', icon: 'User', group: '管理' },
]
const visibleMenus = computed(() => allMenuItems.filter(m => authStore.canAccess(m.path)))
const groupedMenus = computed(() => {
  const groups = []
  const seen = new Set()
  for (const m of visibleMenus.value) {
    if (!seen.has(m.group)) {
      seen.add(m.group)
      groups.push({ isGroup: true, label: m.group })
    }
    groups.push(m)
  }
  return groups
})

const isCollapse = ref(false)
const isDark = ref(localStorage.getItem('theme') === 'dark' || false)
const shortcutOpen = ref(false)
function onGlobalKeydown(e) {
  // 不在输入框内时触发
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); shortcutOpen.value = true }
}
if (typeof window !== 'undefined') window.addEventListener('keydown', onGlobalKeydown)
function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}
function logout() { authStore.logout(); r.push('/login') }
// 初始化暗色
if (isDark.value) document.documentElement.classList.add('dark')

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

// 面包屑
const breadcrumbs = computed(() => {
  const arr = [pageTitles[route.path] || route.path]
  // 简单路径：直接显示页面名
  const p = route.path
  if (p === '/') return ['仪表盘']
  if (pageTitles[p]) return [pageTitles[p]]
  return arr
})

// 错误边界
const appError = ref(null)
const hasError = ref(false)
onErrorCaptured((err) => {
  hasError.value = true
  appError.value = err.message || '页面加载异常'
  console.error('全局错误:', err)
  return false
})

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
  '/assets': 'AI资产管理',
  '/media': '图片素材库',
  '/video-library': '视频素材库',
  '/video-compress': '视频压缩',

  '/customer-stats': '客户数据统计',
  '/user-manage': '用户管理',
  '/role-manage': '角色管理',
  '/settings': '系统设置',
  '/logs': '操作日志',
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
 if ('Notification' in window && Notification.permission === 'default') {
 try { await Notification.requestPermission() } catch {}
 }
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
 if (vpsAlerts.value.length && document.hidden && Notification.permission === 'default') {
 Notification.requestPermission()
 }
 if (vpsAlerts.value.length && document.hidden && Notification.permission === 'granted') {
 const top = vpsAlerts.value[0]
 new Notification('VPS 到期提醒', {
 body: (top.severity === 'overdue' ? top.name + ' 已过期' : top.name + ' 剩余 ' + top.days + ' 天') +
 (vpsAlerts.value.length > 1 ? ' +' + (vpsAlerts.value.length-1) + ' 台' : '')
 })
 }
 }
 } catch(e) {}
}
</script>

<style scoped>
.app-layout { height: 100vh; }

/* ====== 侧边栏企业级 ====== */
.app-sidebar {
 background: #0c0e15;
 display: flex; flex-direction: column;
 transition: width 0.25s cubic-bezier(.4,0,.2,1);
 overflow: hidden; flex-shrink: 0;
 border-right: 1px solid rgba(255,255,255,.04);
}
html.dark .app-sidebar { background: #06070e; border-color: rgba(255,255,255,.03); }
.sidebar-item-label, .logo-text, .sidebar-footer-info, .sidebar-footer-role, .sidebar-footer-logout, .sidebar-group-label {
 transition: opacity .2s ease;
}

.sidebar-logo {
 display: flex; align-items: center; gap: 12px;
 padding: 22px 20px 18px; cursor: pointer; user-select: none;
 border-bottom: 1px solid rgba(255,255,255,.05);
}
.sidebar-logo .el-icon { color: var(--brand-400); flex-shrink: 0; }
.logo-text {
 font-size: 17px; font-weight: 800; letter-spacing: -.3px;
 background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
 -webkit-background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap;
}

/* 导航 */
.sidebar-nav {
 flex: 1; overflow-y: auto; padding: var(--space-2) 0;
 scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.06) transparent;
}
.sidebar-nav::-webkit-scrollbar { width: 3px; }
.sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 2px; }

.sidebar-group-label {
 font-size: 10px; font-weight: 800; color: #4b5563;
 text-transform: uppercase; letter-spacing: 1.2px;
 padding: 18px 20px 8px; user-select: none;
}

.sidebar-item {
 display: flex; align-items: center; gap: 12px;
 height: 42px; padding: 0 14px; margin: 2px 10px; border-radius: 10px;
 font-size: 13px; font-weight: 550; color: #88889e;
 text-decoration: none; cursor: pointer;
 transition: all .15s ease; position: relative;
}
.sidebar-item:hover { background: rgba(255,255,255,.06); color: #c4c4d8; }
.sidebar-item.active {
 background: linear-gradient(135deg, rgba(99,102,241,.28), rgba(129,140,248,.12));
 color: #d4d4ff; font-weight: 700;
 box-shadow: inset 0 0 0 1px rgba(99,102,241,.2);
}
.sidebar-item.active::before {
 content: ''; position: absolute; left: -2px; top: 10px; bottom: 10px;
 width: 3px; border-radius: 0 3px 3px 0; background: var(--brand-400);
}
.sidebar-item-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-item .el-icon { flex-shrink: 0; }

/* 底部 */
.sidebar-footer {
 display: flex; align-items: center; gap: 10px;
 padding: 14px 16px; border-top: 1px solid rgba(255,255,255,.05); margin-top: auto;
}
.sidebar-footer-avatar {
 width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
 background: linear-gradient(135deg, var(--brand-500), var(--brand-400));
 color: #fff; font-size: 14px; font-weight: 800;
 display: flex; align-items: center; justify-content: center; text-transform: uppercase;
}
.sidebar-footer-info { flex: 1; min-width: 0; }
.sidebar-footer-name { font-size: 13px; font-weight: 600; color: #d4d4e0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-footer-role { font-size: 11px; color: #6b7280; font-weight: 500; }
.sidebar-footer-shortcut { font-size: 10px; color: #4b5563; margin-top: 3px; cursor: pointer; }
.sidebar-footer-shortcut:hover { color: var(--brand-400); }
.sidebar-footer-logout { color: #6b7280; flex-shrink: 0; }
.sidebar-footer-logout:hover { color: var(--danger); }

/* ====== 顶栏 ====== */
.app-topbar {
 height: 48px; display: flex; align-items: center; gap: 12px;
 background: var(--surface-card); border-bottom: 1px solid var(--border-default);
 padding: 0 16px;
}
.topbar-info { font-size: 12px; color: var(--text-tertiary); }
.topbar-breadcrumb { display:flex; align-items:center; gap:4px; font-size:12px; }
.breadcrumb-item { color: var(--text-tertiary); }
.breadcrumb-item.current { color: var(--text-primary); font-weight:600; }
.topbar-back { margin-right: 6px; color: var(--text-secondary); }
.topbar-back:hover { color: var(--brand-500); }
.topbar-back.is-disabled { opacity: .25; cursor: default; }

.app-main {
 background: var(--surface-page);
 padding: 24px;
 overflow-y: auto;
 flex: 1; min-height: 0;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

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

.notif-bell { margin-right: 4px; }
.notif-bell .el-badge__content { border: none; }
</style>

<!-- 通知弹窗非scoped样式 -->
<style>
.notif-popover { padding: 0 !important; }
.notif-hd { padding: 14px 16px; font-size: 14px; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px; }
.notif-count { background: #ef4444; color: #fff; font-size: 11px; padding: 1px 7px; border-radius: 10px; }
.notif-empty { text-align: center; padding: 40px; color: #9ca3af; }
.notif-list { max-height: 320px; overflow-y: auto; }
.notif-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; cursor: pointer; transition: .12s; border-bottom: 1px solid var(--border-color); }
.notif-item:hover { background: var(--bg-card-hover); }
.notif-item-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.notif-item-icon.overdue { background: #fef2f2; color: #ef4444; }
.notif-item-icon.warning, .notif-item-icon.urgent { background: #fefce8; color: #f59e0b; }
.notif-item-body { flex: 1; min-width: 0; }
.notif-item-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.notif-item-desc { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.notif-footer { text-align: center; padding: 10px; font-size: 12px; font-weight: 600; color: #6366f1; cursor: pointer; border-top: 1px solid var(--border-color); }
.notif-footer:hover { background: var(--bg-card-hover); }

.error-fallback { text-align:center; padding:80px 20px; color:#6b7280; }
.error-fallback h3 { font-size:18px; font-weight:700; color:#374151; margin:16px 0 8px; }
.error-fallback p { font-size:13px; margin-bottom:16px; }

.shortcut-grid { display:flex; flex-direction:column; gap:10px; }
.sk-row { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--surface-hover); border-radius:8px; }
.sk-row kbd { display:inline-block; padding:2px 10px; border:1.5px solid var(--border-strong); border-radius:6px; font-family:'SF Mono',ui-monospace,monospace; font-size:12px; font-weight:700; color:var(--text-primary); background:var(--surface-card); min-width:120px; text-align:center; }
.sk-row span { font-size:13px; color:var(--text-secondary); font-weight:500; }
</style>
