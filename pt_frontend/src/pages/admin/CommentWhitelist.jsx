import { useEffect, useState } from 'react'
import { commentsAPI } from '../../services/api'
import Pager from '../../components/Pager'
import { useLanguage } from '../../contexts/LanguageContext'
import { toast } from '../../utils/toast'

const STATUS_BADGE = {
  trusted: 'bg-success',
  blocked: 'bg-danger'
}

export default function CommentWhitelist() {
  const { lang } = useLanguage()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 })
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    email: '',
    status: 'trusted',
    reason: '',
    expires_at: ''
  })

  const STATUS_TEXT = {
    trusted: lang('trusted'),
    blocked: lang('blocked')
  }

  useEffect(() => {
    loadWhitelist()
  }, [pagination.page, filter, keyword])

  const loadWhitelist = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        page_size: 20
      }
      if (filter !== 'all') params.status = filter
      if (keyword.trim()) params.keyword = keyword.trim()
      const res = await commentsAPI.getWhitelist(params)
      if (res.success) {
        setItems(Array.isArray(res.data.items) ? res.data.items : [])
        setPagination(res.data.pagination || { page: 1, total_pages: 1 })
      }
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    setKeyword(searchText.trim())
  }

  const handleSetStatus = async (e) => {
    e.preventDefault()
    if (!form.email.trim()) {
      toast(lang('enterCommentEmail'), 'error')
      return
    }
    setSaving(true)
    try {
      await commentsAPI.setWhitelist({
        email: form.email.trim(),
        status: form.status,
        reason: form.reason.trim(),
        expires_at: form.expires_at ? `${form.expires_at} 23:59:59` : null
      })
      await loadWhitelist()
      setForm(prev => ({ ...prev, reason: '', expires_at: '' }))
      toast(lang('whitelistStatusUpdated'), 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const quickSet = async (email, status) => {
    setSaving(true)
    try {
      await commentsAPI.setWhitelist({ email, status })
      await loadWhitelist()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-shield-check me-2"></i>
          {lang('commentWhitelist')}
        </h4>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <strong>{lang('setUserStatus')}</strong>
        </div>
        <div className="card-body">
          <form onSubmit={handleSetStatus} className="row g-2">
            <div className="col-md-4">
              <input
                className="form-control"
                type="email"
                placeholder={lang('commentEmail')}
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="trusted">{lang('trusted')}</option>
                <option value="blocked">{lang('blocked')}</option>
                <option value="none">{lang('removeFromWhitelist')}</option>
              </select>
            </div>
            <div className="col-md-3">
              <input
                className="form-control"
                type="text"
                placeholder={lang('reasonOptional')}
                value={form.reason}
                onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm(prev => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>
            <div className="col-md-1 d-grid">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {lang('save')}
              </button>
            </div>
          </form>
          <div className="small text-muted mt-2">
            {lang('whitelistHelp')}
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <form onSubmit={handleSearch} className="row g-2">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder={lang('searchEmailOrNickname')}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value)
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
              >
                <option value="all">{lang('allStatus')}</option>
                <option value="trusted">{lang('trusted')}</option>
                <option value="blocked">{lang('blocked')}</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" type="submit">
                {lang('search')}
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="alert alert-info m-3 mb-0">{lang('noWhitelistRecords')}</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>{lang('email')}</th>
                  <th>{lang('nickname')}</th>
                  <th>{lang('status')}</th>
                  <th>{lang('reason')}</th>
                  <th>{lang('expiresAt')}</th>
                  <th>{lang('updatedAt')}</th>
                  <th className="text-center">{lang('edit')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.email}</td>
                    <td>{item.nickname || '-'}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[item.status] || 'bg-secondary'}`}>
                        {STATUS_TEXT[item.status] || item.status}
                      </span>
                    </td>
                    <td>{item.reason || '-'}</td>
                    <td>{item.expires_at || lang('permanent')}</td>
                    <td>{item.updated_at || '-'}</td>
                    <td className="text-center">
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-success"
                          onClick={() => quickSet(item.email, 'trusted')}
                          disabled={saving}
                        >
                          {lang('trusted')}
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => quickSet(item.email, 'blocked')}
                          disabled={saving}
                        >
                          {lang('blocked')}
                        </button>
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => quickSet(item.email, 'none')}
                          disabled={saving}
                        >
                          {lang('remove')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pager
        page={pagination.page || 1}
        totalPages={pagination.total_pages || 1}
        onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
      />
    </div>
  )
}

