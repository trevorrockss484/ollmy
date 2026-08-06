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
import * as THREE from 'three'

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
      authStore.login(data.data.token, data.data.username, data.data.role, data.data.menus, rememberMe.value)
      ElMessage.success('登录成功')
      const menus = data.data.menus || []
      const menuOrder = ['/', '/plan', '/report', '/history', '/monitor', '/clock', '/assets', '/media', '/video-library', '/scripts', '/customer-stats', '/role-manage', '/user-manage', '/compress', '/video-compress']
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

// ====== Three.js 场景 ======
let scene, camera, renderer, particles, linesMesh, orb, orbGlow
let mouseX = 0, mouseY = 0
let targetMouseX = 0, targetMouseY = 0
let animationId

function initThree() {
  const canvas = threeCanvas.value
  if (!canvas) return

  const w = window.innerWidth
  const h = window.innerHeight

  // 渲染器
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // 场景 + 相机
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.z = 30

  // ====== 光粒子 ======
  const particleCount = 200
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 50
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20

    // 紫-蓝渐变
    const t = Math.random()
    colors[i * 3] = 0.35 + t * 0.25       // R
    colors[i * 3 + 1] = 0.1 + t * 0.3      // G
    colors[i * 3 + 2] = 0.6 + t * 0.4       // B

    sizes[i] = Math.random() * 0.15 + 0.03
  }

  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const particleMat = new THREE.PointsMaterial({
    size: 0.18,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.85,
  })
  particles = new THREE.Points(particleGeo, particleMat)
  scene.add(particles)

  // ====== 连线（最近邻） ======
  const linePositions = []
  const pts = Array.from({ length: particleCount }, (_, i) => new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]))
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (pts[i].distanceTo(pts[j]) < 4.5) {
        linePositions.push(pts[i].x, pts[i].y, pts[i].z)
        linePositions.push(pts[j].x, pts[j].y, pts[j].z)
      }
    }
  }
  if (linePositions.length) {
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    const lineMat = new THREE.LineBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false })
    linesMesh = new THREE.LineSegments(lineGeo, lineMat)
    scene.add(linesMesh)
  }

  // ====== 中心光球 ======
  const orbGeo = new THREE.IcosahedronGeometry(1.2, 3)
  const orbMat = new THREE.MeshBasicMaterial({
    color: 0x6366f1,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  })
  orb = new THREE.Mesh(orbGeo, orbMat)
  scene.add(orb)

  // 光球光晕
  const glowGeo = new THREE.SphereGeometry(2.5, 32, 32)
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#6366f1') } },
    vertexShader: `varying vec3 vNormal; varying vec3 vPosition; void main() { vNormal = normalize(normalMatrix * normal); vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vNormal; varying vec3 vPosition; uniform float uTime; uniform vec3 uColor; void main() { float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(uColor, intensity * 0.25); }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  orbGlow = new THREE.Mesh(glowGeo, glowMat)
  scene.add(orbGlow)

  // ====== 浮动几何体 ======
  const geos = [new THREE.OctahedronGeometry(0.5), new THREE.TetrahedronGeometry(0.4), new THREE.TorusKnotGeometry(0.3, 0.08, 64, 8)]
  for (let i = 0; i < 6; i++) {
    const geo = geos[i % 3]
    const mat = new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true, transparent: true, opacity: 0.08 + Math.random() * 0.06, depthWrite: false })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 28, (Math.random() - 0.5) * 15)
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    mesh.userData = { speed: 0.003 + Math.random() * 0.01, axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), offset: Math.random() * Math.PI * 2 }
    mesh.name = 'floater'
    scene.add(mesh)
  }

  // 事件监听
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', onResize)
  animate()
}

function onMouseMove(e) {
  targetMouseX = (e.clientX / window.innerWidth) * 2 - 1
  targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1
}

function onResize() {
  if (!camera || !renderer) return
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function animate() {
  animationId = requestAnimationFrame(animate)

  // 平滑鼠标跟随
  mouseX += (targetMouseX - mouseX) * 0.03
  mouseY += (targetMouseY - mouseY) * 0.03

  // 整体缓慢旋转
  particles.rotation.y += 0.0003
  particles.rotation.x += 0.0001
  if (linesMesh) { linesMesh.rotation.y += 0.0003; linesMesh.rotation.x += 0.0001 }

  // 光球呼吸
  const t = Date.now() * 0.001
  const scale = 1 + Math.sin(t * 0.8) * 0.15
  orb.scale.setScalar(scale)
  orb.rotation.y += 0.004
  orb.rotation.x += 0.002
  orbGlow.scale.setScalar(scale * 1.2)
  orbGlow.material.uniforms.uTime.value = t

  // 浮动几何体自转
  scene.children.forEach(child => {
    if (child.name === 'floater') {
      child.rotation.x += child.userData.speed
      child.rotation.y += child.userData.speed * 0.7
    }
  })

  // 鼠标视差
  camera.position.x += (mouseX * 3 - camera.position.x) * 0.02
  camera.position.y += (mouseY * 2 - camera.position.y) * 0.02
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)
}

function destroyThree() {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', onResize)
  if (renderer) { renderer.dispose(); renderer = null }
  if (scene) { scene.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose() } }); scene = null }
  particles = null; linesMesh = null; orb = null; orbGlow = null; camera = null
}

onMounted(() => { initThree() })
onUnmounted(() => { destroyThree() })
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
  border-radius: 24px; padding: 44px 40px 36px;
  width: 400px;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.04), 0 24px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.02);
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
  width: 100%; height: 50px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-size: 16px; font-weight: 700;
  border: none; border-radius: 14px; cursor: pointer;
  transition: all .2s; letter-spacing: 1px;
  font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, .35);
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
