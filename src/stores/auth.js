import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('pan_token') || '')
  const username = ref(localStorage.getItem('pan_user') || '')
  const rememberMe = ref(localStorage.getItem('pan_remember') === '1')

  async function login(t, u, remember) {
    token.value = t
    username.value = u
    rememberMe.value = remember
    localStorage.setItem('pan_token', t)
    localStorage.setItem('pan_user', u)
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
      if (data.success) return true
    } catch(e) {}
    // token 无效或过期，清除并跳转登录
    token.value = ''
    localStorage.removeItem('pan_token')
    return false
  }

  function logout() {
    token.value = ''
    localStorage.removeItem('pan_token')
    localStorage.removeItem('pan_remember')
    window.location.href = '/login'
  }

  function isLoggedIn() {
    return !!token.value
  }

  return { token, username, rememberMe, login, logout, autoLogin, isLoggedIn }
})
