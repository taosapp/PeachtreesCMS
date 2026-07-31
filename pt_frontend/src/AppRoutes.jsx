import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// ── 前台页面：首页立即加载（落地页），文章详情按需加载 ──
import Home from './pages/Home'
const PostDetail = lazy(() => import('./pages/PostDetail'))

// ── 后台页面：全部按需加载（路由级代码分割） ──
const AdminLayout = lazy(() => import('./pages/admin/Layout'))
const Login = lazy(() => import('./pages/admin/Login'))
const PostList = lazy(() => import('./pages/admin/PostList'))
const PostEdit = lazy(() => import('./pages/admin/PostEdit'))
const Tags = lazy(() => import('./pages/admin/Tags'))
const Users = lazy(() => import('./pages/admin/Users'))
const Comments = lazy(() => import('./pages/admin/Comments'))
const CommentWhitelist = lazy(() => import('./pages/admin/CommentWhitelist'))
const Themes = lazy(() => import('./pages/admin/Themes'))
const Patterns = lazy(() => import('./pages/admin/Patterns'))
const Settings = lazy(() => import('./pages/admin/Settings'))
const Media = lazy(() => import('./pages/admin/Media'))
const Data = lazy(() => import('./pages/admin/Data'))
const Plugins = lazy(() => import('./pages/admin/Plugins'))
const PluginDetail = lazy(() => import('./pages/admin/PluginDetail'))
const MailPublish = lazy(() => import('./pages/admin/MailPublish'))

function RouteFallback() {
  return (
    <div style={{ textAlign: 'center', padding: '50px', color: '#6c757d' }}>
      <div className="spinner-border text-primary" role="status"></div>
    </div>
  )
}

// 共享 Provider 栈（前后台入口复用，避免重复维护）
export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>{children}</AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

// 受保护路由（任意登录用户）
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <RouteFallback />
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

// 仅管理员路由（role = 1）
export function AdminOnlyRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <RouteFallback />
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  // 非管理员（作者）重定向到文章列表
  if (user.role !== 1) {
    return <Navigate to="/admin/posts" replace />
  }

  return children
}

// 前台路由（index.html / main-frontend.jsx 使用）
export function FrontendRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post/:identifier" element={<PostDetail />} />
        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

// 后台路由（admin.html / main-admin.jsx 使用）
export function AdminRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* 后台入口默认重定向 */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* 登录页 - 无需认证 */}
        <Route path="/admin/login" element={<Login />} />

        {/* 受保护的后台路由 */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/posts" replace />} />
          <Route path="posts" element={<PostList />} />
          <Route path="posts/new" element={<PostEdit />} />
          <Route path="posts/edit/:id" element={<PostEdit />} />
          <Route path="users" element={<Users />} />

          {/* 仅管理员 */}
          <Route path="media" element={<AdminOnlyRoute><Media /></AdminOnlyRoute>} />
          <Route path="tags" element={<AdminOnlyRoute><Tags /></AdminOnlyRoute>} />
          <Route path="comments" element={<AdminOnlyRoute><Comments /></AdminOnlyRoute>} />
          <Route path="comment-whitelist" element={<AdminOnlyRoute><CommentWhitelist /></AdminOnlyRoute>} />
          <Route path="themes" element={<AdminOnlyRoute><Themes /></AdminOnlyRoute>} />
          <Route path="patterns" element={<AdminOnlyRoute><Patterns /></AdminOnlyRoute>} />
          <Route path="settings" element={<AdminOnlyRoute><Settings /></AdminOnlyRoute>} />
          <Route path="data" element={<AdminOnlyRoute><Data /></AdminOnlyRoute>} />
          <Route path="plugins" element={<AdminOnlyRoute><Plugins /></AdminOnlyRoute>} />
          <Route path="plugins/mail-publish" element={<AdminOnlyRoute><MailPublish /></AdminOnlyRoute>} />
          <Route path="plugins/:slug" element={<AdminOnlyRoute><PluginDetail /></AdminOnlyRoute>} />
        </Route>

        {/* 404 - 重定向到后台 */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  )
}
