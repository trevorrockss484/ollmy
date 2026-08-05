import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('pan_token') || '')
  const username = ref(localStorage.getItem('pan_user') || '')
  const role = ref(localStorage.getItem('pan_role') || 'staff')
  const menus = ref(JSON.parse(localStorage.getItem('pan_menus') || '[]'))
  const rememberMe = ref(localStorage.getItem('pan_remember') === '1')

  async function login(t, u, r, m, remember) {
    token.value = t
    username.value = u
    role.value = r || 'staff'
    menus.value = m || []
    rememberMe.value = remember
    localStorage.setItem('pan_token', t)
    localStorage.setItem('pan_user', u)
    localStorage.setItem('pan_role', r || 'staff')
    localStorage.setItem('pan_menus', JSON.stringify(m || []))
    if (remember) {
      localStorage.setItem('pan_remember', '1')
    } else {
      localStorage.removeItem('pan_remember')
    }
  }

  async function autoLogin() {
    if (!token.value) return false
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.value })
      })
      const data = await res.json()
      if (data.success) {
        if (data.data) {
          username.value = data.data.username
          role.value = data.data.role
          menus.value = data.data.menus || []
          localStorage.setItem('pan_user', data.data.username)
          localStorage.setItem('pan_role', data.data.role)
          localStorage.setItem('pan_menus', JSON.stringify(data.data.menus || []))
        }
        return true
      }
    } catch(e) {}
    token.value = ''
    localStorage.removeItem('pan_token')
    return false
  }

  function logout() {
    token.value = ''
    localStorage.removeItem('pan_token')
    localStorage.removeItem('pan_remember')
    localStorage.removeItem('pan_role')
    localStorage.removeItem('pan_menus')
    window.location.href = '/login'
  }

  function isLoggedIn() { return !!token.value }
  function isAdmin() { return role.value === 'admin' }
  function canAccess(path) { return isAdmin() || menus.value.includes(path) }

  return { token, username, role, menus, rememberMe, login, logout, autoLogin, isLoggedIn, isAdmin, canAccess }
})
