import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'

// Pages
import Home from './pages/Home'
import PostDetail from './pages/PostDetail'
import AdminLayout from './pages/admin/Layout'
import Login from './pages/admin/Login'
import PostList from './pages/admin/PostList'
import PostEdit from './pages/admin/PostEdit'
import Tags from './pages/admin/Tags'
import Users from './pages/admin/Users'
import Comments from './pages/admin/Comments'
import CommentWhitelist from './pages/admin/CommentWhitelist'
import Themes from './pages/admin/Themes'
import Patterns from './pages/admin/Patterns'
import Settings from './pages/admin/Settings'
import Media from './pages/admin/Media'
import Data from './pages/admin/Data'
import Plugins from './pages/admin/Plugins'
import PluginDetail from './pages/admin/PluginDetail'
import MailPublish from './pages/admin/MailPublish'

// Protected Route (Any logged in user)
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

// Admin-Only Route (Only user with role = 1)
function AdminOnlyRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  // If logged in but role is not 1 (admin), redirect to the posts page (author permission)
  if (user.role !== 1) {
    return <Navigate to="/admin/posts" replace />
  }

  return children
}

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              {/* Frontend routes */}
              <Route path="/" element={<Home />} />
              <Route path="/post/:identifier" element={<PostDetail />} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<Login />} />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                {/* 1. Accessible to both Authors and Admins */}
                <Route index element={<Navigate to="/admin/posts" replace />} />
                <Route path="posts" element={<PostList />} />
                <Route path="posts/new" element={<PostEdit />} />
                <Route path="posts/edit/:id" element={<PostEdit />} />
                <Route path="users" element={<Users />} />

                {/* 2. Admin-Only Modules */}
                <Route path="media" element={<AdminOnlyRoute><Media /></AdminOnlyRoute>} />
                <Route path="tags" element={<AdminOnlyRoute><Tags /></AdminOnlyRoute>} />
                <Route path="comments" element={<AdminOnlyRoute><Comments /></AdminOnlyRoute>} />
                <Route path="comment-whitelist" element={<AdminOnlyRoute><CommentWhitelist /></AdminOnlyRoute>} />
                <Route path="themes" element={<AdminOnlyRoute><Themes /></AdminOnlyRoute>} />
                <Route path="patterns" element={<AdminOnlyRoute><Patterns /></AdminOnlyRoute>} />
                <Route path="settings" element={<AdminOnlyRoute><Settings /></AdminOnlyRoute>} />
                <Route path="data" element={<AdminOnlyRoute><Data /></AdminOnlyRoute>} />
                
                {/* Admin-Only Plugins */}
                <Route path="plugins" element={<AdminOnlyRoute><Plugins /></AdminOnlyRoute>} />
                <Route path="plugins/:slug" element={<AdminOnlyRoute><PluginDetail /></AdminOnlyRoute>} />
                <Route path="plugins/mail-publish" element={<AdminOnlyRoute><MailPublish /></AdminOnlyRoute>} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </HashRouter>
  )
}

export default App
