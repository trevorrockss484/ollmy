<template>
  <div class="settings-page enterprise-page enterprise-page--form">
    <div class="s-top"><h2><el-icon :size="22"><Setting /></el-icon> 系统设置</h2></div>

    <div class="s-card">
      <div class="s-card-hd"><el-icon :size="18"><Lock /></el-icon> 安全设置</div>
      <div class="s-row">
        <div class="s-cell"><label>成本锁密码</label><span>更改后需在VPS管理页重新输入</span></div>
        <div class="s-cell-right">
          <el-input v-model="costPin" placeholder="留空则不修改" size="default" show-password style="width:200px;" />
          <el-button size="small" type="primary" @click="saveCostPin">保存</el-button>
        </div>
      </div>
    </div>

    <div class="s-card">
      <div class="s-card-hd"><el-icon :size="18"><FolderOpened /></el-icon> 数据管理</div>
      <div class="s-row">
        <div class="s-cell"><label>数据备份</label><span>每小时自动备份，位于 backup/ 目录</span></div>
        <div class="s-cell-right">
          <el-button size="small" type="primary" plain @click="triggerBackup" :loading="backingUp">立即备份</el-button>
        </div>
      </div>
      <div class="s-row">
        <div class="s-cell"><label>备份保留</label><span>最近 48 个备份文件，超出自动删除</span></div>
        <div class="s-cell-right"><el-select v-model="backupKeep" size="small" style="width:120px;" @change="saveBackupKeep"><el-option :value="24" label="24 份"/><el-option :value="48" label="48 份"/><el-option :value="72" label="72 份"/></el-select></div>
      </div>
    </div>

    <div class="s-card">
      <div class="s-card-hd"><el-icon :size="18"><Notebook /></el-icon> 日志管理</div>
      <div class="s-row">
        <div class="s-cell"><label>日志保留天数</label><span>超过天数的日志自动清理</span></div>
        <div class="s-cell-right"><el-input-number v-model="logRetention" :min="7" :max="90" size="small" style="width:120px;" @change="saveLogRetention"/> <span class="s-unit">天</span></div>
      </div>
    </div>

    <div class="s-card">
      <div class="s-card-hd"><el-icon :size="18"><InfoFilled /></el-icon> 系统信息 <el-button size="small" @click="loadHealth" :loading="loadingHealth" style="margin-left:auto;">刷新</el-button></div>
      <div class="s-info-grid">
        <div><label>版本</label><b>Pan 助手 v{{ health.version || '3.0' }}</b></div>
        <div><label>Node.js</label><b>{{ health.nodeVersion || '—' }}</b></div>
        <div><label>运行时间</label><b>{{ formatUptime(health.uptime) }}</b></div>
        <div><label>内存使用</label><b>{{ health.memory || '—' }}</b></div>
        <div><label>数据文件大小</label><b>{{ health.dataSize || '—' }}</b></div>
        <div><label>备份文件数</label><b>{{ health.backups ?? '—' }}</b></div>
        <div><label>日志文件数</label><b>{{ health.logFiles ?? '—' }}</b></div>
        <div><label>平台</label><b>{{ health.platform || '—' }}</b></div>
      </div>
    </div>

    <p v-if="saveMsg" class="s-msg" :class="{ok:saveOk,err:!saveOk}">{{ saveMsg }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const costPin = ref('')
const backingUp = ref(false)
const backupKeep = ref(48)
const logRetention = ref(30)
const saveMsg = ref('')
const saveOk = ref(true)
const health = ref({})
const loadingHealth = ref(false)

function showMsg(msg, ok=true) { saveMsg.value=msg; saveOk.value=ok; setTimeout(()=>{if(saveMsg.value===msg)saveMsg.value=''},3000) }

function formatUptime(s) { if (!s) return '—'; const h=Math.floor(s/3600), m=Math.floor(s%3600/60); return h>0 ? h+'h '+m+'m' : m+'m' }

async function loadHealth() {
  loadingHealth.value = true
  try {
    const res = await fetch('/api/system/health', { headers:{'X-Auth-Token':localStorage.getItem('pan_token')||''} })
    if (res.ok) { const d = await res.json(); if (d.success) health.value = d.data }
  } catch {}
  loadingHealth.value = false
}

async function saveCostPin() {
  if (!costPin.value) return showMsg('密码不能为空', false)
  try {
    const res = await fetch('/api/auth/update-cost-pin', { method:'PUT', headers:{'Content-Type':'application/json','X-Auth-Token':localStorage.getItem('pan_token')||''}, body:JSON.stringify({pin:costPin.value}) })
    if (res.ok) showMsg('成本锁密码已更新')
    else showMsg('保存失败', false)
  } catch { showMsg('网络错误', false) }
}

async function triggerBackup() {
  backingUp.value = true
  try {
    const res = await fetch('/api/system/backup', { method:'POST', headers:{'X-Auth-Token':localStorage.getItem('pan_token')||''} })
    if (res.ok) showMsg('备份完成')
    else showMsg('备份失败', false)
  } catch { showMsg('网络错误', false) }
  backingUp.value = false
}

function saveBackupKeep() { localStorage.setItem('sys_backupKeep', String(backupKeep.value)); showMsg('已保存') }
function saveLogRetention() { localStorage.setItem('sys_logRetention', String(logRetention.value)); showMsg('已保存') }

onMounted(() => {
  backupKeep.value = parseInt(localStorage.getItem('sys_backupKeep')||'48')
  logRetention.value = parseInt(localStorage.getItem('sys_logRetention')||'30')
  loadHealth()
})
</script>

<style scoped>
.settings-page { max-width:760px; margin:0 auto; min-height:100%; display:flex; flex-direction:column; }
.s-top { margin-bottom:20px; }
.s-top h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; }

.s-card { background:var(--surface-card); border:1px solid var(--border-default); border-radius:14px; padding:20px 24px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.s-card-hd { font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:16px; display:flex; align-items:center; gap:8px; }
.s-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 0; border-bottom:1px solid var(--border-default); }
.s-row:last-child { border-bottom:none; }
.s-cell { min-width:0; }
.s-cell label { display:block; font-size:14px; font-weight:600; color:var(--text-primary); }
.s-cell span { font-size:11px; color:var(--text-tertiary); }
.s-cell-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.s-unit { font-size:12px; color:var(--text-tertiary); }

.s-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.s-info-grid div { padding:8px 12px; background:var(--surface-hover); border-radius:8px; }
.s-info-grid label { display:block; font-size:11px; color:var(--text-tertiary); margin-bottom:2px; }
.s-info-grid b { font-size:13px; color:var(--text-primary); }

.s-msg { text-align:center; font-size:13px; font-weight:600; padding:8px; }
.s-msg.ok { color:#059669; }
.s-msg.err { color:#ef4444; }
</style>
