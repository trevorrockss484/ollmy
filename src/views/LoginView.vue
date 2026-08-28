<template>
  <div class="login-page" ref="pageRef">
    <!-- Three.js 画布背景 -->
    <canvas ref="threeCanvas" class="login-canvas"></canvas>

    <div class="login-card">
      <div class="login-brand">
        <span class="login-logo">🐼</span>
        <div class="login-brand-text">
          <h1>Pan 助手</h1>
          <p>客户数据管理中心</p>
        </div>
      </div>

      <el-form :model="form" size="large" class="login-form" @submit.prevent="doLogin">
        <div class="login-field">
          <span class="login-field-icon"><el-icon :size="18"><User /></el-icon></span>
          <input v-model="form.username" type="text" placeholder="用户名" class="login-input" autocomplete="username" @keyup.enter="focusPwd" />
        </div>

        <div class="login-field">
          <span class="login-field-icon"><el-icon :size="18"><Lock /></el-icon></span>
          <input ref="pwdInput" v-model="form.password" :type="showPwd ? 'text' : 'password'" placeholder="密码" class="login-input" autocomplete="current-password" @keyup.enter="doLogin" />
          <span class="login-field-suf" @click="showPwd = !showPwd">
            <el-icon :size="16"><View v-if="!showPwd" /><Hide v-else /></el-icon>
          </span>
        </div>

        <label class="login-remember">
          <input type="checkbox" v-model="rememberMe" />
          <span class="login-remember-mark"></span>
          记住账号
        </label>

        <button type="submit" class="login-btn" :class="{ loading: loading }" :disabled="loading">
          <span v-if="loading" class="login-btn-loading"></span>
          <span>{{ loading ? '登录中...' : '登 录' }}</span>
        </button>

        <p v-if="error" class="login-error">
          <el-icon :size="14"><WarningFilled /></el-icon> {{ error }}
        </p>
      </el-form>
    </div>

    <div class="login-footer">Pan 助手 v3.0</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const error = ref('')
const showPwd = ref(false)
const form = reactive({ username: '', password: '' })
const rememberMe = ref(false)
const pwdInput = ref(null)
const pageRef = ref(null)
const threeCanvas = ref(null)

if (authStore.rememberMe) {
  form.username = authStore.username || ''
  rememberMe.value = true
}

function focusPwd() { pwdInput.value?.focus() }

async function doLogin() {
  if (!form.username || !form.password) { error.value = '请输入用户名和密码'; return }
  loading.value = true; error.value = ''
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username, password: form.password })
    })
    const data = await res.json()
    if (data.success) {
      const menus = data.data.menus || []
      if (!menus.length) {
        error.value = '该账号没有分配任何页面权限，请联系管理员配置角色菜单'
        loading.value = false
        return
      }
      authStore.login(data.data.token, data.data.username, data.data.role, data.data.menus, rememberMe.value, data.data.permissions, data.data.perPagePerms, data.data.tabAccess)
      ElMessage.success('登录成功')
      const menuOrder = ['/', '/plan', '/report', '/history', '/monitor', '/assets', '/media', '/video-library', '/customer-stats', '/logs', '/settings', '/role-manage', '/user-manage', '/compress', '/video-compress']
      const firstMenu = menuOrder.find(m => menus.includes(m)) || '/'
      window.location.href = firstMenu
    } else {
      error.value = data.error || '登录失败'
    }
  } catch (e) {
    error.value = '网络错误，请重试'
  }
  loading.value = false
}

// ====== Canvas 2D 粒子网络背景（替代 three.js，省 ~500KB） ======
let ctx, particles2d, animationId
let mouseX = 0, mouseY = 0
let targetMouseX = 0, targetMouseY = 0
const LINK_DIST = 130

function initParticles() {
  const canvas = threeCanvas.value
  if (!canvas) return
  ctx = canvas.getContext('2d')

  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()

  const count = Math.min(150, Math.floor(window.innerWidth * window.innerHeight / 14000))
  particles2d = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - .5) * .3,
    vy: (Math.random() - .5) * .3,
    r: Math.random() * 1.6 + .6,
    t: Math.random(),          // 颜色插值参数：indigo → violet
    tw: Math.random() * Math.PI * 2,  // 闪烁相位
  }))

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', onResize)
  animate()
}

function onMouseMove(e) {
  targetMouseX = (e.clientX / window.innerWidth) * 2 - 1
  targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1
}

