import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // 加载当前模式下的环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  // 获取开发环境 API 基础前缀，默认值为 '/PeachtreesCMS/pt_api/'
  const apiBaseUrl = env.VITE_API_BASE_URL || '/PeachtreesCMS/pt_api/'
  
  // 派生出上传文件夹、主题文件夹和页面风格(pattern)文件夹的代理前缀
  // 例如：'/PeachtreesCMS/pt_api/' -> '/PeachtreesCMS/upload/', '/PeachtreesCMS/theme/', '/PeachtreesCMS/pattern/'
  const uploadBaseUrl = apiBaseUrl.replace('pt_api/', 'upload/')
  const themeBaseUrl = apiBaseUrl.replace('pt_api/', 'theme/')
  const patternBaseUrl = apiBaseUrl.replace('pt_api/', 'pattern/')

  return {
    plugins: [react()],
    base: './',
    server: {
      port: 5173,
      proxy: {
        // API 代理：[apiBaseUrl] -> http://localhost[apiBaseUrl]
        [apiBaseUrl]: {
          target: 'http://localhost',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate'
              delete proxyRes.headers['etag']
              delete proxyRes.headers['last-modified']
            })
          }
        },
        // 上传文件代理
        [uploadBaseUrl]: {
          target: 'http://localhost',
          changeOrigin: true
        },
        // 主题资源代理
        [themeBaseUrl]: {
          target: 'http://localhost',
          changeOrigin: true
        },
        // 风格模板资源代理
        [patternBaseUrl]: {
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
}
})
