import { useState, useEffect } from 'react'
import { tagsAPI, stylesAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { toast } from '../../utils/toast'

export default function Tags() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ tag: '', display_name: '', page_style: '' })
  const [patterns, setPatterns] = useState([])
  const { lang } = useLanguage()

  useEffect(() => {
    loadTags()
    loadPatterns()
  }, [])

  const loadPatterns = async () => {
    try {
      const res = await stylesAPI.getList()
      if (res.success) {
        setPatterns(res.data.styles || [])
      }
    } catch (err) {
      console.error('Failed to load patterns:', err)
    }
  }

  const loadTags = async () => {
    setLoading(true)
    try {
      const res = await tagsAPI.getList()
      if (res.success) {
        setTags(res.data)
      }
    } catch (err) {
      console.error('Failed to load tags:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.tag || !form.display_name) {
      toast(lang('required'), 'error')
      return
    }

    try {
      await tagsAPI.create(form)
      setForm({ tag: '', display_name: '', page_style: '' })
      loadTags()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handleUpdate = async (id) => {
    const tag = tags.find(t => t.id === id)
    if (!tag) return

    try {
      await tagsAPI.update({ id, tag: tag.tag, display_name: tag.display_name, page_style: tag.page_style })
      setEditingId(null)
      loadTags()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(lang('deleteConfirm'))) return
    
    try {
      await tagsAPI.delete(id)
      loadTags()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handleTagChange = (id, field, value) => {
    setTags(tags.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ))
  }

  return (
    <div>
      <h4 className="mb-4">
        <i className="bi bi-tags me-2"></i>
        {lang('tagList')}
      </h4>

      {/* Add form */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">
            <i className="bi bi-plus-circle me-2"></i>
            {lang('addTag')}
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleAdd}>
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label">{lang('tagName')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={lang('tagName')}
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">{lang('tagSlug')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={lang('tagSlug')}
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                />
              </div>
              {patterns.length > 0 && (
                <div className="col-md-3">
                  <label className="form-label">{lang('tagPageStyle')}</label>
                  <select
                    className="form-select"
                    value={form.page_style}
                    onChange={(e) => setForm({ ...form, page_style: e.target.value })}
                  >
                    <option value="">{lang('tagPageStyleDefault')}</option>
                    {patterns.map(pattern => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={`col-md-${patterns.length > 0 ? 3 : 4}`}>
                <button type="submit" className="btn btn-primary w-100">
                  <i className="bi bi-plus-lg me-1"></i>
                  {lang('add')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Tag list */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{lang('loading')}</span>
          </div>
        </div>
      ) : tags.length === 0 ? (
        <div className="alert alert-info text-center">
          <i className="bi bi-info-circle me-2"></i>
          {lang('noTags')}
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '80px' }} className="text-center">{lang('tagCount')}</th>
                  <th>{lang('tagName')}</th>
                  <th>{lang('tagSlug')}</th>
                  <th>{lang('tagPageStyle')}</th>
                  <th style={{ width: '180px' }} className="text-center">{lang('edit')}</th>
                </tr>
              </thead>
              <tbody>
                {tags.map(tag => (
                  <tr key={tag.id}>
                    <td className="text-center align-middle">
                      <span className="badge bg-primary rounded-pill">{tag.post_count}</span>
                    </td>
                    <td className="align-middle">
                      {editingId === tag.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={tag.display_name}
                          onChange={(e) => handleTagChange(tag.id, 'display_name', e.target.value)}
                        />
                      ) : (
                        <span className="fw-medium">{tag.display_name}</span>
                      )}
                    </td>
                    <td className="align-middle">
                      {editingId === tag.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={tag.tag}
                          onChange={(e) => handleTagChange(tag.id, 'tag', e.target.value)}
                        />
                      ) : (
                        <code>{tag.tag}</code>
                      )}
                    </td>
                    <td className="align-middle">
                      {editingId === tag.id && patterns.length > 0 ? (
                        <select
                          className="form-select form-select-sm"
                          value={tag.page_style || ''}
                          onChange={(e) => handleTagChange(tag.id, 'page_style', e.target.value)}
                        >
                          <option value="">{lang('tagPageStyleDefault')}</option>
                          {patterns.map(pattern => (
                            <option key={pattern.id} value={pattern.id}>
                              {pattern.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-muted small">
                          {patterns.find(p => p.id === tag.page_style)?.name || tag.page_style || '-'}
                        </span>
                      )}
                    </td>
                    <td className="text-center align-middle">
                      {editingId === tag.id ? (
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-success"
                            onClick={() => handleUpdate(tag.id)}
                            title={lang('save')}
                          >
                            <i className="bi bi-check-lg"></i>
                          </button>
                          <button 
                            className="btn btn-outline-secondary"
                            onClick={() => setEditingId(null)}
                            title={lang('cancel')}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-outline-primary"
                            onClick={() => setEditingId(tag.id)}
                            title={lang('edit')}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button 
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(tag.id)}
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
    </div>
  )
}