function onResize() {
  const canvas = threeCanvas.value
  if (!canvas || !ctx) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

function animate() {
  const canvas = threeCanvas.value
  if (!canvas || !ctx) return
  animationId = requestAnimationFrame(animate)

  const w = canvas.width, h = canvas.height
  // 平滑鼠标视差
  mouseX += (targetMouseX - mouseX) * 0.03
  mouseY += (targetMouseY - mouseY) * 0.03
  const offX = mouseX * 14, offY = -mouseY * 10

  ctx.clearRect(0, 0, w, h)

  // 中心呼吸光晕
  const t = Date.now() * 0.001
  const glowR = (Math.min(w, h) * 0.28) * (1 + Math.sin(t * 0.8) * 0.12)
  const glow = ctx.createRadialGradient(w / 2 + offX, h / 2 + offY, 0, w / 2 + offX, h / 2 + offY, glowR)
  glow.addColorStop(0, 'rgba(99,102,241,.14)')
  glow.addColorStop(1, 'rgba(99,102,241,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  // 粒子漂移 + 边缘环绕
  for (const p of particles2d) {
    p.x += p.vx; p.y += p.vy
    if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20
    if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20
  }

  // 连线（近距离）
  ctx.lineWidth = 1
  for (let i = 0; i < particles2d.length; i++) {
    const a = particles2d[i]
    for (let j = i + 1; j < particles2d.length; j++) {
      const b = particles2d[j]
      const dx = a.x - b.x, dy = a.y - b.y
      const d2 = dx * dx + dy * dy
      if (d2 < LINK_DIST * LINK_DIST) {
        const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.14
        ctx.strokeStyle = `rgba(129,140,248,${alpha})`
        ctx.beginPath()
        ctx.moveTo(a.x + offX, a.y + offY)
        ctx.lineTo(b.x + offX, b.y + offY)
        ctx.stroke()
      }
    }
  }

  // 粒子（indigo→violet 渐变 + 轻微闪烁）
  for (const p of particles2d) {
    const flicker = .55 + Math.sin(t * 1.4 + p.tw) * .3
    const r = Math.round(99 + p.t * 39)
    const g = Math.round(102 + p.t * 41)
    const b = Math.round(241 + p.t * 15)
    ctx.fillStyle = `rgba(${r},${g},${b},${flicker})`
    ctx.beginPath()
    ctx.arc(p.x + offX, p.y + offY, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function destroyParticles() {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', onResize)
  ctx = null; particles2d = null
}

onMounted(() => { initParticles() })
onUnmounted(() => { destroyParticles() })
</script>

<style scoped>
.login-page {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 24px;
  background: #0a0a14; position: relative; overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* Three.js 画布 */
.login-canvas {
  position: fixed; inset: 0; z-index: 0;
  width: 100%; height: 100%;
}

/* ====== 卡片 ====== */
.login-card {
  position: relative; z-index: 1;
  background: rgba(10, 10, 25, 0.65);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: var(--radius-xl); padding: 44px 40px 40px;
  width: 420px;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.04), 0 24px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
.login-page {
  background: radial-gradient(ellipse at 30% 30%, #1a1040 0%, #0a0a18 50%, #03030a 100%);
  min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
}

/* ====== 品牌 ====== */
.login-brand {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 36px;
}
.login-logo {
  font-size: 44px; line-height: 1;
  filter: drop-shadow(0 4px 12px rgba(99, 102, 241, .4));
}
.login-brand-text h1 {
  font-size: 26px; font-weight: 800; color: #f1f5f9;
  margin: 0; letter-spacing: -.5px;
}
.login-brand-text p {
  font-size: 13px; color: #94a3b8; margin: 2px 0 0;
  font-weight: 500;
}

/* ====== 表单 ====== */
.login-form { display: flex; flex-direction: column; gap: 16px; }

.login-field { position: relative; display: flex; align-items: center; }
.login-field-icon {
  position: absolute; left: 16px; color: #64748b;
  display: flex; align-items: center; pointer-events: none; z-index: 1;
}
.login-field-suf {
  position: absolute; right: 14px; color: #64748b;
  cursor: pointer; display: flex; align-items: center; transition: color .15s;
}
.login-field-suf:hover { color: #94a3b8; }

.login-input {
  width: 100%; height: 50px;
  padding: 0 44px 0 46px;
  background: rgba(255, 255, 255, .04);
  border: 1.5px solid rgba(255, 255, 255, .08);
  border-radius: 14px;
  font-size: 15px; font-weight: 500; color: #e2e8f0;
  outline: none; transition: all .2s;
  font-family: inherit;
}
.login-input::placeholder { color: #475569; }
.login-input:focus {
  border-color: #6366f1;
  background: rgba(99, 102, 241, .06);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, .1);
}

.login-remember {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; color: #94a3b8; cursor: pointer;
  user-select: none; padding: 2px 0;
}
.login-remember input[type="checkbox"] { display: none; }
.login-remember-mark {
  width: 18px; height: 18px; border-radius: 5px;
  border: 2px solid rgba(255, 255, 255, .12);
  background: rgba(255, 255, 255, .02); transition: all .15s; flex-shrink: 0;
}
.login-remember input:checked + .login-remember-mark {
  background: #6366f1; border-color: #6366f1;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
  background-size: 12px; background-position: center; background-repeat: no-repeat;
}

.login-btn {
  width: 100%; height: 52px;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-600));
  color: #fff; font-size: 16px; font-weight: 700;
  border: none; border-radius: var(--radius-md); cursor: pointer;
  transition: all var(--transition-fast); letter-spacing: 1px;
  font-family: inherit; box-shadow: 0 4px 14px rgba(99,102,241,.25);
  display: flex; align-items: center; justify-content: center; gap: var(--space-2);
}
.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: linear-gradient(135deg, var(--brand-600), var(--brand-700));
  box-shadow: 0 8px 24px rgba(99,102,241,.4);
}
.login-btn:active:not(:disabled) { transform: translateY(0); }
.login-btn:disabled { opacity: .6; cursor: not-allowed; }

.login-btn-loading {
  width: 18px; height: 18px; border: 2px solid rgba(255, 255, 255, .3);
  border-top-color: #fff; border-radius: 50%;
  animation: login-spin .6s linear infinite;
}
@keyframes login-spin { to { transform: rotate(360deg); } }

.login-error {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: #f87171; font-weight: 500;
  margin: -4px 0 0; padding: 10px 14px;
  background: rgba(248, 113, 113, .08);
  border-radius: 10px; border: 1px solid rgba(248, 113, 113, .15);
}

.login-footer {
  position: relative; z-index: 1;
  font-size: 12px; color: #475569; font-weight: 500;
}
</style>
