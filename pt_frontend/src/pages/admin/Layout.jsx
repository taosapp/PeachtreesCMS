import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { pluginsAPI } from '../../services/api'
import { useEffect, useMemo, useState } from 'react'
import { publicUrl } from '../../utils/path'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { lang, language } = useLanguage()
  const [plugins, setPlugins] = useState([])

  const isAdmin = user?.role === 1

  useEffect(() => {
    // Only load plugins list if the user is an administrator
    if (!isAdmin) return

    const loadPlugins = async () => {
      try {
        const res = await pluginsAPI.getList()
        if (res.success) {
          setPlugins(res.data)
        }
      } catch (err) {
        console.error('Failed to load plugins:', err)
      }
    }

    loadPlugins()
  }, [isAdmin])

  const pluginItems = useMemo(() => {
    if (!isAdmin) return []
    return plugins.filter((plugin) => plugin.enabled !== false).map((plugin) => {
      const label = language === 'en-US'
        ? plugin.name_en || plugin.name
        : plugin.name
      return {
        slug: plugin.slug,
        label,
        path: plugin.admin_path || `/admin/plugins/${plugin.slug}`
      }
    })
  }, [plugins, language, isAdmin])

  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar */}
      <nav className="d-flex flex-column flex-shrink-0 p-3 text-bg-dark" style={{ width: '220px' }}>
        <h5 className="text-center mb-3">
          <i className="bi bi-gear-fill me-2 text-primary"></i>
          {lang('admin')}
        </h5>
        <hr />
        <ul className="nav nav-pills flex-column mb-auto">
          {/* Post List - Accessible to all (Admins and Authors) */}
          <li className="nav-item">
            <NavLink
              to="/admin/posts"
              end
              className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-file-text me-2"></i>
              {lang('postList')}
            </NavLink>
          </li>
          
          {/* Add Post - Accessible to all (Admins and Authors) */}
          <li className="nav-item">
            <NavLink
              to="/admin/posts/new"
              className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-plus-circle me-2"></i>
              {lang('addPost')}
            </NavLink>
          </li>

          {/* Profile / User edit - Accessible to all (Self Profile, Admin can see list too) */}
          <li className="nav-item">
            <NavLink
              to="/admin/users"
              className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-person-badge me-2"></i>
              {isAdmin ? lang('users') : lang('editProfile')}
            </NavLink>
          </li>

          {/* =======================================================
              ADMIN-ONLY SIDEBAR OPTIONS
             ======================================================= */}
          {isAdmin && (
            <>
              <li className="nav-item">
                <NavLink
                  to="/admin/media"
                  className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-folder2-open me-2"></i>
                  {lang('mediaManagement')}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/admin/tags"
                  className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-tags me-2"></i>
                  {lang('tags')}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/admin/comments"
                  className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-chat-dots me-2"></i>
                  {lang('comments')}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/admin/comment-whitelist"
                  className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-shield-check me-2"></i>
                  {lang('commentWhitelist')}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/admin/themes"
                  className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-palette me-2"></i>
                  {lang('themeManagement')}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/admin/patterns"
                  className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-brush me-2"></i>
                  {lang('patternManagement')}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/admin/settings"
                  className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-gear me-2"></i>
                  {lang('settings')}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/admin/data"
                  className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-arrow-left-right me-2"></i>
                  {lang('dataManagement')}
                </NavLink>
              </li>
            </>
          )}

          {/* Admin Plugins List */}
          {isAdmin && (pluginItems.length > 0 || plugins.length > 0) && (
            <>
              <li className="nav-item mt-2 text-uppercase small text-muted px-3">
                {lang('plugins')}
              </li>
              <li className="nav-item">
                <NavLink
                  to="/admin/plugins"
                  className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-sliders me-2"></i>
                  {lang('pluginManagement')}
                </NavLink>
              </li>
              {pluginItems.map((plugin) => (
                <li className="nav-item" key={plugin.slug}>
                  <NavLink
                    to={plugin.path}
                    className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}
                  >
                    <i className="bi bi-plug me-2"></i>
                    {plugin.label}
                  </NavLink>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex-grow-1 d-flex flex-column">
        {/* Top bar */}
        <nav className="navbar navbar-expand navbar-light bg-light border-bottom px-3">
          <div className="ms-auto d-flex align-items-center gap-3">
            <span className="navbar-text text-muted">
              <i className="bi bi-person me-1"></i>
              {lang('home')}, <strong>{user.nickname || user.username}</strong>
              <span className="badge bg-secondary ms-2 align-middle">
                {isAdmin ? 'Admin' : 'Author'}
              </span>
            </span>
            <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
              <i className="bi bi-box-arrow-right me-1"></i>
              {lang('logout')}
            </button>
            <a
              href={publicUrl("/")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-primary btn-sm"
            >
              <i className="bi bi-house me-1"></i>
              {lang('home')}
            </a>
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-grow-1 p-4 bg-light">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
