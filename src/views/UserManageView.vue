<template>
  <div class="um-page">
    <div class="um-top">
      <h2><el-icon :size="22"><User /></el-icon> 用户管理</h2>
      <el-button type="primary" @click="openAdd"><el-icon :size="14"><Plus /></el-icon> 新增用户</el-button>
    </div>

    <div class="um-table-wrap">
      <div class="um-head">
        <span class="um-cell">用户名</span>
        <span class="um-cell">显示名</span>
        <span class="um-cell">角色</span>
        <span class="um-cell">状态</span>
        <span class="um-cell">操作</span>
      </div>
      <div v-for="u in users" :key="u.id" class="um-row">
        <span class="um-cell um-cell--bold">{{ u.username }}</span>
        <span class="um-cell">{{ u.displayName }}</span>
        <span class="um-cell">
          <el-tag :type="u.role === 'admin' ? 'danger' : 'info'" size="small">{{ u.role === 'admin' ? '管理员' : '同事' }}</el-tag>
        </span>
        <span class="um-cell">
          <el-tag :type="u.enabled ? 'success' : 'info'" size="small" effect="plain">{{ u.enabled ? '启用' : '禁用' }}</el-tag>
        </span>
        <span class="um-cell">
          <el-button size="small" @click="openEdit(u)">编辑</el-button>
          <el-button size="small" type="danger" @click="doDelete(u)" :disabled="users.filter(x=>x.role==='admin'&&x.enabled).length<=1&&u.role==='admin'">删除</el-button>
        </span>
      </div>
      <div v-if="!users.length" class="um-empty">暂无用户</div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑用户' : '新增用户'" width="460px" destroy-on-close>
      <el-form label-width="70px" size="default">
        <el-form-item label="用户名">
          <el-input v-model="form.username" :disabled="!!editId" placeholder="登录账号" />
        </el-form-item>
        <el-form-item label="显示名">
          <el-input v-model="form.displayName" placeholder="如：张三" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" :placeholder="editId ? '留空则不修改' : '设置密码'" show-password />
        </el-form-item>
        <el-form-item label="角色">
          <el-radio-group v-model="form.role">
            <el-radio value="admin">管理员</el-radio>
            <el-radio value="staff">同事</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">{{ editId ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api'

const users = ref([])
const dialogVisible = ref(false)
const editId = ref(null)

const defaultForm = () => ({ username: '', displayName: '', password: '', role: 'staff', enabled: true })
const form = reactive(defaultForm())

async function loadUsers() {
  const res = await api.users.list()
  if (res.success) users.value = res.data
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
  if (!form.username) { ElMessage.warning('请输入用户名'); return }
  if (!editId.value && !form.password) { ElMessage.warning('请设置密码'); return }

  if (editId.value) {
    const updates = { role: form.role, displayName: form.displayName, enabled: form.enabled }
    if (form.password) updates.password = form.password
    const res = await api.users.update(editId.value, updates)
    if (res.success) { ElMessage.success('已更新'); dialogVisible.value = false; loadUsers() }
    else ElMessage.error(res.error || '更新失败')
  } else {
    const res = await api.users.add({ username: form.username, password: form.password, role: form.role, displayName: form.displayName })
    if (res.success) { ElMessage.success('用户已创建'); dialogVisible.value = false; loadUsers() }
    else ElMessage.error(res.error || '创建失败')
  }
}

async function doDelete(u) {
  try { await ElMessageBox.confirm(`确定删除用户「${u.username}」？`, '确认删除', { type: 'warning' }) } catch { return }
  const res = await api.users.delete(u.id)
  if (res.success) { ElMessage.success('已删除'); loadUsers() }
  else ElMessage.error(res.error || '删除失败')
}

onMounted(loadUsers)
</script>

<style scoped>
.um-page { max-width: 700px; margin: 0 auto; }
.um-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.um-top h2 { font-size: 20px; font-weight: 700; }

.um-table-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
.um-head { display: grid; grid-template-columns: 1fr 1fr 100px 80px 120px; padding: 10px 18px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; gap: 8px; }
.um-row { display: grid; grid-template-columns: 1fr 1fr 100px 80px 120px; padding: 12px 18px; border-bottom: 1px solid #f3f4f6; gap: 8px; align-items: center; }
.um-row:last-of-type { border-bottom: none; }
.um-cell { font-size: 13px; color: #374151; display: flex; align-items: center; }
.um-cell--bold { font-weight: 700; }
.um-head .um-cell { font-size: 11px; font-weight: 600; color: #9ca3af; }
.um-empty { text-align: center; padding: 30px; color: #9ca3af; font-size: 13px; }
</style>
