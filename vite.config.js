import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/pt_api': {
        target: 'http://localhost',
        changeOrigin: true
      },
      '/upload': {
        target: 'http://localhost',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: 'index.html',
        admin: 'admin.html'
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React 核心库单独分块
            if (['react', 'react-dom', 'react-router-dom'].some(pkg => id.includes(pkg))) {
              return 'react-vendor'
            }
            // Tiptap 编辑器相关
            if (id.includes('@tiptap')) {
              return 'tiptap'
            }
            // Swiper
            if (id.includes('swiper')) {
              return 'swiper'
            }
          }
        }
      }
    },
    // 启用代码分割
    target: 'esnext',
    cssCodeSplit: true
  }
})
