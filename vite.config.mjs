import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    // Element Plus 组件按需加载（JS 层面 tree-shaking）
    // 样式仍走 main.js 的全量 CSS 导入，保证 global.css 暗色覆盖的加载顺序稳定
    Components({
      resolvers: [ElementPlusResolver({ importStyle: false })],
      dts: false,
    }),
  ],
  server: {
    port: 5173,
    allowedHosts: ["localhost", "127.0.0.1", ".vusercontent.net", ".n8c.io"],
    proxy: {
      '/api': {
        target: 'http://localhost:3456',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3456',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // element-plus 未在 package.json 声明 sideEffects，
      // 显式标记其模块无副作用，让 barrel 入口（import { ElMessage } from 'element-plus'）
      // 也能被 tree-shaking
      treeshake: {
        moduleSideEffects(id) {
          if (id.includes('element-plus')) return false
          return true
        }
      },
      output: {
        // 大依赖拆分为独立 vendor chunk，提升浏览器缓存命中。
        // 注意：element-plus 不能加入 manualChunks —— 强制分组会阻止
        // 它的 tree-shaking（实测 bundle 多出 ~450KB），交给 Rollup 自动分包
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('echarts') || id.includes('zrender')) return 'vendor-echarts'
          if (id.includes('/vue/') || id.includes('vue-router') || id.includes('pinia') || id.includes('@vue/')) return 'vendor-vue'
        }
      }
    }
  }
})
