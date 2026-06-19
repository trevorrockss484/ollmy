import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('pan_token') || '')
  const username = ref(localStorage.getItem('pan_user') || '')
  const password = ref(localStorage.getItem('pan_pass') || '')
  const rememberMe = ref(localStorage.getItem('pan_remember') === '1')

  async function login(t, u, p, remember) {
    token.value = t
    username.value = u
    password.value = remember ? p : ''
    rememberMe.value = remember
    localStorage.setItem('pan_token', t)
    localStorage.setItem('pan_user', u)
    if (remember) {
      localStorage.setItem('pan_pass', p)
      localStorage.setItem('pan_remember', '1')
    } else {
      localStorage.removeItem('pan_pass')
      localStorage.removeItem('pan_remember')
    }
  }

  async function autoLogin() {
    if (!token.value || !password.value) return false
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.value })
      })
      const data = await res.json()
      if (data.success) return true
      // token过期，用存储的密码重新登录
      const res2 = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.value, password: password.value })
      })
      const data2 = await res2.json()
      if (data2.success) {
        token.value = data2.data.token
        localStorage.setItem('pan_token', data2.data.token)
        return true
      }
    } catch(e) {}
    return false
  }

  function logout() {
    // 只清除 token，保留记住的密码信息
    token.value = ''
    localStorage.removeItem('pan_token')
    window.location.href = '/login'
  }

  function isLoggedIn() {
    return !!token.value
  }

  return { token, username, password, rememberMe, login, logout, autoLogin, isLoggedIn }
})
