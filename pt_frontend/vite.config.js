import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { STATIC_DIRS } from './src/constants.js'

export default defineConfig(({ mode }) => {
  // Load environment variables of the current mode
  const env = loadEnv(mode, process.cwd(), '')

  // Development API base prefix, default: '/PeachtreesCMS/pt_api/'
  const apiBaseUrl = env.VITE_API_BASE_URL || '/PeachtreesCMS/pt_api/'

  // Derive site root prefix from apiBaseUrl, e.g., '/PeachtreesCMS/pt_api/' -> '/PeachtreesCMS/'
  // All static resources (upload/theme/pattern/languages/imgs) are under the site root
  const siteBasePrefix = apiBaseUrl.replace(/pt_api\/?$/, '') // => '/PeachtreesCMS/'

  // General proxy config factory
  const createProxy = () => ({
    target: 'http://localhost',
    changeOrigin: true
  })

  // 由 src/constants.js 的 STATIC_DIRS 统一生成各静态资源代理：
  //   1) 带站点前缀的代理（/PeachtreesCMS/upload|theme|pattern/ -> http://localhost 同路径）
  //   2) 无前缀兼容重写（/upload|theme|pattern -> 站点前缀路径，供编辑器内容里保存的相对路径使用）
  // 新增静态资源目录只需改 src/constants.js。
  const staticProxies = {}
  for (const dir of STATIC_DIRS) {
    const baseUrl = siteBasePrefix + dir + '/'
    staticProxies[baseUrl] = createProxy()
    staticProxies[`^/${dir}`] = {
      target: 'http://localhost',
      changeOrigin: true,
      rewrite: (path) => {
        // /upload/2026/07/xxx.jpg -> /PeachtreesCMS/upload/2026/07/xxx.jpg
        return baseUrl.replace(/\/$/, '') + path.substring(dir.length + 1)
      }
    }
  }

  return {
    plugins: [react()],
    base: './',
    server: {
      port: 5173,
      proxy: {
        // API proxy
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
        ...staticProxies
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
              // Separate React core library chunk
              if (['react', 'react-dom', 'react-router-dom'].some(pkg => id.includes(pkg))) {
                return 'react-vendor'
              }
              // Tiptap editor related
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
      // Enable code splitting
      target: 'esnext',
      cssCodeSplit: true
    }
  }
})