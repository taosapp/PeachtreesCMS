import { useState, useEffect } from 'react'
import { usersAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { toast } from '../../utils/toast'

export default function Users() {
  const { user: currentUser, checkAuth } = useAuth()
  const { lang } = useLanguage()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  // Current user self-profile form
  const [profileForm, setProfileForm] = useState({
    username: '',
    nickname: '',
    email: '',
    password: ''
  })

  // Admin editing another user form
  const [editForm, setEditForm] = useState({
    id: '',
    username: '',
    nickname: '',
    email: '',
    password: ''
  })

  const isAdmin = currentUser?.id === 1

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        username: currentUser.username || '',
        nickname: currentUser.nickname || '',
        email: currentUser.email || '',
        password: '' // Keep password empty by default
      })
    }
  }, [currentUser])

  const loadUsers = async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const res = await usersAPI.getList()
      if (res.success) {
        setUsers(res.data)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    try {
      await usersAPI.update({
        id: currentUser.id,
        nickname: profileForm.nickname,
        email: profileForm.email,
        password: profileForm.password
      })
      
      // Clear password field
      setProfileForm(prev => ({ ...prev, password: '' }))
      toast(lang('success'), 'success')
      
      // Refresh Auth Context to sync email/nickname globally
      if (checkAuth) {
        await checkAuth()
      }
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handleStartEdit = (user) => {
    setEditingUser(user)
    setEditForm({
      id: user.id,
      username: user.username || '',
      nickname: user.nickname || '',
      email: user.email || '',
      role: parseInt(user.role ?? 2),
      password: '' // Keep password empty unless changing
    })
  }

  const handleEditUserSubmit = async (e) => {
    e.preventDefault()
    try {
      await usersAPI.update({
        id: editForm.id,
        username: editForm.username,
        nickname: editForm.nickname,
        email: editForm.email,
        role: editForm.role,
        password: editForm.password
      })
      setEditingUser(null)
      toast(lang('success'), 'success')
      loadUsers()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      username: formData.get('username'),
      nickname: formData.get('nickname'),
      email: formData.get('email'),
      password: formData.get('password')
    }

    try {
      await usersAPI.create(data)
      setShowAddForm(false)
      e.target.reset()
      loadUsers()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handleDeleteUser = async (id) => {
    if (!window.confirm(lang('deleteConfirm'))) return
    
    try {
      await usersAPI.delete(id)
      loadUsers()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div>
      {/* Edit Self Profile Section */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">
            <i className="bi bi-person-badge me-2"></i>
            {lang('editProfile')}
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleProfileUpdate}>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">{lang('username')}</label>
                <input
                  type="text"
                  className="form-control bg-light"
                  value={profileForm.username}
                  disabled
                  title={lang('usernameReadonly')}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">{lang('nickname')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={lang('nickname')}
                  value={profileForm.nickname}
                  onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">{lang('email')}</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder={lang('email')}
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">{lang('password')}</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder={lang('passwordKeepPlaceholder')}
                  value={profileForm.password}
                  onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                  minLength={6}
                />
              </div>
              <div className="col-12 text-end">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-save me-1"></i>
                  {lang('save')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* User management (admin only) */}
      {isAdmin && (
        <>
          {/* Admin Editing Another User Section */}
          {editingUser && (
            <div className="card shadow-sm mb-4 border-primary">
              <div className="card-header bg-white text-primary">
                <h5 className="mb-0">
                  <i className="bi bi-pencil-square me-2"></i>
                  {lang('editUser')}: {editingUser.username}
                </h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleEditUserSubmit}>
                  <div className="row g-3">
                    <div className="col-md-3">
                      <label className="form-label">{lang('username')}</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{lang('nickname')}</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.nickname}
                        onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                        placeholder={lang('nickname')}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{lang('email')}</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{lang('password')}</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder={lang('passwordKeepPlaceholder')}
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        minLength={6}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{lang('role')}</label>
                      <select 
                        className="form-select"
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: parseInt(e.target.value) })}
                      >
                        <option value="1">{lang('administrator')}</option>
                        <option value="2">{lang('author')}</option>
                      </select>
                    </div>
                    <div className="col-12 text-end gap-2 d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary">
                        <i className="bi bi-check-lg me-1"></i>
                        {lang('save')}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setEditingUser(null)}
                      >
                        {lang('cancel')}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="mb-0">
              <i className="bi bi-people me-2"></i>
              {lang('userList')}
            </h4>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setShowAddForm(!showAddForm)
                setEditingUser(null) // Close edit if adding
              }}
            >
              <i className="bi bi-plus-circle me-1"></i>
              {lang('addUser')}
            </button>
          </div>

          {showAddForm && (
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white">
                <h5 className="mb-0">
                  <i className="bi bi-person-plus me-2"></i>
                  {lang('addUser')}
                </h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddUser}>
                  <div className="row g-3">
                    <div className="col-md-3">
                      <label className="form-label">{lang('username')}</label>
                      <input
                        type="text"
                        name="username"
                        className="form-control"
                        placeholder={lang('username')}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{lang('nickname')}</label>
                      <input
                        type="text"
                        name="nickname"
                        className="form-control"
                        placeholder={lang('nickname')}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{lang('email')}</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder={lang('email')}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{lang('password')}</label>
                      <input
                        type="password"
                        name="password"
                        className="form-control"
                        placeholder={lang('password')}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{lang('role')}</label>
                      <select name="role" className="form-select" defaultValue="2">
                        <option value="1">{lang('administrator')}</option>
                        <option value="2">{lang('author')}</option>
                      </select>
                    </div>
                    <div className="col-12 text-end gap-2 d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary">
                        <i className="bi bi-check-lg me-1"></i>
                        {lang('submit')}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary"
                        onClick={() => setShowAddForm(false)}
                      >
                        {lang('cancel')}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">{lang('loading')}</span>
              </div>
            </div>
          ) : (
            <div className="card shadow-sm">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>{lang('username')}</th>
                      <th>{lang('nickname')}</th>
                      <th>{lang('role')}</th>
                      <th>{lang('email')}</th>
                      <th>{lang('registerTime')}</th>
                      <th>{lang('lastLogin')}</th>
                      <th style={{ width: '120px' }} className="text-center">{lang('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td className="align-middle">
                          <span className="fw-medium">
                            {user.username}
                            {user.id === 1 && (
                              <span className="badge bg-warning text-dark ms-2">Admin</span>
                            )}
                          </span>
                        </td>
                        <td className="align-middle text-muted">
                          {user.nickname || '-'}
                        </td>
                        <td className="align-middle">
                          <span className={`badge ${parseInt(user.role) === 1 ? 'bg-primary' : 'bg-secondary'}`}>
                            {parseInt(user.role) === 1 ? (lang('administrator') || '管理员') : (lang('author') || '普通用户')}
                          </span>
                        </td>
                        <td className="align-middle">
                          <a href={`mailto:${user.email}`} className="text-decoration-none">
                            {user.email}
                          </a>
                        </td>
                        <td className="align-middle text-muted">
                          <small>{user.created_at}</small>
                        </td>
                        <td className="align-middle text-muted">
                          <small>{user.last_login_at}</small>
                        </td>
                        <td className="text-center align-middle">
                          {user.id !== 1 && (
                            <div className="btn-group gap-1">
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleStartEdit(user)}
                                title={lang('edit')}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteUser(user.id)}
                                title={lang('delete')}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
