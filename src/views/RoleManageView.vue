<template>
  <div class="rm-page enterprise-page enterprise-page--form">
    <div class="rm-top">
      <h2><el-icon :size="22"><Key /></el-icon> 角色管理</h2>
      <el-button v-if="authStore.canAdd(PAGE)" type="primary" @click="openAdd"><el-icon :size="14"><Plus /></el-icon> 新增角色</el-button>
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
          <el-button v-if="authStore.canEdit(PAGE)" size="small" round @click="openEdit(r)"><el-icon :size="13"><Edit /></el-icon> 编辑</el-button>
          <el-button v-if="authStore.canDelete(PAGE)" size="small" round type="danger" plain @click="doDelete(r)" :disabled="r.name==='admin'">
            <el-icon :size="13"><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
    <div v-else class="rm-empty">暂无角色，点击右上角「新增角色」创建</div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑角色' : '新增角色'" width="720px" destroy-on-close :close-on-click-modal="false">
      <div class="dlg-body">
        <!-- 基础信息 -->
        <div class="dlg-section">
          <div class="dlg-row">
            <div class="dlg-field">
              <label>角色标识 <span class="dlg-required">*</span></label>
              <el-input v-model="form.name" :disabled="!!editId" placeholder="英文标识，如 sales-manager" size="default" />
              <span class="dlg-hint" v-if="!editId">保存后不可修改</span>
            </div>
            <div class="dlg-field">
              <label>显示名称 <span class="dlg-required">*</span></label>
              <el-input v-model="form.displayName" placeholder="如：销售主管" size="default" />
            </div>
          </div>
          <div class="dlg-row dlg-row--status">
            <label>状态</label>
            <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
          </div>
        </div>

        <!-- 菜单 + 权限 Tab -->
        <el-tabs v-model="permTab" type="border-card" class="dlg-tabs">
          <el-tab-pane label="菜单可见" name="menus">
            <div class="dlg-menu-grid">
              <div v-for="group in menuGroups" :key="group.label" class="dlg-menu-group">
                <div class="dlg-mg-label">{{ group.label }} <span class="dlg-mg-n">{{ group.items.filter(m => form.menus.includes(m.path)).length }}/{{ group.items.length }}</span></div>
                <div class="dlg-mg-items">
                  <label v-for="m in group.items" :key="m.path" class="dlg-mg-item" :class="{ checked: form.menus.includes(m.path) }">
                    <el-checkbox :model-value="form.menus.includes(m.path)" @change="toggleMenu(m.path)">{{ m.label }}</el-checkbox>
                  </label>
                </div>
              </div>
            </div>
            <div class="dlg-menu-actions">
              <el-button size="small" @click="form.menus = allMenus.map(m=>m.path)">全选</el-button>
              <el-button size="small" @click="form.menus = []">清空</el-button>
            </div>
          </el-tab-pane>

          <el-tab-pane label="全局权限" name="global">
            <p class="dlg-tab-hint">以下权限对所有未单独设置的模块生效。默认全部关闭=仅可查看。</p>
            <div class="dlg-perm-row">
              <div class="dlg-perm-card">
                <div class="dlg-perm-card-hd">
                  <el-checkbox v-model="form.permissions.edit" size="large"><b>可以编辑</b></el-checkbox>
                </div>
                <p>允许修改已有数据（如编辑日报、VPS信息、提示词等）</p>
              </div>
              <div class="dlg-perm-card">
                <div class="dlg-perm-card-hd">
                  <el-checkbox v-model="form.permissions.add" size="large"><b>可以新增</b></el-checkbox>
                </div>
                <p>允许创建新数据（如新增VPS、上传资产、添加日报等）</p>
              </div>
              <div class="dlg-perm-card">
                <div class="dlg-perm-card-hd">
                  <el-checkbox v-model="form.permissions.delete" size="large"><b>可以删除</b></el-checkbox>
                </div>
                <p>允许删除数据（如删除VPS、日报、提示词、资产等）</p>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="逐模块" name="pages">
            <p class="dlg-tab-hint">勾选则覆盖全局权限 · 不勾选跟随全局</p>
            <div class="dlg-ppm-table">
              <div class="dlg-ppm-row dlg-ppm-head">
                <span class="dlg-ppm-cell dlg-ppm-label">模块</span>
                <span class="dlg-ppm-cell">编</span>
                <span class="dlg-ppm-cell">增</span>
                <span class="dlg-ppm-cell">删</span>
              </div>
              <div v-for="m in pagePermList" :key="m.path" class="dlg-ppm-row">
                <span class="dlg-ppm-cell dlg-ppm-label">{{ m.label }}</span>
                <span class="dlg-ppm-cell"><el-checkbox :model-value="!!pagePermValue(m.path, 'edit')" @change="(v) => setPagePerm(m.path, 'edit', v)" size="small" /></span>
                <span class="dlg-ppm-cell"><el-checkbox :model-value="!!pagePermValue(m.path, 'add')" @change="(v) => setPagePerm(m.path, 'add', v)" size="small" /></span>
                <span class="dlg-ppm-cell"><el-checkbox :model-value="!!pagePermValue(m.path, 'delete')" @change="(v) => setPagePerm(m.path, 'delete', v)" size="small" /></span>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>

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
                <el-input v-model="form.userUsername" placeholder="如：zhangsan" size="default" />
              </div>
              <div class="dlg-field">
                <label>显示名称</label>
                <el-input v-model="form.userDisplayName" :placeholder="form.displayName || '如：张三'" size="default" />
              </div>
            </div>
            <div class="dlg-field" style="margin-top:12px;">
              <label>登录密码 <span class="dlg-required">*</span></label>
              <el-input v-model="form.userPassword" type="password" placeholder="设置密码" show-password size="default" />
            </div>
            <div class="dlg-user-note">
              <el-icon :size="13"><InfoFilled /></el-icon>
              创建后将自动分配此角色，用户可立即登录
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRole">{{ editId ? '保存修改' : '创建角色' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const PAGE = '/role-manage'

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
const permTab = ref('menus')

