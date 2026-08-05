import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('pan_token') || '')
  const username = ref(localStorage.getItem('pan_user') || '')
  const role = ref(localStorage.getItem('pan_role') || 'staff')
  const rememberMe = ref(localStorage.getItem('pan_remember') === '1')

  async function login(t, u, r, remember) {
    token.value = t
    username.value = u
    role.value = r || 'staff'
    rememberMe.value = remember
    localStorage.setItem('pan_token', t)
    localStorage.setItem('pan_user', u)
    localStorage.setItem('pan_role', r || 'staff')
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
          localStorage.setItem('pan_user', data.data.username)
          localStorage.setItem('pan_role', data.data.role)
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
    window.location.href = '/login'
  }

  function isLoggedIn() { return !!token.value }
  function isAdmin() { return role.value === 'admin' }

  return { token, username, role, rememberMe, login, logout, autoLogin, isLoggedIn, isAdmin }
})
