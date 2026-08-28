import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElLoading } from 'element-plus'
// 全量样式保持在前：global.css 的暗色/主题覆盖依赖此加载顺序
import 'element-plus/dist/index.css'
import './styles/flags.css'
import App from './App.vue'
import router from './router'
import { setupIcons } from './icons'
import './styles/global.css'

const app = createApp(App)

setupIcons(app)

app.use(createPinia())
app.use(router)
app.use(ElLoading) // v-loading 指令（ReportView 使用）
app.mount('#app')
