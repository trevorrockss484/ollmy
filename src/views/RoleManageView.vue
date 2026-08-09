<template>
  <div class="rm-page enterprise-page enterprise-page--form">
    <div class="rm-top">
      <h2><el-icon :size="22"><Key /></el-icon> 角色管理</h2>
      <el-button type="primary" @click="openAdd"><el-icon :size="14"><Plus /></el-icon> 新增角色</el-button>
    </div>

    <!-- 角色卡片列表 -->
    <div class="rm-cards" v-if="roles.length">
      <div v-for="r in roles" :key="r.id" class="rm-card" :class="{ disabled: !r.enabled }">
        <div class="rmc-left">
          <div class="rmc-avatar" :class="{ admin: r.name === 'admin', disabled: !r.enabled }">
            <el-icon :size="18"><Key v-if="r.name==='admin'" /><User v-else /></el-icon>
          </div>
          <div class="rmc-info">
            <div class="rmc-title">
              {{ r.displayName }}
              <el-tag :type="r.enabled?'success':'info'" size="small" effect="plain" round>{{ r.enabled ? '启用' : '禁用' }}</el-tag>
            </div>
            <div class="rmc-code">@{{ r.name }}</div>
          </div>
        </div>
        <div class="rmc-menus">
          <el-popover placement="bottom" :width="320" trigger="hover" :show-after="300">
            <template #reference>
              <el-tag v-for="m in r.menus.slice(0, 4)" :key="m" size="small" effect="plain" type="info">{{ menuLabels[m] || m }}</el-tag>
              <el-tag v-if="r.menus.length > 4" size="small" effect="plain" type="info">+{{ r.menus.length - 4 }} 项</el-tag>
              <span v-if="!r.menus.length" class="rmc-empty-tip">无权限</span>
            </template>
            <div class="rmc-menu-pop">
              <el-tag v-for="m in r.menus" :key="m" size="small" style="margin:2px 4px 2px 0;">{{ menuLabels[m] || m }}</el-tag>
            </div>
          </el-popover>
        </div>
        <div class="rmc-actions">
          <el-button size="small" round @click="openEdit(r)"><el-icon :size="13"><Edit /></el-icon> 编辑</el-button>
          <el-button size="small" round type="danger" plain @click="doDelete(r)" :disabled="r.name==='admin'">
            <el-icon :size="13"><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
    <div v-else class="rm-empty">暂无角色，点击右上角「新增角色」创建</div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑角色' : '新增角色'" width="600px" destroy-on-close :close-on-click-modal="false">
      <div class="dlg-body">
        <!-- 基础信息 -->
        <div class="dlg-section">
          <div class="dlg-sec-title">基础信息</div>
          <div class="dlg-row">
            <div class="dlg-field">
              <label>角色标识 <span class="dlg-required">*</span></label>
              <el-input v-model="form.name" :disabled="!!editId" placeholder="英文，如：sales-manager" size="large" />
              <span class="dlg-hint" v-if="!editId">保存后不可修改</span>
            </div>
            <div class="dlg-field">
              <label>显示名称 <span class="dlg-required">*</span></label>
              <el-input v-model="form.displayName" placeholder="如：销售主管" size="large" />
            </div>
          </div>
        </div>

        <!-- 菜单权限 -->
        <div class="dlg-section">
          <div class="dlg-sec-title">
            菜单权限
            <span class="dlg-sec-extra">{{ form.menus.length }} / {{ allMenus.length }} 项</span>
          </div>
          <div class="dlg-menu-grid">
            <div v-for="group in menuGroups" :key="group.label" class="dlg-menu-group">
              <div class="dlg-mg-label">{{ group.label }}</div>
              <div class="dlg-mg-items">
                <label v-for="m in group.items" :key="m.path" class="dlg-mg-item" :class="{ checked: form.menus.includes(m.path) }">
                  <el-checkbox :model-value="form.menus.includes(m.path)" @change="toggleMenu(m.path)" :label="m.label" />
                </label>
              </div>
            </div>
          </div>
          <div class="dlg-menu-actions">
            <el-button size="small" @click="form.menus = allMenus.map(m=>m.path)">全选</el-button>
            <el-button size="small" @click="form.menus = []">清空</el-button>
          </div>
        </div>

        <!-- 状态 -->
        <div class="dlg-section dlg-section--status">
          <div class="dlg-sec-title">状态</div>
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" size="large" />
        </div>

        <!-- 同时创建用户（仅新增时） -->
        <div class="dlg-section" v-if="!editId">
          <div class="dlg-sec-title" style="cursor:pointer;user-select:none;" @click="createUser = !createUser">
            <el-icon :size="14" style="transition:transform .2s;" :style="{ transform: createUser ? 'rotate(90deg)' : '' }"><ArrowRight /></el-icon>
            同时创建登录账号
            <el-tag size="small" type="warning" effect="plain" round>可选</el-tag>
          </div>
          <div v-if="createUser" class="dlg-user-fields">
            <div class="dlg-row">
              <div class="dlg-field">
                <label>登录账号 <span class="dlg-required">*</span></label>
                <el-input v-model="form.userUsername" placeholder="如：zhangsan" size="large" />
              </div>
              <div class="dlg-field">
                <label>显示名称</label>
                <el-input v-model="form.userDisplayName" :placeholder="form.displayName || '如：张三'" size="large" />
              </div>
            </div>
            <div class="dlg-field" style="margin-top:12px;">
              <label>登录密码 <span class="dlg-required">*</span></label>
              <el-input v-model="form.userPassword" type="password" placeholder="设置密码" show-password size="large" />
            </div>
            <div class="dlg-user-note">
              <el-icon :size="13"><InfoFilled /></el-icon>
              创建后将自动分配此角色，用户可立即登录
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false" size="large">取消</el-button>
        <el-button type="primary" @click="saveRole" size="large">{{ editId ? '保存修改' : '创建角色' }}</el-button>
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
  { path: '/assets', label: 'AI资产管理' },
  { path: '/media', label: '图片素材库' },
  { path: '/video-library', label: '视频素材库' },

  { path: '/compress', label: '图片压缩' },
  { path: '/video-compress', label: '视频压缩' },
  { path: '/customer-stats', label: '客户统计' },
  { path: '/logs', label: '操作日志' },
  { path: '/settings', label: '系统设置' },
  { path: '/user-manage', label: '用户管理' },
  { path: '/role-manage', label: '角色管理' },
]

