const BASE = '/api'
let reLoginPromise = null

async function reLogin() {
  const user = localStorage.getItem('pan_user')
  const pass = localStorage.getItem('pan_pass')
  if (!user || !pass) return false
  try {
    const res = await fetch(BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    })
    const data = await res.json()
    if (data.success && data.data?.token) {
      localStorage.setItem('pan_token', data.data.token)
      return true
    }
  } catch(e) {}
  return false
}

async function request(url, options = {}) {
  const token = localStorage.getItem('pan_token') || ''
  const res = await fetch(BASE + url, {
    ...options,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Auth-Token': token, ...(options.headers || {}) }
  })
  if (res.status === 401) {
    // 自动尝试重新登录（记住密码时）
    if (!reLoginPromise) reLoginPromise = reLogin()
    const ok = await reLoginPromise
    reLoginPromise = null
    if (ok) {
      // 重试原请求
      const newToken = localStorage.getItem('pan_token') || ''
      const retry = await fetch(BASE + url, {
        ...options,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Auth-Token': newToken, ...(options.headers || {}) }
      })
      if (retry.status === 401) {
        localStorage.removeItem('pan_token')
        window.location.href = '/login'
        return { success: false, error: '未登录' }
      }
      return retry.json()
    }
    localStorage.removeItem('pan_token')
    window.location.href = '/login'
    return { success: false, error: '未登录' }
  }
  return res.json()
}

export const api = {
  config: {
    weeks: () => request('/config/weeks'),
    current: () => request('/config/current'),
    addWeek: (data) => request('/config/week', { method: 'POST', body: JSON.stringify(data) }),
    updateWeek: (id, data) => request('/config/week/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    deleteWeek: (id) => request('/config/week/' + id, { method: 'DELETE' }),
    restoreWeek: (id) => request('/config/week/' + id + '/restore', { method: 'PUT' }),
    permDeleteWeek: (id) => request('/config/week/' + id + '/permanent', { method: 'DELETE' }),
    switchWeek: (id) => request('/config/current', { method: 'PUT', body: JSON.stringify({ id }) }),
  },
  daily: {
    get: (date) => request('/daily/' + date),
    list: (params) => request('/daily/query/list?' + new URLSearchParams(params)),
    save: (date, data) => request('/daily/' + date, { method: 'POST', body: JSON.stringify(data) }),
    delete: (date) => request('/daily/' + date, { method: 'DELETE' }),
  },
  summary: {
    monthly: (month) => request('/summary/monthly/' + month),
    weekly: (params) => request('/summary/weekly?' + new URLSearchParams(params)),
  },
  vps: {
    list: () => request('/vps'),
    add: (data) => request('/vps', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request('/vps/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request('/vps/' + id, { method: 'DELETE' }),
  }
}

// 工具函数
export function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

export function formatDate(str) {
  if (!str) return ''
  const p = str.split('-')
  return parseInt(p[1]) + '/' + parseInt(p[2])
}

export function formatDateCN(str) {
  if (!str) return ''
  const p = str.split('-')
  return p[0] + '年' + parseInt(p[1]) + '月' + parseInt(p[2]) + '日'
}

export function daysBetween(d1, d2) {
  return Math.ceil((new Date(d2) - new Date(d1)) / 86400000)
}

export function getDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]
}

export function getDateRange(start, end) {
  const dates = []
  const curr = new Date(start + 'T00:00:00')
  const endD = new Date(end + 'T00:00:00')
  while (curr <= endD) {
    dates.push(curr.getFullYear()+'-'+String(curr.getMonth()+1).padStart(2,'0')+'-'+String(curr.getDate()).padStart(2,'0'))
    curr.setDate(curr.getDate()+1)
  }
  return dates
}
