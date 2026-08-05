const BASE = '/api'

async function request(url, options = {}) {
  const token = localStorage.getItem('pan_token') || ''
  const isFormData = options.body instanceof FormData
  const headers = { 'X-Auth-Token': token, ...(options.headers || {}) }
  // FormData 不设 Content-Type（浏览器自动带 boundary）
  if (!isFormData) {
    headers['Content-Type'] = 'application/json; charset=utf-8'
  }
  try {
    const res = await fetch(BASE + url, { ...options, headers })
    // 401 → 清除 token 跳登录
    if (res.status === 401) {
      localStorage.removeItem('pan_token')
      window.location.href = '/login'
      return { success: false, error: '未登录' }
    }
    if (!res.ok) {
      // 尝试解析 JSON 错误体
      try {
        const errData = await res.json()
        return { success: false, error: errData.error || '请求失败 (' + res.status + ')' }
      } catch {
        return { success: false, error: '请求失败 (' + res.status + ')' }
      }
    }
    // 检查响应类型
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      return res.json()
    }
    // 非 JSON 响应（blob、HTML 等）返回原始 response
    return { success: true, _raw: res }
  } catch (e) {
    console.error('请求失败:', url, e.message)
    return { success: false, error: '网络错误: ' + (e.message || '未知') }
  }
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
    accounts: () => request('/daily/accounts/list'),
    get: (date, params = {}) => request('/daily/' + date + (Object.keys(params).length ? '?' + new URLSearchParams(params) : '')),
    list: (params) => request('/daily/query/list?' + new URLSearchParams(params)),
    save: (date, data, params = {}) => request('/daily/' + date + (Object.keys(params).length ? '?' + new URLSearchParams(params) : ''), { method: 'POST', body: JSON.stringify(data) }),
    delete: (date) => request('/daily/' + date, { method: 'DELETE' }),
  },
  summary: {
    monthly: (month, params = {}) => request('/summary/monthly/' + month + (Object.keys(params).length ? '?' + new URLSearchParams(params) : '')),
    weekly: (params) => request('/summary/weekly?' + new URLSearchParams(params)),
  },
  vps: {
    list: () => request('/vps'),
    add: (data) => request('/vps', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request('/vps/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request('/vps/' + id, { method: 'DELETE' }),
  },
  prompts: {
    list: () => request('/prompts'),
    get: (id) => request('/prompts/' + id),
    add: (data) => request('/prompts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request('/prompts/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request('/prompts/' + id, { method: 'DELETE' }),
    reorder: (ids) => request('/prompts/reorder/batch', { method: 'PUT', body: JSON.stringify({ ids }) }),
    getSteps: () => request('/prompts/steps/config'),
    saveSteps: (steps) => request('/prompts/steps/config', { method: 'PUT', body: JSON.stringify({ steps }) }),
  },
  assets: {
    list: (type) => request('/assets' + (type ? '?type=' + encodeURIComponent(type) : '')),
    update: (id, data) => request('/assets/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request('/assets/' + id, { method: 'DELETE' }),
    batchDelete: (ids) => request('/assets/batch-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
    batchDownloadUrl: () => '/api/assets/batch-download',
    getUrl: (fileName) => '/uploads/assets/original/' + encodeURIComponent(fileName),
    downloadUrl: (id) => '/api/assets/' + id + '/download',
  },
  library: {
    list: () => request('/library'),
    update: (id, data) => request('/library/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request('/library/' + id, { method: 'DELETE' }),
    downloadUrl: (id) => '/api/library/' + id + '/download',
  },
  tools: {
    compressUrl: '/api/tools/compress',
    downloadUrl: (filename) => '/api/tools/download/' + encodeURIComponent(filename),
    downloadAllUrl: (sessionId) => '/api/tools/download-all/' + encodeURIComponent(sessionId),
  },
  customerStats: {
    list: (params) => request('/customer-stats?' + new URLSearchParams(params)),
    save: (data) => request('/customer-stats', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request('/customer-stats/' + id, { method: 'DELETE' }),
    monthly: (month, accountId) => request('/customer-stats/monthly/' + month + (accountId ? '?accountId=' + accountId : '')),
  },
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
  return Math.ceil((new Date(d2 + "T00:00:00") - new Date(d1 + "T00:00:00")) / 86400000)
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

// 为下载 URL 附加认证 token，支持 <a> 标签直接下载
export function authUrl(path) {
  const token = localStorage.getItem('pan_token') || ''
  if (!token) return path
  const sep = path.includes('?') ? '&' : '?'
  return path + sep + 'token=' + encodeURIComponent(token)
}

export function formatSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
