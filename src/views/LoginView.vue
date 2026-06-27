<template>
 <div class="login-page">
 <div class="login-card">
 <div class="login-logo">🐼</div>
 <h1 class="login-title">Pan助手</h1>

 <el-form :model="form" size="large" class="login-form" @submit.prevent="doLogin">
 <el-form-item>
 <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" />
 </el-form-item>
 <el-form-item>
 <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password @keyup.enter="doLogin" />
 </el-form-item>
 <el-form-item>
 <el-checkbox v-model="rememberMe">记住密码</el-checkbox>
 </el-form-item>
 <el-form-item>
 <el-button type="primary" @click="doLogin" :loading="loading" style="width:100%;">
 登录
 </el-button>
 </el-form-item>
 </el-form>

 <p v-if="error" class="login-error">{{ error }}</p>
 </div>
 </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const error = ref('')
const form = reactive({ username: '', password: '' })
const rememberMe = ref(false)

// 自动填充已存账号密码
if (authStore.rememberMe) {
 form.username = authStore.username || ''
 form.password = authStore.password || ''
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
 authStore.login(data.data.token, data.data.username, form.password, rememberMe.value)
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
 background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
 background: #fff; border-radius: 20px; padding: 48px 40px;
 width: 380px; text-align: center;
 box-shadow: 0 20px 60px rgba(0,0,0,.15);
}
.login-logo { font-size: 48px; margin-bottom: 12px; }
.login-title { font-size: 24px; font-weight: 800; color: #1f2937; }
.login-sub { font-size: 13px; color: #9ca3af; margin-bottom: 32px; }
.login-form { text-align: left; }
.login-error { color: #ef4444; font-size: 13px; margin-top: -8px; }
</style>
