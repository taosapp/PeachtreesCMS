import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { postsAPI, tagsAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import Pager from '../../components/Pager'
import { publicUrl } from '../../utils/path'
import { toast } from '../../utils/toast'

export default function PostList() {
  const [posts, setPosts] = useState([])
  const [tags, setTags] = useState([])
  const [filterTag, setFilterTag] = useState('')
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [batchLoading, setBatchLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const { lang } = useLanguage()
  const { user: currentUser } = useAuth()

  const canManagePost = (post) => {
    if (!currentUser) return false;
    // Admins (role = 1) can edit/delete any post
    if (currentUser.role === 1) return true;
    // Authors (role = 2) can only edit/delete their own posts
    return parseInt(post.user_id) === parseInt(currentUser.id);
  }

  const page = pagination.page

  useEffect(() => {
    loadTags()
  }, [])

  useEffect(() => {
    loadPosts()
  }, [page, filterTag])

  const loadTags = async () => {
    try {
      const res = await tagsAPI.getList()
      if (res.success) {
        setTags(res.data)
      }
    } catch (err) {
      console.error('Failed to load tags:', err)
    }
  }

  const loadPosts = async () => {
    setLoading(true)
    try {
      const params = { page, perPage: 15, showInactive: true }
      if (filterTag) {
        params.tag = filterTag
      }
      const res = await postsAPI.getList(params)
      if (res.success) {
        setPosts(res.data.posts)
        setPagination(res.data.pagination)
      }
      // clear selection on page / filter change
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Failed to load posts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(lang('deleteConfirm'))) return

    try {
      await postsAPI.delete(id)
      loadPosts()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handleToggleActive = async (id, currentActive) => {
    try {
      await postsAPI.toggleActive(id)
      loadPosts()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isAllSelected = posts.length > 0 && posts.every(p => selectedIds.has(p.id))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(posts.map(p => p.id)))
    }
  }

  const handleBatchUnpublish = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const msg = lang('batchUnpublishConfirm').replace('{count}', ids.length)
    if (!window.confirm(msg)) return

    setBatchLoading(true)
    try {
      await postsAPI.batchToggle(ids, 0)
      setSelectedIds(new Set())
      loadPosts()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBatchLoading(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-file-text me-2"></i>
          {lang('postList')}
        </h4>
        <Link to="/admin/posts/new" className="btn btn-primary">
          <i className="bi bi-plus-circle me-1"></i>
          {lang('addPost')}
        </Link>
      </div>

      {/* Filter bar */}
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={filterTag}
            onChange={e => {
              setFilterTag(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
          >
            <option value="">{lang('allCategories')}</option>
            {tags.map(tag => (
              <option key={tag.id} value={tag.tag}>{tag.display_name}</option>
            ))}
          </select>
        </div>

        {/* Batch actions */}
        {selectedIds.size > 0 && (
          <div className="d-flex align-items-center gap-2 ms-auto">
            <span className="text-muted small">{lang('postsCountSelected').replace('{count}', selectedIds.size)}</span>
            <button
              className="btn btn-sm btn-warning"
              onClick={handleBatchUnpublish}
              disabled={batchLoading}
            >
              {batchLoading ? (
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
              ) : (
                <i className="bi bi-download me-1"></i>
              )}
              {lang('batchUnpublish')}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{lang('loading')}</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger text-center">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="alert alert-info text-center">
          <i className="bi bi-info-circle me-2"></i>
          {lang('noPosts')}
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      title={isAllSelected ? lang('deselectAll') : lang('selectAll')}
                    />
                  </th>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>{lang('postTitle')}</th>
                  <th style={{ width: '120px' }}>{lang('postCategory')}</th>
                  <th style={{ width: '120px' }}>{lang('postDate')}</th>
                  <th style={{ width: '160px' }} className="text-center">{lang('edit')}</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => {
                  const allowed = canManagePost(post);
                  return (
                    <tr key={post.id}>
                      <td className="align-middle">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.has(post.id)}
                          onChange={() => toggleSelect(post.id)}
                          disabled={!allowed}
                        />
                      </td>
                      <td className="align-middle">{post.id}</td>
                      <td className="align-middle">
                        <a href={publicUrl(`/#/post/${post.slug || post.id}`)} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                          {post.title}
                        </a>
                        {post.post_type === 'big-picture' && (
                          <span className="badge bg-dark ms-2">big-picture</span>
                        )}
                        {post.slug && (
                          <span className="badge bg-light text-secondary ms-2">
                            {post.slug}
                          </span>
                        )}
                      </td>
                      <td className="align-middle">
                        <span className="badge bg-secondary">{post.display_name}</span>
                      </td>
                      <td className="align-middle text-muted">
                        <small>{post.created_at || ''}</small>
                      </td>
                      <td className="align-middle text-center">
                        {!allowed ? (
                          <span className="text-muted small border border-light p-1 bg-white rounded shadow-2xs" title={lang('readOnlyTitle')}>
                            <i className="bi bi-lock-fill text-secondary me-1"></i>
                            {lang('readOnly')}
                          </span>
                        ) : (
                          <div className="btn-group btn-group-sm">
                            <Link
                              to={`/admin/posts/edit/${post.id}`}
                              className="btn post-action-btn post-action-edit"
                              title={lang('edit')}
                            >
                              <i className="bi bi-pen"></i>
                            </Link>
                            {post.active == 1 ? (
                              <button
                                className="btn post-action-btn post-action-toggle active"
                                onClick={() => handleToggleActive(post.id, post.active)}
                                title={lang('unpublish')}
                              >
                                <i className="bi bi-download"></i>
                              </button>
                            ) : (
                              <button
                                className="btn post-action-btn post-action-toggle"
                                onClick={() => handleToggleActive(post.id, post.active)}
                                title={lang('publish')}
                              >
                                <i className="bi bi-upload"></i>
                              </button>
                            )}
                            <button
                              className="btn post-action-btn post-action-delete"
                              onClick={() => handleDelete(post.id)}
                              title={lang('delete')}
                            >
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pager
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
