import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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
    outDir: 'dist'
  }
})
