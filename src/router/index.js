import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/', name: 'plan', component: () => import('../views/PlanView.vue') },
  { path: '/report', name: 'report', component: () => import('../views/ReportView.vue') },
  { path: '/history', name: 'history', component: () => import('../views/HistoryView.vue') },
  { path: '/monthly', name: 'monthly', component: () => import('../views/MonthlyView.vue') },
  { path: '/monitor', name: 'monitor', component: () => import('../views/MonitorView.vue') },
  { path: '/calculator', name: 'calculator', component: () => import('../views/CalculatorView.vue') },
]

const router = createRouter({ history: createWebHistory(), routes })

let autoLoginDone = false

router.beforeEach(async (to, from, next) => {
  if (to.meta.public) return next()
  const auth = useAuthStore()
  if (auth.isLoggedIn()) return next()
  // 记住了密码 → 尝试自动登录
  if (!autoLoginDone && auth.rememberMe) {
    autoLoginDone = true
    const ok = await auth.autoLogin()
    if (ok) return next()
  }
  next('/login')
})

export default router
