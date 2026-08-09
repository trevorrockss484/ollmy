<template>
  <div class="um-page enterprise-page enterprise-page--form">
    <div class="um-top">
      <h2><el-icon :size="22"><User /></el-icon> 用户管理</h2>
      <el-button type="primary" @click="openAdd"><el-icon :size="14"><Plus /></el-icon> 新增用户</el-button>
    </div>

    <div class="um-cards" v-if="users.length">
      <div v-for="u in users" :key="u.id" class="um-card" :class="{ disabled: !u.enabled }">
        <div class="umc-left">
          <div class="umc-avatar" :class="{ admin: u.role === 'admin', disabled: !u.enabled }">
            {{ (u.displayName || u.username).charAt(0) }}
          </div>
          <div class="umc-info">
            <div class="umc-name">{{ u.displayName || u.username }}</div>
            <div class="umc-username">@{{ u.username }}</div>
          </div>
        </div>
        <div class="umc-meta">
          <el-tag :type="u.role === 'admin' ? 'danger' : ''" size="small" effect="plain" round>
            {{ roleLabel(u.role) }}
          </el-tag>
          <el-tag :type="u.enabled ? 'success' : 'info'" size="small" effect="plain" round>
            {{ u.enabled ? '启用' : '禁用' }}
          </el-tag>
        </div>
        <div class="umc-actions">
          <el-button size="small" round @click="openEdit(u)"><el-icon :size="13"><Edit /></el-icon> 编辑</el-button>
          <el-button size="small" round type="danger" plain @click="doDelete(u)"
            :disabled="users.filter(x=>x.role==='admin'&&x.enabled).length<=1 && u.role==='admin'">
            <el-icon :size="13"><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
    <div v-else class="um-empty">暂无用户，点击右上角「新增用户」创建</div>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑用户' : '新增用户'" width="480px" destroy-on-close :close-on-click-modal="false">
      <div class="dlg-body">
        <div class="dlg-section">
          <div class="dlg-sec-title">基础信息</div>
          <div class="dlg-field">
            <label>用户名 <span class="dlg-required">*</span></label>
            <el-input v-model="form.username" :disabled="!!editId" placeholder="登录账号" size="large" />
            <span class="dlg-hint" v-if="!editId">保存后不可修改</span>
          </div>
          <div class="dlg-field" style="margin-top:14px;">
            <label>显示名称</label>
            <el-input v-model="form.displayName" placeholder="如：张三" size="large" />
          </div>
        </div>

        <div class="dlg-section">
          <div class="dlg-sec-title">安全设置</div>
          <div class="dlg-field">
            <label>密码 <span class="dlg-required" v-if="!editId">*</span></label>
            <el-input v-model="form.password" type="password" :placeholder="editId ? '留空则不修改密码' : '设置登录密码'" show-password size="large" />
          </div>
        </div>

        <div class="dlg-section">
          <div class="dlg-sec-title">权限设置</div>
          <div class="dlg-field">
            <label>角色</label>
            <el-select v-model="form.role" placeholder="选择角色" style="width:100%" size="large">
              <el-option v-for="r in roleList" :key="r.name" :label="r.displayName" :value="r.name">
                <span>{{ r.displayName }}</span>
                <span style="float:right;color:#9ca3af;font-size:11px;">@{{ r.name }}</span>
              </el-option>
            </el-select>
          </div>
        </div>

        <div class="dlg-section dlg-section--status">
          <div class="dlg-sec-title">状态</div>
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" size="large" />
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false" size="large">取消</el-button>
        <el-button type="primary" @click="saveUser" size="large">{{ editId ? '保存修改' : '创建用户' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api'

const users = ref([])
const roleList = ref([])
const dialogVisible = ref(false)
const editId = ref(null)

const defaultForm = () => ({ username: '', displayName: '', password: '', role: 'staff', enabled: true })
const form = reactive(defaultForm())

function roleLabel(name) {
  const r = roleList.value.find(x => x.name === name)
  return r ? r.displayName : name
}

async function loadUsers() {
  const [uRes, rRes] = await Promise.all([api.users.list(), api.roles.list()])
  if (uRes.success) users.value = uRes.data
  if (rRes.success) roleList.value = rRes.data.filter(r => r.enabled)
}

function openAdd() {
  editId.value = null
  Object.assign(form, defaultForm())
  dialogVisible.value = true
}

function openEdit(u) {
  editId.value = u.id
  form.username = u.username
  form.displayName = u.displayName || ''
  form.password = ''
  form.role = u.role
  form.enabled = u.enabled
  dialogVisible.value = true
}

async function saveUser() {
  if (!form.username.trim()) { ElMessage.warning('请输入用户名'); return }
  if (!editId.value && !form.password) { ElMessage.warning('请设置密码'); return }

  if (editId.value) {
    const updates = { role: form.role, displayName: form.displayName.trim(), enabled: form.enabled }
    if (form.password) updates.password = form.password
    const res = await api.users.update(editId.value, updates)
    if (res.success) { ElMessage.success('已更新'); dialogVisible.value = false; loadUsers() }
    else ElMessage.error(res.error || '更新失败')
  } else {
    const res = await api.users.add({ username: form.username.trim(), password: form.password, role: form.role, displayName: form.displayName.trim() })
    if (res.success) { ElMessage.success('用户已创建'); dialogVisible.value = false; loadUsers() }
    else ElMessage.error(res.error || '创建失败')
  }
}

async function doDelete(u) {
  try { await ElMessageBox.confirm(`确定删除用户「${u.displayName || u.username}」？`, '确认删除', { type: 'warning' }) } catch { return }
  const res = await api.users.delete(u.id)
  if (res.success) { ElMessage.success('已删除'); loadUsers() }
  else ElMessage.error(res.error || '删除失败')
}

onMounted(loadUsers)
</script>

<style scoped>
.um-page { }
.um-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.um-top h2 { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px; }

/* ====== 卡片列表 ====== */
.um-cards { display: flex; flex-direction: column; gap: 10px; }
.um-card {
  display: flex; align-items: center; gap: 16px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 16px 20px;
  transition: all .15s;
}
.um-card:hover { border-color: #c7d2fe; box-shadow: 0 2px 8px rgba(99,102,241,.06); }
.um-card.disabled { opacity: .55; }

.umc-left { display: flex; align-items: center; gap: 14px; min-width: 180px; }
.umc-avatar {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff; font-size: 17px; font-weight: 800;
  flex-shrink: 0; letter-spacing: -.5px;
}
.umc-avatar.admin { background: linear-gradient(135deg, #ef4444, #f87171); }
.umc-avatar.disabled { background: #d1d5db; }

.umc-info { min-width: 0; }
.umc-name { font-size: 15px; font-weight: 700; color: #1f2937; }
.umc-username { font-size: 11px; color: #9ca3af; font-family: monospace; margin-top: 1px; }

.umc-meta { display: flex; gap: 6px; flex-shrink: 0; }

.umc-actions { display: flex; gap: 6px; flex-shrink: 0; }

.um-empty { text-align: center; padding: 60px 20px; color: #9ca3af; font-size: 14px; background: #fff; border: 1px dashed #e5e7eb; border-radius: 14px; }

/* ====== 弹窗 ====== */
.dlg-body { display: flex; flex-direction: column; gap: 20px; }
.dlg-section { }
.dlg-sec-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 10px; }
.dlg-field { display: flex; flex-direction: column; gap: 4px; }
.dlg-field label { font-size: 12px; font-weight: 600; color: #6b7280; }
.dlg-required { color: #ef4444; }
.dlg-hint { font-size: 11px; color: #9ca3af; }
.dlg-section--status { display: flex; align-items: center; gap: 20px; }
.dlg-section--status .dlg-sec-title { margin-bottom: 0; }

@media (max-width: 540px) {
  .um-card { flex-wrap: wrap; }
  .umc-actions { width: 100%; justify-content: flex-end; }
}
</style>
