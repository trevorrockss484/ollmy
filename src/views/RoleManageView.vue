<template>
  <div class="rm-page">
    <div class="rm-top">
      <h2><el-icon :size="22"><Key /></el-icon> 角色管理</h2>
      <el-button type="primary" @click="openAdd"><el-icon :size="14"><Plus /></el-icon> 新增角色</el-button>
    </div>

    <div class="rm-table-wrap">
      <div class="rm-head">
        <span class="rm-cell">角色名</span>
        <span class="rm-cell">标识</span>
        <span class="rm-cell rm-cell--menus">菜单权限</span>
        <span class="rm-cell">状态</span>
        <span class="rm-cell">操作</span>
      </div>
      <div v-for="r in roles" :key="r.id" class="rm-row">
        <span class="rm-cell rm-cell--bold">{{ r.displayName }}</span>
        <span class="rm-cell rm-cell--code">{{ r.name }}</span>
        <span class="rm-cell rm-cell--menus">
          <el-tag v-for="m in r.menus" :key="m" size="small" effect="plain" style="margin:1px 3px 1px 0;">{{ menuLabels[m] || m }}</el-tag>
          <span v-if="!r.menus.length" style="color:#d1d5db;">—</span>
        </span>
        <span class="rm-cell">
          <el-tag :type="r.enabled ? 'success' : 'info'" size="small" effect="plain">{{ r.enabled ? '启用' : '禁用' }}</el-tag>
        </span>
        <span class="rm-cell">
          <el-button size="small" @click="openEdit(r)">编辑</el-button>
          <el-button size="small" type="danger" @click="doDelete(r)" :disabled="r.name==='admin'">删除</el-button>
        </span>
      </div>
      <div v-if="!roles.length" class="rm-empty">暂无角色</div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑角色' : '新增角色'" width="550px" destroy-on-close>
      <el-form label-width="80px" size="default">
        <el-form-item label="标识">
          <el-input v-model="form.name" :disabled="!!editId" placeholder="英文标识，如：sales" />
        </el-form-item>
        <el-form-item label="显示名">
          <el-input v-model="form.displayName" placeholder="如：销售主管" />
        </el-form-item>
        <el-form-item label="菜单权限">
          <el-checkbox-group v-model="form.menus" class="menu-check-grid">
            <el-checkbox v-for="m in allMenus" :key="m.path" :value="m.path" :label="m.label" />
          </el-checkbox-group>
          <el-button size="small" text type="primary" @click="form.menus = allMenus.map(m=>m.path)">全选</el-button>
          <el-button size="small" text @click="form.menus = []">全不选</el-button>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRole">{{ editId ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api'

const allMenus = [
  { path: '/', label: '仪表盘' },
  { path: '/plan', label: '周计划' },
  { path: '/report', label: '日报生成' },
  { path: '/history', label: '数据查询' },
  { path: '/monitor', label: '监控中心' },
  { path: '/clock', label: '世界时钟' },
  { path: '/assets', label: 'AI资产管理' },
  { path: '/media', label: '图片素材库' },
  { path: '/video-library', label: '视频素材库' },
  { path: '/scripts', label: '话术库' },
  { path: '/compress', label: '图片压缩' },
  { path: '/video-compress', label: '视频压缩' },
  { path: '/customer-stats', label: '客户统计' },
  { path: '/user-manage', label: '用户管理' },
  { path: '/role-manage', label: '角色管理' },
]

const menuLabels = {}
for (const m of allMenus) menuLabels[m.path] = m.label

const roles = ref([])
const dialogVisible = ref(false)
const editId = ref(null)

const defaultForm = () => ({ name: '', displayName: '', menus: [], enabled: true })
const form = reactive(defaultForm())

async function loadRoles() {
  const res = await api.roles.list()
  if (res.success) roles.value = res.data
}

function openAdd() {
  editId.value = null
  Object.assign(form, defaultForm())
  dialogVisible.value = true
}

function openEdit(r) {
  editId.value = r.id
  form.name = r.name
  form.displayName = r.displayName || ''
  form.menus = [...(r.menus || [])]
  form.enabled = r.enabled
  dialogVisible.value = true
}

async function saveRole() {
  if (!form.name) { ElMessage.warning('请输入角色标识'); return }
  if (editId.value) {
    const res = await api.roles.update(editId.value, { displayName: form.displayName, menus: form.menus, enabled: form.enabled })
    if (res.success) { ElMessage.success('已更新'); dialogVisible.value = false; loadRoles() }
    else ElMessage.error(res.error || '更新失败')
  } else {
    const res = await api.roles.add({ name: form.name, displayName: form.displayName, menus: form.menus })
    if (res.success) { ElMessage.success('角色已创建'); dialogVisible.value = false; loadRoles() }
    else ElMessage.error(res.error || '创建失败')
  }
}

async function doDelete(r) {
  try { await ElMessageBox.confirm(`确定删除角色「${r.displayName}」？`, '确认删除', { type: 'warning' }) } catch { return }
  const res = await api.roles.delete(r.id)
  if (res.success) { ElMessage.success('已删除'); loadRoles() }
  else ElMessage.error(res.error || '删除失败')
}

onMounted(loadRoles)
</script>

<style scoped>
.rm-page { max-width: 800px; margin: 0 auto; }
.rm-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.rm-top h2 { font-size: 20px; font-weight: 700; }
.rm-table-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
.rm-head { display: grid; grid-template-columns: 100px 120px 1fr 70px 100px; padding: 10px 18px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; gap: 8px; }
.rm-row { display: grid; grid-template-columns: 100px 120px 1fr 70px 100px; padding: 12px 18px; border-bottom: 1px solid #f3f4f6; gap: 8px; align-items: center; }
.rm-row:last-of-type { border-bottom: none; }
.rm-cell { font-size: 13px; color: #374151; display: flex; align-items: center; flex-wrap: wrap; }
.rm-cell--bold { font-weight: 700; }
.rm-cell--code { font-size: 11px; color: #9ca3af; font-family: monospace; }
.rm-head .rm-cell { font-size: 11px; font-weight: 600; color: #9ca3af; }
.rm-empty { text-align: center; padding: 30px; color: #9ca3af; font-size: 13px; }
.menu-check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 100%; margin-bottom: 6px; }
</style>
