import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
  { path: '/plan', name: 'plan', component: () => import('../views/PlanView.vue') },
  { path: '/report', name: 'report', component: () => import('../views/ReportView.vue') },
  { path: '/history', name: 'history', component: () => import('../views/HistoryView.vue') },
  { path: '/monitor', name: 'monitor', component: () => import('../views/MonitorView.vue') },
  { path: '/clock', name: 'clock', component: () => import('../views/ClockView.vue') },
  { path: '/prompts', redirect: '/assets' },
  { path: '/assets', name: 'assets', component: () => import('../views/AssetsView.vue') },
  { path: '/library', redirect: '/assets' },
  { path: '/scripts', name: 'scripts', component: () => import('../views/ScriptsView.vue') },
  { path: '/compress', name: 'compress', component: () => import('../views/ImageCompressView.vue') },
  { path: '/video-compress', name: 'video-compress', component: () => import('../views/VideoCompressView.vue') },
  { path: '/video-library', name: 'video-library', component: () => import('../views/VideoLibraryView.vue') },
  { path: '/media', name: 'media', component: () => import('../views/MediaLibraryView.vue') },
  { path: '/customer-stats', name: 'customerStats', component: () => import('../views/CustomerStatsView.vue') },
  { path: '/role-manage', name: 'roleManage', component: () => import('../views/RoleManageView.vue') },
  { path: '/user-manage', name: 'userManage', component: () => import('../views/UserManageView.vue') },
]

const router = createRouter({ history: createWebHistory(), routes })

let tokenVerified = false

// 菜单优先级顺序（与 App.vue allMenuItems 保持一致）
const menuOrder = ['/', '/plan', '/report', '/history', '/monitor', '/clock', '/assets', '/media', '/video-library', '/scripts', '/customer-stats', '/role-manage', '/user-manage', '/compress', '/video-compress']

router.beforeEach(async (to, from, next) => {
  if (to.meta.public) return next()
  const auth = useAuthStore()
  // 首次访问：向服务端验证 token 有效性
  if (!tokenVerified && auth.isLoggedIn()) {
    tokenVerified = true
    const ok = await auth.autoLogin()
    if (ok) {
      // 检查目标路由权限
      if (!auth.canAccess(to.path)) {
        const firstMenu = menuOrder.find(m => auth.canAccess(m)) || '/login'
        return next(firstMenu)
      }
      return next()
    }
    return next('/login')
  }
  if (auth.isLoggedIn()) {
    // 检查目标路由权限
    if (!auth.canAccess(to.path)) {
      const firstMenu = menuOrder.find(m => auth.canAccess(m)) || '/login'
      return next(firstMenu)
    }
    return next()
  }
  next('/login')
})

export default router