const defaultForm = () => ({ name: '', displayName: '', menus: [], permissions: { edit: false, add: false, delete: false }, perPagePerms: {}, enabled: true, userUsername: '', userDisplayName: '', userPassword: '' })
const pagePermList = computed(() => allMenus.map(m => ({ path: m.path, label: m.label })))

function pagePermValue(path, key) {
  const pp = form.perPagePerms[path]
  if (!pp) return null                          // null = 未设置，checkbox 不勾
  if (pp[key] === undefined || pp[key] === null) return null
  return pp[key]
}
function setPagePerm(path, key, val) {
  const next = { ...form.perPagePerms }
  const cur = next[path] || { edit: false, add: false, delete: false }
  if (!next[path]) {
    // 首次设置：只在 val=true 时创建，false 则不写（保持跟随全局）
    if (!val) {
      const hasAny = cur.edit || cur.add || cur.delete
      if (!hasAny) return // 还没设置过又不勾 → 不创建
    }
    next[path] = cur
  }
  next[path] = { ...next[path], [key]: val }
  // 如果三个全关 → 删除该项（变回跟随全局）
  if (!next[path].edit && !next[path].add && !next[path].delete) {
    delete next[path]
  }
  form.perPagePerms = next
}
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
  form.permissions = r.permissions ? { ...r.permissions } : { edit: false, add: false, delete: false }
  form.perPagePerms = r.perPagePerms ? JSON.parse(JSON.stringify(r.perPagePerms)) : {}
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
    const res = await api.roles.update(editId.value, { displayName: form.displayName.trim(), menus: form.menus, permissions: form.permissions, perPagePerms: form.perPagePerms, enabled: form.enabled })
    if (res.success) { ElMessage.success('角色已更新'); dialogVisible.value = false; loadRoles() }
    else ElMessage.error(res.error || '更新失败')
  } else {
    const res = await api.roles.add({ name: form.name.trim(), displayName: form.displayName.trim(), menus: form.menus, permissions: form.permissions, perPagePerms: form.perPagePerms })
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
.rm-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.rm-top h2 { font-size: var(--text-2xl); font-weight: 800; display: flex; align-items: center; gap: var(--space-3); color: var(--text-primary); letter-spacing: -.3px; }

/* ====== 卡片列表 ====== */
.rm-cards { display: flex; flex-direction: column; gap: 10px; }
.rm-card {
  display: flex; align-items: center; gap: 16px;
  background: var(--surface-card); border: 1px solid var(--border-default); border-radius: 14px;
  padding: 16px 20px;
  transition: all .15s;
}
.rm-card:hover { border-color: var(--brand-300); box-shadow: var(--shadow-sm); }
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

.rm-empty { text-align: center; padding: 60px 20px; color: var(--text-tertiary); font-size: 14px; background: var(--surface-card); border: 1px dashed var(--border-default); border-radius: 14px; }

/* ====== 弹窗 ====== */
.dlg-body { display: flex; flex-direction: column; gap: 16px; max-height: 70vh; overflow-y: auto; }
.dlg-section { }
.dlg-sec-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.dlg-sec-extra { font-size: 11px; color: var(--text-tertiary); font-weight: 500; }
.dlg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.dlg-row--status { display: flex; align-items: center; gap: 16px; margin-top: 4px; grid-template-columns: auto 1fr; }
.dlg-row--status label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.dlg-field { display: flex; flex-direction: column; gap: 4px; }
.dlg-field label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.dlg-required { color: var(--danger); }
.dlg-hint { font-size: 11px; color: var(--text-tertiary); }

/* Tabs */
.dlg-tabs { margin-top: 4px; }
.dlg-tab-hint { font-size: 12px; color: var(--text-tertiary); margin: 0 0 12px; }
.dlg-tabs :deep(.el-tabs__content) { max-height: 320px; overflow-y: auto; padding: 12px 0; }

/* 菜单勾选 */
.dlg-menu-grid { display: flex; flex-direction: column; gap: 10px; }
.dlg-menu-group { background: var(--surface-hover); border: 1px solid var(--border-default); border-radius: 10px; padding: 12px 14px; }
.dlg-mg-label { font-size: 11px; font-weight: 700; color: var(--text-tertiary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .5px; display: flex; justify-content: space-between; }
.dlg-mg-n { font-weight: 600; color: var(--brand-400); }
.dlg-mg-items { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.dlg-mg-item { font-size: 13px; color: var(--text-secondary); cursor: pointer; display: inline-flex; align-items: center; }
.dlg-menu-actions { margin-top: 8px; display: flex; gap: 6px; }

/* 权限卡片 */
.dlg-perm-row { display: flex; flex-direction: column; gap: 12px; }
.dlg-perm-card { background: var(--surface-hover); border: 1px solid var(--border-default); border-radius: 10px; padding: 14px 16px; }
.dlg-perm-card-hd { }
.dlg-perm-card p { font-size: 12px; color: var(--text-tertiary); margin: 4px 0 0 28px; line-height: 1.5; }

/* 逐模块表格 */
.dlg-ppm-table { border: 1px solid var(--border-default); border-radius: 10px; overflow: hidden; }
.dlg-ppm-head { background: var(--surface-hover); border-bottom: 1px solid var(--border-default); }
.dlg-ppm-head .dlg-ppm-label { font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .5px; }
.dlg-ppm-row { display: grid; grid-template-columns: 1fr 50px 50px 50px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border-default); }
.dlg-ppm-row:last-child { border-bottom: none; }
.dlg-ppm-cell { display: flex; justify-content: center; }
.dlg-ppm-cell.dlg-ppm-label { justify-content: flex-start; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.dlg-ppm-row:hover { background: var(--surface-hover); }

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
