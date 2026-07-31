import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { commentsAPI, postsAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import Pager from '../../components/Pager'
import { toast } from '../../utils/toast'

export default function Comments() {
  const [comments, setComments] = useState([])
  const [posts, setPosts] = useState({})
  const [loading, setLoading] = useState(true)
  const [batchLoading, setBatchLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [selectedIds, setSelectedIds] = useState(new Set())
  const { lang } = useLanguage()

  const page = pagination.page

  useEffect(() => {
    loadComments()
  }, [page, filter])

  const loadComments = async () => {
    setLoading(true)
    try {
      let params = { page, page_size: 20, flat: 1 }

      if (filter === 'pending') {
        params.status = 0
      } else if (filter === 'approved') {
        params.status = 1
      } else if (filter === 'rejected') {
        params.status = 2
      }

      const res = await commentsAPI.getList(params)
      if (res.success) {
        setComments(res.data.comments)
        setPagination(res.data.pagination)
        loadPostsInfo(res.data.comments)
      }
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPostsInfo = async (commentsList) => {
    const postIds = [...new Set(commentsList.map(c => c.post_id))]
    const postsMap = {}

    try {
      await Promise.all(
        postIds.map(async (postId) => {
          try {
            const res = await postsAPI.getOne(postId)
            if (res.success) {
              postsMap[postId] = res.data
            }
          } catch {
            postsMap[postId] = null
          }
        })
      )
      setPosts(postsMap)
    } catch (err) {
      console.error('Failed to load posts info:', err)
    }
  }

  const handleApprove = async (id, status) => {
    try {
      await commentsAPI.approve({ id, status })
      loadComments()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(lang('deleteConfirm'))) return

    try {
      await commentsAPI.delete(id)
      loadComments()
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

  const isAllSelected = comments.length > 0 && comments.every(c => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(comments.map(c => c.id)))
    }
  }

  const handleBatchSetStatus = async (status) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setBatchLoading(true)
    try {
      await commentsAPI.batchApprove(ids, status)
      setSelectedIds(new Set())
      loadComments()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBatchLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      0: { text: lang('commentStatusPending'), className: 'bg-warning text-dark' },
      1: { text: lang('commentStatusApproved'), className: 'bg-success' },
      2: { text: lang('commentStatusRejected'), className: 'bg-danger' }
    }
    return badges[status] || badges[0]
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-chat-dots me-2"></i>
          {lang('commentList')}
        </h4>
        <div className="btn-group">
          {['all', 'pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              className={`btn btn-outline-secondary ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status === 'all' && lang('commentList')}
              {status === 'pending' && lang('commentStatusPending')}
              {status === 'approved' && lang('commentStatusApproved')}
              {status === 'rejected' && lang('commentStatusRejected')}
            </button>
          ))}
        </div>
      </div>

      {/* Batch actions */}
      {selectedIds.size > 0 && (
        <div className="d-flex align-items-center gap-2 mb-3">
          <span className="text-muted small">{lang('selectedCount').replace('{count}', selectedIds.size)}</span>
          <button
            className="btn btn-sm btn-success"
            onClick={() => handleBatchSetStatus(1)}
            disabled={batchLoading}
          >
            <i className="bi bi-check-lg me-1"></i>
            {lang('setApproved')}
          </button>
          <button
            className="btn btn-sm btn-warning"
            onClick={() => handleBatchSetStatus(0)}
            disabled={batchLoading}
          >
            <i className="bi bi-clock me-1"></i>
            {lang('setPending')}
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => handleBatchSetStatus(2)}
            disabled={batchLoading}
          >
            <i className="bi bi-x-lg me-1"></i>
            {lang('setRejected')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{lang('loading')}</span>
          </div>
        </div>
      ) : comments.length === 0 ? (
        <div className="alert alert-info text-center">
          <i className="bi bi-info-circle me-2"></i>
          {lang('noComments')}
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
                    />
                  </th>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>{lang('commentContent')}</th>
                  <th style={{ width: '150px' }}>{lang('commentAuthor')}</th>
                  <th style={{ width: '200px' }}>{lang('commentPost')}</th>
                  <th style={{ width: '120px' }}>{lang('commentStatus')}</th>
                  <th style={{ width: '120px' }}>{lang('commentDate')}</th>
                  <th style={{ width: '200px' }} className="text-center">{lang('edit')}</th>
                </tr>
              </thead>
              <tbody>
                {comments.map(comment => {
                  const post = posts[comment.post_id]
                  return (
                    <tr key={comment.id}>
                      <td className="align-middle">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.has(comment.id)}
                          onChange={() => toggleSelect(comment.id)}
                        />
                      </td>
                      <td className="align-middle">{comment.id}</td>
                      <td className="align-middle">
                        <div className="text-truncate" style={{ maxWidth: '300px' }}>
                          {comment.content}
                        </div>
                      </td>
                      <td className="align-middle">
                        <div>
                          <strong>{comment.nickname}</strong>
                          <br />
                          <small className="text-muted">{comment.email}</small>
                        </div>
                      </td>
                      <td className="align-middle">
                        {post ? (
                          <span className="d-flex align-items-center gap-1">
                            <Link
                              to={`/post/${comment.post_id}`}
                              target="_blank"
                              className="text-decoration-none"
                            >
                              {post.title}
                            </Link>
                            {post.active != 1 && (
                              <span className="badge bg-secondary">{lang('unpublish')}</span>
                            )}
                          </span>
                        ) : post === null ? (
                          <span className="text-muted">{lang('commentPost')} #{comment.post_id}</span>
                        ) : (
                          <small className="text-muted">...</small>
                        )}
                      </td>
                      <td className="align-middle">
                        <span className={`badge ${getStatusBadge(comment.status).className}`}>
                          {getStatusBadge(comment.status).text}
                        </span>
                      </td>
                      <td className="align-middle text-muted">
                        <small>{comment.created_at?.split(' ')[0]}</small>
                      </td>
                      <td className="align-middle text-center">
                        <div className="btn-group btn-group-sm">
                          {comment.status === 0 && (
                            <>
                              <button
                                className="btn btn-outline-success"
                                onClick={() => handleApprove(comment.id, 1)}
                                title={lang('approveComment')}
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleApprove(comment.id, 2)}
                                title={lang('rejectComment')}
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(comment.id)}
                            title={lang('delete')}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
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
