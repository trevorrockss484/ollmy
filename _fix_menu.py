content = open('src/App.vue', 'r', encoding='utf-8').read()

# Find the menu block
old_menu_start = ''' <el-menu
     :default-active="activeMenu"
     :collapse="isCollapse"
     :collapse-transition="false"
     background-color="#1e1f2a"
     text-color="#a0a3b1"
     active-text-color="#ffffff"
     router
     class="sidebar-menu"
     >'''

# Replace up to </el-menu>
idx_start = content.index('class="sidebar-menu"')
idx_menu_content_start = content.index('>', idx_start) + 1
idx_menu_end = content.index('</el-menu>', idx_menu_content_start)

# New menu section using v-for
new_menu = '''
     <el-menu-item
       v-for="item in visibleMenus"
       :key="item.path"
       :index="item.path"
     >
     <el-icon><component :is="item.icon" /></el-icon>
     <template #title>{{ item.label }}</template>
     </el-menu-item>
     '''

content = content[:idx_menu_content_start] + new_menu + content[idx_menu_end:]

# Add visibleMenus computed in script setup
# Find the script setup section
script_start = content.index('<script setup>')
script_end_marker = "const isCollapse = ref(false)"
idx_isCollapse = content.index(script_end_marker, script_start)

# Insert menu list and computed after authStore declaration
# Find where authStore is declared
idx_auth = content.index('const authStore = useAuthStore()')
# Find end of that line
idx_auth_end = content.index('\n', idx_auth) + 1

menu_def = '''
// 全部菜单项定义
const allMenuItems = [
  { path: '/', label: '仪表盘', icon: 'Odometer' },
  { path: '/plan', label: '周计划', icon: 'Calendar' },
  { path: '/report', label: '日报生成', icon: 'Edit' },
  { path: '/history', label: '数据查询', icon: 'Clock' },
  { path: '/monitor', label: '监控中心', icon: 'Monitor' },
  { path: '/clock', label: '世界时钟', icon: 'Clock' },
  { path: '/assets', label: 'AI资产管理', icon: 'PictureFilled' },
  { path: '/media', label: '图片素材库', icon: 'PictureFilled' },
  { path: '/video-library', label: '视频素材库', icon: 'VideoCameraFilled' },
  { path: '/scripts', label: '话术库', icon: 'ChatDotRound' },
  { path: '/customer-stats', label: '客户统计', icon: 'DataAnalysis' },
  { path: '/role-manage', label: '角色管理', icon: 'Key' },
  { path: '/user-manage', label: '用户管理', icon: 'User' },
  { path: '/compress', label: '图片压缩', icon: 'Scissor' },
  { path: '/video-compress', label: '视频压缩', icon: 'VideoCameraFilled' },
]
const visibleMenus = computed(() => allMenuItems.filter(m => authStore.canAccess(m.path)))
'''

content = content[:idx_auth_end] + menu_def + content[idx_auth_end:]

# Update pageTitles to use the same list
# The pageTitles is fine as-is since it's just used for the header

# Make sure computed is imported
if "import { computed } from 'vue'" not in content:
    content = content.replace(
        "import { ref, computed, onMounted, onUnmounted, watch } from 'vue'",
        "import { ref, computed, onMounted, onUnmounted, watch } from 'vue'"
    )

with open('src/App.vue', 'w', encoding='utf-8', newline='').write(content)
print('done')
