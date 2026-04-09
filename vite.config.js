import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 部署目录配置（相对于网站根目录）
// 共享主机示例：网站根目录下的 PeachtreesCMS 文件夹
// 如果部署在根目录，改为 '/'
const deployBase = './PeachtreesCMS/'

export default defineConfig({
  plugins: [react()],
  base: deployBase,
  server: {
    port: 5173,
    proxy: {
      // API 代理：/pt_api/xxx → http://localhost/PeachtreesCMS/pt_api/xxx
      '/pt_api/': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pt_api\//, '/PeachtreesCMS/pt_api/')
      },
      // 上传文件代理：/PeachtreesCMS/pt_upload/xxx → http://localhost/PeachtreesCMS/pt_upload/xxx
      '/PeachtreesCMS/pt_upload/': {
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
