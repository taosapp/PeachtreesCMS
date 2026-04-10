import axios from 'axios'

// 从环境变量获取 API 基础 URL
const baseURL = import.meta.env.VITE_API_BASE_URL

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
    api.put('/posts/toggle-active.php', { id })
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
