<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="login-bg">
      <div class="login-bg-shape login-bg-shape--1"></div>
      <div class="login-bg-shape login-bg-shape--2"></div>
      <div class="login-bg-shape login-bg-shape--3"></div>
    </div>

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
          <input
            v-model="form.username"
            type="text"
            placeholder="用户名"
            class="login-input"
            autocomplete="username"
            @keyup.enter="$refs.pwdInput?.focus()"
          />
        </div>

        <div class="login-field">
          <span class="login-field-icon"><el-icon :size="18"><Lock /></el-icon></span>
          <input
            ref="pwdInput"
            v-model="form.password"
            :type="showPwd ? 'text' : 'password'"
            placeholder="密码"
            class="login-input"
            autocomplete="current-password"
            @keyup.enter="doLogin"
          />
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
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const error = ref('')
const showPwd = ref(false)
const form = reactive({ username: '', password: '' })
const rememberMe = ref(false)
const pwdInput = ref(null)

if (authStore.rememberMe) {
  form.username = authStore.username || ''
  rememberMe.value = true
}

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
      window.location.href = '/'
    } else {
      error.value = data.error || '登录失败'
    }
  } catch (e) {
    error.value = '网络错误，请重试'
  }
  loading.value = false
}
</script>

<style scoped>
.login-page {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 24px;
  background: #0f0f1a; position: relative; overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* ====== 背景装饰 ====== */
.login-bg { position: absolute; inset: 0; pointer-events: none; }
.login-bg-shape {
  position: absolute; border-radius: 50%;
  filter: blur(80px); opacity: .25;
}
.login-bg-shape--1 {
  width: 500px; height: 500px; background: #6366f1;
  top: -150px; right: -100px;
}
.login-bg-shape--2 {
  width: 400px; height: 400px; background: #8b5cf6;
  bottom: -100px; left: -80px; opacity: .18;
}
.login-bg-shape--3 {
  width: 300px; height: 300px; background: #a78bfa;
  top: 40%; left: 50%; transform: translate(-50%, -50%); opacity: .12;
}

/* ====== 卡片 ====== */
.login-card {
  position: relative; z-index: 1;
  background: rgba(255,255,255,.03);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 24px; padding: 44px 40px 36px;
  width: 400px;
  box-shadow: 0 0 0 1px rgba(255,255,255,.03), 0 24px 80px rgba(0,0,0,.4);
}

/* ====== 品牌 ====== */
.login-brand {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 36px;
}
.login-logo {
  font-size: 44px; line-height: 1;
  filter: drop-shadow(0 4px 12px rgba(99,102,241,.4));
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

/* 输入字段 */
.login-field {
  position: relative; display: flex; align-items: center;
}
.login-field-icon {
  position: absolute; left: 16px; color: #64748b;
  display: flex; align-items: center; pointer-events: none;
  z-index: 1;
}
.login-field-suf {
  position: absolute; right: 14px; color: #64748b;
  cursor: pointer; display: flex; align-items: center;
  transition: color .15s;
}
.login-field-suf:hover { color: #94a3b8; }

.login-input {
  width: 100%; height: 50px;
  padding: 0 44px 0 46px;
  background: rgba(255,255,255,.04);
  border: 1.5px solid rgba(255,255,255,.08);
  border-radius: 14px;
  font-size: 15px; font-weight: 500; color: #e2e8f0;
  outline: none; transition: all .2s;
  font-family: inherit;
}
.login-input::placeholder { color: #475569; }
.login-input:focus {
  border-color: #6366f1;
  background: rgba(99,102,241,.06);
  box-shadow: 0 0 0 3px rgba(99,102,241,.1);
}

/* 记住账号 */
.login-remember {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; color: #94a3b8; cursor: pointer;
  user-select: none; padding: 2px 0;
}
.login-remember input[type="checkbox"] {
  display: none;
}
.login-remember-mark {
  width: 18px; height: 18px; border-radius: 5px;
  border: 2px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.02);
  transition: all .15s; flex-shrink: 0;
}
.login-remember input:checked + .login-remember-mark {
  background: #6366f1; border-color: #6366f1;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
  background-size: 12px; background-position: center; background-repeat: no-repeat;
}

/* 登录按钮 */
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
  box-shadow: 0 8px 24px rgba(99,102,241,.35);
}
.login-btn:active:not(:disabled) { transform: translateY(0); }
.login-btn:disabled { opacity: .6; cursor: not-allowed; }

.login-btn-loading {
  width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff; border-radius: 50%;
  animation: login-spin .6s linear infinite;
}
@keyframes login-spin { to { transform: rotate(360deg); } }

/* 错误 */
.login-error {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: #f87171; font-weight: 500;
  margin: -4px 0 0; padding: 10px 14px;
  background: rgba(248,113,113,.08);
  border-radius: 10px; border: 1px solid rgba(248,113,113,.15);
}

/* Footer */
.login-footer {
  position: relative; z-index: 1;
  font-size: 12px; color: #475569; font-weight: 500;
}
</style>
