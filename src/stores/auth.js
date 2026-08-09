import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('pan_token') || '')
  const username = ref(localStorage.getItem('pan_user') || '')
  const role = ref(localStorage.getItem('pan_role') || 'staff')
  const menus = ref(JSON.parse(localStorage.getItem('pan_menus') || '[]'))
  const rememberMe = ref(localStorage.getItem('pan_remember') === '1')
  const permissions = ref(JSON.parse(localStorage.getItem('pan_perms') || '{"edit":false,"add":false,"delete":false}'))
  const perPagePerms = ref(JSON.parse(localStorage.getItem('pan_pperms') || '{}'))

  function _resolve(path) {
    if (isAdmin()) return true
    const pp = perPagePerms.value
    if (path && pp && Object.keys(pp).length) {
      const keys = Object.keys(pp).filter(k => path.startsWith(k)).sort((a,b) => b.length - a.length)
      if (keys.length) return pp[keys[0]]
    }
    return permissions.value
  }

  function canEdit(path) {
    const r = _resolve(path)
    return typeof r === 'object' ? r.edit : isAdmin()
  }
  function canAdd(path) {
    const r = _resolve(path)
    return typeof r === 'object' ? r.add : isAdmin()
  }
  function canDelete(path) {
    const r = _resolve(path)
    return typeof r === 'object' ? r.delete : isAdmin()
  }

  async function login(t, u, r, m, remember, p, pp) {
    token.value = t
    username.value = u
    role.value = r || 'staff'
    menus.value = m || []
    permissions.value = p || { edit: false, add: false, delete: false }
    perPagePerms.value = pp || {}
    rememberMe.value = remember
    localStorage.setItem('pan_token', t)
    localStorage.setItem('pan_user', u)
    localStorage.setItem('pan_role', r || 'staff')
    localStorage.setItem('pan_menus', JSON.stringify(m || []))
    localStorage.setItem('pan_perms', JSON.stringify(permissions.value))
    localStorage.setItem('pan_pperms', JSON.stringify(pp || {}))
    if (remember) { localStorage.setItem('pan_remember', '1') }
    else { localStorage.removeItem('pan_remember') }
  }

  async function autoLogin() {
    if (!token.value) return false
    try {
      const res = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token.value }) })
      const data = await res.json()
      if (data.success && data.data) {
        username.value = data.data.username
        role.value = data.data.role
        menus.value = data.data.menus || []
        permissions.value = data.data.permissions || { edit: false, add: false, delete: false }
        perPagePerms.value = data.data.perPagePerms || {}
        localStorage.setItem('pan_user', data.data.username)
        localStorage.setItem('pan_role', data.data.role)
        localStorage.setItem('pan_menus', JSON.stringify(data.data.menus || []))
        localStorage.setItem('pan_perms', JSON.stringify(permissions.value))
        localStorage.setItem('pan_pperms', JSON.stringify(perPagePerms.value))
        return true
      }
    } catch(e) {}
    token.value = ''
    localStorage.removeItem('pan_token')
    return false
  }

  function logout() {
    token.value = ''
    ;['pan_token','pan_remember','pan_role','pan_menus','pan_perms','pan_pperms'].forEach(k => localStorage.removeItem(k))
    window.location.href = '/login'
  }

  function isLoggedIn() { return !!token.value }
  function isAdmin() { return role.value === 'admin' }
  function canAccess(path) { return isAdmin() || menus.value.includes(path) }

  return { token, username, role, menus, permissions, perPagePerms, rememberMe, login, logout, autoLogin, isLoggedIn, isAdmin, canAccess, canEdit, canAdd, canDelete }
})
