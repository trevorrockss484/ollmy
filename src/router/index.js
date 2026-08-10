import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
  { path: '/plan', name: 'plan', component: () => import('../views/PlanView.vue') },
  { path: '/report', name: 'report', component: () => import('../views/ReportView.vue') },
  { path: '/history', name: 'history', component: () => import('../views/HistoryView.vue') },
  { path: '/monitor', name: 'monitor', component: () => import('../views/MonitorView.vue') },

  { path: '/prompts', redirect: '/assets' },
  { path: '/assets', name: 'assets', component: () => import('../views/AssetsView.vue') },


  { path: '/compress', name: 'compress', component: () => import('../views/ImageCompressView.vue') },
  { path: '/video-compress', name: 'video-compress', component: () => import('../views/VideoCompressView.vue') },
  { path: '/video-library', name: 'video-library', component: () => import('../views/VideoLibraryView.vue') },
  { path: '/media', name: 'media', component: () => import('../views/MediaLibraryView.vue') },
  { path: '/customer-stats', name: 'customerStats', component: () => import('../views/CustomerStatsView.vue') },
  { path: '/role-manage', name: 'roleManage', component: () => import('../views/RoleManageView.vue') },
  { path: '/user-manage', name: 'userManage', component: () => import('../views/UserManageView.vue') },
  { path: '/settings', name: 'settings', component: () => import('../views/SystemSettingsView.vue') },
  { path: '/logs', name: 'logs', component: () => import('../views/LogViewer.vue') },
  { path: '/:pathMatch(.*)*', name: 'notFound', component: () => import('../views/NotFoundView.vue') },
]

const router = createRouter({ history: createWebHistory(), routes })

// 菜单优先级顺序（与 App.vue allMenuItems 保持一致）
const menuOrder = ['/', '/plan', '/report', '/history', '/monitor', '/assets', '/media', '/video-library', '/customer-stats', '/logs', '/settings', '/role-manage', '/user-manage', '/compress', '/video-compress']

let lastVerifiedAt = 0
const REVERIFY_MS = 120_000 // 2分钟重新向服务端验证一次权限

router.beforeEach(async (to, from, next) => {
  if (to.meta.public) return next()
  const auth = useAuthStore()
  if (!auth.isLoggedIn()) return next('/login')

  const needVerify = Date.now() - lastVerifiedAt > REVERIFY_MS
  if (needVerify) {
    lastVerifiedAt = Date.now()
    const ok = await auth.autoLogin()
    if (!ok) return next('/login')
  }

  if (!auth.canAccess(to.path)) {
    const firstMenu = menuOrder.find(m => auth.canAccess(m))
    if (!firstMenu) { auth.logout(); return }
    return next(firstMenu)
  }
  return next()
})

export default router
