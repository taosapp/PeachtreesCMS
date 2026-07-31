import axios from 'axios'

// 动态获取 API 基础 URL 的辅助函数
export const getApiBaseURL = () => {
  // 1. 本地开发环境（pnpm dev）：使用环境变量，否则回退到默认开发路径 '/PeachtreesCMS/pt_api/'
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_BASE_URL || '/PeachtreesCMS/pt_api/';
  }

  // 2. 生产环境（“构建一次，到处运行”）：从当前页面路径自动推导
  //    兼容 /blog/index.html、/blog/、/blog 三种 URL 形态
  let path = window.location.pathname;
  // 去掉文件名部分（/blog/index.html -> /blog）
  if (/[^/]+\.[^/]+$/.test(path)) {
    path = path.replace(/[^/]+\.[^/]+$/, '');
  }
  // 去掉末尾斜杠（/blog/ -> /blog）
  path = path.replace(/\/+$/, '');
  return `${path}/pt_api/`.replace(/\/+/g, '/');
}

export const baseURL = getApiBaseURL()

/**
 * 拼接 API 接口地址（等价于 api.get/post 的 URL，供 fetch/原生标签等场景使用）
 * @param {string} path - 如 '/rss.php'、'/captcha.php'
 */
export const apiUrl = (path) => `${baseURL.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`

const api = axios.create({
  baseURL: baseURL,
  withCredentials: true
})

// Response interceptor
api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.message || error.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)

// Authentication API
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login.php', { username, password }),
  logout: () =>
    api.post('/auth/logout.php'),
  check: () =>
    api.get('/auth/check.php')
}

// Post API
export const postsAPI = {
  getList: (params = {}) =>
    api.get('/posts/index.php', { params }),
  getOne: (identifier) =>
    api.get('/posts/view.php', { params: { id: identifier } }),
  create: (data) =>
    api.post('/posts/create.php', data),
  update: (data) =>
    api.put('/posts/update.php', data),
  uploadMedia: (formData) =>
    api.post('/posts/upload-media.php', formData),
  uploadBigPicture: (formData) =>
    api.post('/posts/upload-bigpicture.php', formData),
  delete: (id) =>
    api.delete('/posts/delete.php', { data: { id } }),
  toggleActive: (id) =>
    api.put('/posts/toggle-active.php', { id }),
  batchToggle: (ids, active) =>
    api.put('/posts/batch-toggle.php', { ids, active })
}

// Tag API
export const tagsAPI = {
  getList: () =>
    api.get('/tags/index.php'),
  create: (data) =>
    api.post('/tags/create.php', data),
  update: (data) =>
    api.put('/tags/update.php', data),
  delete: (id) =>
    api.delete('/tags/delete.php', { data: { id } })
}

// User API
export const usersAPI = {
  getList: () =>
    api.get('/users/index.php'),
  create: (data) =>
    api.post('/users/create.php', data),
  update: (data) =>
    api.put('/users/update.php', data),
  updatePassword: (data) =>
    api.put('/users/update-password.php', data),
  delete: (id) =>
    api.delete('/users/delete.php', { data: { id } })
}

// Comment API
export const commentsAPI = {
  getList: (params = {}) =>
    api.get('/comments/index.php', { params }),
  create: (data) =>
    api.post('/comments/create.php', data),
  approve: (data) =>
    api.put('/comments/approve.php', data),
  batchApprove: (ids, status) =>
    api.put('/comments/batch-approve.php', { ids, status }),
  getWhitelist: (params = {}) =>
    api.get('/comments/whitelist.php', { params }),
  setWhitelist: (data) =>
    api.put('/comments/whitelist-set.php', data),
  delete: (id) =>
    api.delete('/comments/delete.php', { data: { id } })
}

// Theme API
export const themesAPI = {
  getList: () =>
    api.get('/themes/index.php'),
  getActive: () =>
    api.get('/themes/active.php'),
  setActive: (data) =>
    api.put('/themes/set-active.php', data)
}

// Page style API
export const stylesAPI = {
  getList: () =>
    api.get('/styles/index.php')
}

// Option API
export const optionsAPI = {
  get: () =>
    api.get('/options/index.php'),
  update: (data) =>
    api.post('/options/update.php', data)
}

// Data import/export API
export const dataAPI = {
  importWxr: (formData) =>
    api.post('/data/import.php', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
}

// Plugin API
export const pluginsAPI = {
  getList: () =>
    api.get('/plugins/index.php'),
  setEnabled: (data) =>
    api.post('/plugins/update.php', data)
}

// Media API
export const mediaAPI = {
  getList: () =>
    api.get('/media/index.php'),
  upload: (formData) =>
    api.post('/media/upload.php', formData),
  delete: (path) =>
    api.delete('/media/delete.php', { data: { path } })
}

export default api