const menuGroups = [
  { label: '数据 & 报表', items: allMenus.filter(m => ['/', '/plan', '/report', '/history', '/customer-stats'].includes(m.path)) },
  { label: '工具 & 监控', items: allMenus.filter(m => ['/monitor', '/compress', '/video-compress'].includes(m.path)) },
  { label: '资产管理', items: allMenus.filter(m => ['/assets', '/media', '/video-library'].includes(m.path)) },
  { label: '系统管理', items: allMenus.filter(m => ['/logs', '/settings', '/user-manage', '/role-manage'].includes(m.path)) },
]

const menuLabels = {}
for (const m of allMenus) menuLabels[m.path] = m.label

const roles = ref([])
const dialogVisible = ref(false)
const editId = ref(null)
const createUser = ref(false)

const defaultForm = () => ({ name: '', displayName: '', menus: [], enabled: true, userUsername: '', userDisplayName: '', userPassword: '' })
const form = reactive(defaultForm())

function toggleMenu(path) {
  const idx = form.menus.indexOf(path)
  if (idx >= 0) form.menus.splice(idx, 1)
  else form.menus.push(path)
}

async function loadRoles() {
  const res = await api.roles.list()
  if (res.success) roles.value = res.data
}

function openAdd() {
  editId.value = null
  createUser.value = false
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
  if (!form.name.trim()) { ElMessage.warning('请输入角色标识'); return }
  if (!form.displayName.trim()) { ElMessage.warning('请输入显示名称'); return }

  // 验证用户字段
  if (!editId.value && createUser.value) {
    if (!form.userUsername.trim()) { ElMessage.warning('请输入登录账号'); return }
    if (!form.userPassword) { ElMessage.warning('请设置登录密码'); return }
  }

  if (editId.value) {
    const res = await api.roles.update(editId.value, { displayName: form.displayName.trim(), menus: form.menus, enabled: form.enabled })
    if (res.success) { ElMessage.success('角色已更新'); dialogVisible.value = false; loadRoles() }
    else ElMessage.error(res.error || '更新失败')
  } else {
    const res = await api.roles.add({ name: form.name.trim(), displayName: form.displayName.trim(), menus: form.menus })
    if (res.success) {
      // 同时创建用户
      if (createUser.value) {
        const uRes = await api.users.add({
          username: form.userUsername.trim(),
          password: form.userPassword,
          role: form.name.trim(),
          displayName: form.userDisplayName.trim() || form.displayName.trim()
        })
        if (uRes.success) {
          ElMessage.success(`角色「${form.displayName.trim()}」已创建，用户「${form.userUsername.trim()}」已创建`)
        } else {
          ElMessage.warning(`角色已创建，但用户创建失败：${uRes.error || '未知错误'}`)
        }
      } else {
        ElMessage.success('角色已创建')
      }
      dialogVisible.value = false
      loadRoles()
    } else {
      ElMessage.error(res.error || '创建失败')
    }
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
.rm-page { }
.rm-top h2 { font-size:var(--text-2xl); font-weight:800; display:flex; align-items:center; gap:var(--space-3); color:var(--text-primary); letter-spacing:-.3px; }
.rm-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.rm-top h2 { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px; }

/* ====== 卡片列表 ====== */
.rm-cards { display: flex; flex-direction: column; gap: 10px; }
.rm-card {
  display: flex; align-items: center; gap: 16px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 16px 20px;
  transition: all .15s;
}
.rm-card:hover { border-color: #c7d2fe; box-shadow: 0 2px 8px rgba(99,102,241,.06); }
.rm-card.disabled { opacity: .55; }

.rmc-left { display: flex; align-items: center; gap: 14px; min-width: 180px; }
.rmc-avatar {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: #eef2ff; color: #6366f1; flex-shrink: 0;
}
.rmc-avatar.admin { background: #fef2f2; color: #ef4444; }
.rmc-avatar.disabled { background: #f3f4f6; color: #9ca3af; }

.rmc-info { min-width: 0; }
.rmc-title { font-size: 15px; font-weight: 700; color: #1f2937; display: flex; align-items: center; gap: 8px; }
.rmc-code { font-size: 11px; color: #9ca3af; font-family: monospace; margin-top: 2px; }

.rmc-menus { flex: 1; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; min-width: 0; }
.rmc-menu-pop { max-height: 200px; overflow-y: auto; }
.rmc-empty-tip { font-size: 12px; color: #d1d5db; }

.rmc-actions { display: flex; gap: 6px; flex-shrink: 0; }

.rm-empty { text-align: center; padding: 60px 20px; color: #9ca3af; font-size: 14px; background: #fff; border: 1px dashed #e5e7eb; border-radius: 14px; }

/* ====== 弹窗 ====== */
.dlg-body { display: flex; flex-direction: column; gap: 24px; }
.dlg-section { }
.dlg-sec-title {
  font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 12px;
  display: flex; align-items: center; gap: 8px;
}
.dlg-sec-extra { font-size: 11px; color: #9ca3af; font-weight: 500; }
.dlg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.dlg-field { display: flex; flex-direction: column; gap: 4px; }
.dlg-field label { font-size: 12px; font-weight: 600; color: #6b7280; }
.dlg-required { color: #ef4444; }
.dlg-hint { font-size: 11px; color: #9ca3af; }

/* 菜单勾选分组 */
.dlg-menu-grid { display: flex; flex-direction: column; gap: 10px; }
.dlg-menu-group {
  background: #f9fafb; border: 1px solid #f3f4f6;
  border-radius: 10px; padding: 12px 14px;
}
.dlg-mg-label { font-size: 11px; font-weight: 700; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .5px; }
.dlg-mg-items { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.dlg-mg-item {
  font-size: 13px; color: #374151; cursor: pointer;
  display: inline-flex; align-items: center;
}

.dlg-menu-actions { margin-top: 4px; display: flex; gap: 6px; }

.dlg-section--status { display: flex; align-items: center; gap: 20px; }
.dlg-section--status .dlg-sec-title { margin-bottom: 0; }

.dlg-user-fields {
  margin-top: 10px;
  padding: 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
}
.dlg-user-note {
  margin-top: 10px; font-size: 12px; color: #a16207;
  display: flex; align-items: center; gap: 5px;
}

@media (max-width: 640px) {
  .rm-card { flex-wrap: wrap; }
  .rmc-actions { width: 100%; justify-content: flex-end; }
  .dlg-row { grid-template-columns: 1fr; }
}
</style>
