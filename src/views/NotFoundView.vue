<template>
  <div class="nf-page">
    <div class="nf-card">
      <div class="nf-code">404</div>
      <h1>页面不存在</h1>
      <p>您访问的页面可能已被移动、删除或暂时不可用</p>
      <div class="nf-actions">
        <el-button size="large" type="primary" round @click="goHome">返回首页</el-button>
        <el-button size="large" round @click="goBack">返回上页</el-button>
      </div>
      <div class="nf-hint">按 <kbd>?</kbd> 查看快捷键</div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const r = useRouter()
function goHome() { r.push('/') }
function goBack() { r.go(-1) }
</script>

<style scoped>
.nf-page { min-height:100%; display:flex; align-items:center; justify-content:center; }
.nf-card { text-align:center; padding:60px 40px; max-width:480px; }
.nf-code { font-size:120px; font-weight:900; line-height:1; background:linear-gradient(135deg,var(--brand-400),var(--brand-600)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:-4px; }
.nf-card h1 { font-size:24px; font-weight:800; color:var(--text-primary); margin:16px 0 8px; }
.nf-card p { font-size:14px; color:var(--text-tertiary); line-height:1.6; margin-bottom:24px; }
.nf-actions { display:flex; gap:12px; justify-content:center; }
.nf-hint { margin-top:32px; font-size:12px; color:var(--text-tertiary); }
.nf-hint kbd { display:inline-block; padding:2px 8px; border:1px solid var(--border-default); border-radius:4px; font-family:monospace; font-size:12px; background:var(--surface-hover); }
</style>
