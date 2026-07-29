import axios from 'axios'

// 动态获取 API 基础 URL 的辅助函数
export const getApiBaseURL = () => {
  // 1. 如果是本地开发环境 (pnpm dev)，使用环境变量，若无则回退至默认开发路径 '/PeachtreesCMS/pt_api/'
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_BASE_URL || '/PeachtreesCMS/pt_api/';
  }
  
  // 2. 生产打包环境下，为了实现“一处构建，到处运行”，采用动态路径自适应推导
  const path = window.location.pathname;
  const dir = path.substring(0, path.lastIndexOf('/'));
  return `${dir}/pt_api/`.replace(/\/+/g, '/');
}

export const baseURL = getApiBaseURL()

const api = axios.create({
  baseURL: baseURL,
  withCredentials: true
})

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.message || error.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)

// 认证 API
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login.php', { username, password }),
  logout: () =>
    api.post('/auth/logout.php'),
  check: () =>
    api.get('/auth/check.php')
}

// 文章 API
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

// 标签 API
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

// 用户 API
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

// 评论 API
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

// 主题 API
export const themesAPI = {
  getList: () =>
    api.get('/themes/index.php'),
  getActive: () =>
    api.get('/themes/active.php'),
  setActive: (data) =>
    api.put('/themes/set-active.php', data)
}

// 页面风格 API
export const stylesAPI = {
  getList: () =>
    api.get('/styles/index.php')
}

// 设置 API
export const optionsAPI = {
  get: () =>
    api.get('/options/index.php'),
  update: (data) =>
    api.post('/options/update.php', data)
}

// 数据导入导出 API
export const dataAPI = {
  importWxr: (formData) =>
    api.post('/data/import.php', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
}

// 插件 API
export const pluginsAPI = {
  getList: () =>
    api.get('/plugins/index.php'),
  setEnabled: (data) =>
    api.post('/plugins/update.php', data)
}

// 媒体 API
export const mediaAPI = {
  getList: () =>
    api.get('/media/index.php'),
  upload: (formData) =>
    api.post('/media/upload.php', formData),
  delete: (path) =>
    api.delete('/media/delete.php', { data: { path } })
}

export default api
