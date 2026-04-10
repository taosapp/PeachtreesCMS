import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => ({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      // API 代理：/pt_api/xxx → http://localhost/PeachtreesCMS/pt_api/xxx
      '/pt_api/': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pt_api\//, '/PeachtreesCMS/pt_api/')
      },
      // 上传文件代理：/pt_upload/xxx → http://localhost/PeachtreesCMS/pt_upload/xxx
      '/pt_upload/': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pt_upload\//, '/PeachtreesCMS/pt_upload/')
      },
      // 主题资源代理：/theme/xxx → http://localhost/PeachtreesCMS/public/theme/xxx
      '/theme/': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/theme\//, '/PeachtreesCMS/public/theme/')
      },
      // 语言包代理：/languages/xxx → http://localhost/PeachtreesCMS/public/languages/xxx
      '/languages/': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/languages\//, '/PeachtreesCMS/public/languages/')
      },
      // 页面样式代理：/pattern/xxx → http://localhost/PeachtreesCMS/public/pattern/xxx
      '/pattern/': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pattern\//, '/PeachtreesCMS/public/pattern/')
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
}))
