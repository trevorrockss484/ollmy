<template>
  <!-- 登录页全屏独立 -->
  <div v-if="route.path === '/login'" style="height:100vh;">
    <router-view />
  </div>

  <el-container v-else class="app-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="app-sidebar">
      <div class="sidebar-logo" @click="isCollapse = !isCollapse">
        <span class="logo-icon">🐼</span>
        <span v-show="!isCollapse" class="logo-text">Pan助手</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="#1e1f2a"
        text-color="#a0a3b1"
        active-text-color="#ffffff"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/">
          <el-icon><Calendar /></el-icon>
          <template #title>周计划</template>
        </el-menu-item>
        <el-menu-item index="/report">
          <el-icon><Edit /></el-icon>
          <template #title>日报生成</template>
        </el-menu-item>
        <el-menu-item index="/history">
          <el-icon><Clock /></el-icon>
          <template #title>历史查询</template>
        </el-menu-item>
        <el-menu-item index="/monthly">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>月度总结</template>
        </el-menu-item>
        <el-menu-item index="/monitor">
          <el-icon><Monitor /></el-icon>
          <template #title>
            <span class="menu-item-title">
              监控中心
              <span v-if="vpsAlert > 0" class="menu-item-badge">{{ vpsAlert }}</span>
            </span>
          </template>
        </el-menu-item>
        <el-menu-item index="/calculator">
          <el-icon><Operation /></el-icon>
          <template #title>工具</template>
        </el-menu-item>
      </el-menu>

      <!-- 侧边栏底部 -->
      <div class="sidebar-footer-status" v-show="!isCollapse">
        <span style="font-size:11px;color:#6b7280;">👤 {{ authStore.username }}</span>
      </div>
    </el-aside>

    <!-- 主内容 -->
    <el-container>
      <el-header class="app-topbar">
        <el-button text @click="isCollapse = !isCollapse">
          <el-icon :size="20"><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
        </el-button>
        <span class="topbar-info">{{ weekTitle }}</span>
        <div style="flex:1;" />
        <span style="font-size:11px;color:#9ca3af;margin-right:12px;">{{ authStore.username }}</span>
        <el-button size="small" text @click="authStore.logout()" style="color:#9ca3af;">退出</el-button>
      </el-header>
      <el-main class="app-main">
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWeekStore } from './stores/week'
import { useAuthStore } from './stores/auth'
import { ElMessage } from 'element-plus'
import { api, formatDateCN, formatDate, todayStr, daysBetween } from './api'

const route = useRoute()
const weekStore = useWeekStore()
const authStore = useAuthStore()

const isCollapse = ref(false)
const selectedWeekId = ref(null)
const vpsAlert = ref(0)

const activeMenu = computed(() => route.path)

const weekTitle = computed(() => {
  if (!weekStore.currentWeek) return ''
  return formatDateCN(weekStore.currentWeek.startDate) + ' — ' + formatDateCN(weekStore.currentWeek.endDate)
})

function shortDate(str) {
  return str ? formatDate(str) : ''
}

watch(() => weekStore.currentWeek, (w) => {
  if (w) selectedWeekId.value = w.id
}, { immediate: true })

async function handleWeekSwitch(id) {
  await weekStore.switchWeek(id)
  ElMessage.success('已切换周计划')
}

async function createWeek() {
  await weekStore.createWeek()
  ElMessage.success('新周计划已创建')
}

onMounted(async () => {
  // 登录页不加载数据，避免API 401触发无限重定向
  if (route.path === '/login') return
  if (!authStore.isLoggedIn()) return
  await weekStore.load()
  if (!weekStore.currentWeek) await weekStore.createWeek()
  checkVps()
  setInterval(checkVps, 120000)
})

async function checkVps() {
  try {
    const res = await api.vps.list()
    if (res.success) {
      vpsAlert.value = res.data.filter(v => daysBetween(todayStr(), v.expire) <= 14).length
    }
  } catch(e) {}
}
</script>

<style scoped>
.app-layout { height: 100vh; }

.app-sidebar {
  background: #1e1f2a;
  display: flex; flex-direction: column;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebar-logo {
  display: flex; align-items: center; gap: 10px;
  padding: 20px 20px 16px;
  cursor: pointer; user-select: none;
}
.logo-icon { font-size: 24px; }
.logo-text {
  font-size: 16px; font-weight: 800;
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

.sidebar-menu {
  flex: 1; border-right: none !important;
}
.sidebar-menu .el-menu-item {
  font-size: 14px; height: 48px; line-height: 48px;
  margin: 2px 8px; border-radius: 8px;
  transition: all 0.2s;
}
.sidebar-menu .el-menu-item:hover { background: #2a2b38 !important; }
.sidebar-menu .el-menu-item.is-active {
  background: linear-gradient(135deg, #6366f1, #818cf8) !important;
  color: #fff !important;
}

.sidebar-footer {
  display:none;
}

.sidebar-footer-status {
  padding:10px 12px 14px; text-align:center;
  border-top:1px solid rgba(255,255,255,.06);
}

.app-topbar {
  height: 48px; display: flex; align-items: center; gap: 12px;
  background: #fff; border-bottom: 1px solid #e5e7eb;
  padding: 0 16px;
}
.topbar-info { font-size: 12px; color: #9ca3af; }

.app-main {
  background: #f3f4f6;
  padding: 24px;
  overflow-y: auto;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 菜单项右上角badge */
.menu-item-title {
  position: relative; display: inline-block;
}
.menu-item-badge {
  position: absolute; top: -6px; right: -14px;
  min-width: 16px; height: 16px;
  background: #ef4444; color: #fff;
  font-size: 10px; font-weight: 700;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 5px; line-height: 1;
  box-shadow: 0 0 0 2px #1e1f2a;
}
</style>
