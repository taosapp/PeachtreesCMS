import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { postsAPI, tagsAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

// 动态导入 Tiptap 编辑器，实现按需加载
const TiptapEditor = lazy(() => import('../../components/TiptapEditor'))

function toPublicPath(path) {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

function isMp4(path) {
  return /\.mp4($|\?)/i.test(path)
}

export default function PostEdit({ forcedPostType = null }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [tags, setTags] = useState([])
  const [patterns, setPatterns] = useState([])
  const [form, setForm] = useState({
    post_type: forcedPostType || 'normal',
    title: '',
    slug: '',
    tag: '',
    summary: '',
    cover_media: [],
    page_pattern: '',
    content: '',
    allow_comments: true
  })
  const { lang } = useLanguage()

  const isEdit = !!id

  useEffect(() => {
    loadTags()
    loadPatterns()
    if (isEdit) {
      loadPost()
    }
  }, [id])

  const loadPatterns = async () => {
    try {
      const res = await fetch('/pt_api/patterns/index.php')
      const data = await res.json()
      if (data.success) {
        setPatterns(data.data.patterns || [])
      }
    } catch (err) {
      console.error('Failed to load patterns:', err)
    }
  }

  useEffect(() => {
    if (!isEdit && forcedPostType) {
      setForm(prev => ({ ...prev, post_type: forcedPostType }))
    }
  }, [forcedPostType, isEdit])

  const loadTags = async () => {
    try {
      const res = await tagsAPI.getList()
      if (res.success) {
        setTags(res.data)
        if (!isEdit && res.data.length > 0) {
          setForm(prev => ({ ...prev, tag: res.data[0].tag }))
        }
      }
    } catch (err) {
      console.error('Failed to load tags:', err)
    }
  }

  const loadPost = async () => {
    setLoading(true)
    try {
      const res = await postsAPI.getOne(id)
      if (res.success) {
        setForm({
          post_type: res.data.post_type || 'normal',
          title: res.data.title,
          slug: res.data.slug || '',
          tag: res.data.tag,
          summary: res.data.summary || '',
          cover_media: Array.isArray(res.data.cover_media) ? res.data.cover_media : [],
          page_pattern: res.data.page_pattern || '',
          content: res.data.content,
          allow_comments: res.data.allow_comments === 1
        })
      }
    } catch (err) {
      console.error('Failed to load post:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.title.trim()) {
      alert(lang('required'))
      return
    }

    if (form.post_type === 'big-picture' && form.cover_media.length === 0) {
      alert(lang('bigPictureRequired'))
      return
    }

    setLoading(true)
    try {
      if (isEdit) {
        console.log('Submitting update:', { id, ...form })
        const res = await postsAPI.update({ id, ...form })
        console.log('Update response:', res)
      } else {
        const res = await postsAPI.create(form)
        console.log('Create response:', res)
      }
      navigate('/admin/posts')
    } catch (err) {
      console.error('Submit error:', err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCoverUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4']
    const invalidFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase()
      return !allowedExts.includes(ext)
    })

    if (invalidFiles.length > 0) {
      alert(`${lang('invalidFileFormat')}\n${invalidFiles.map(f => f.name).join('\n')}\n\n${lang('supportedFormats')}: ${allowedExts.join(', ')}`)
      e.target.value = ''
      return
    }

    const uploadForm = new FormData()
    files.forEach(file => uploadForm.append('files[]', file))

    setUploadingCover(true)
    try {
      const raw = await postsAPI.uploadBigPicture(uploadForm)
      const res = normalizeUploadResponse(raw)
      if (!res.success) throw new Error(res.message || '上传失败')
      const next = Array.isArray(res.data?.paths) ? res.data.paths : []
      setForm(prev => ({
        ...prev,
        cover_media: [...prev.cover_media, ...next]
      }))
    } catch (err) {
      alert(err.message)
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  const removeCoverMedia = (index) => {
    setForm(prev => ({
      ...prev,
      cover_media: prev.cover_media.filter((_, i) => i !== index)
    }))
  }

  const moveCoverMedia = (index, direction) => {
    const nextList = [...form.cover_media]
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= nextList.length) return

    // Swap
    const temp = nextList[index]
    nextList[index] = nextList[targetIdx]
    nextList[targetIdx] = temp

    setForm(prev => ({ ...prev, cover_media: nextList }))
  }

  const clearAllCoverMedia = () => {
    if (window.confirm(lang('confirmClearCover'))) {
      setForm(prev => ({ ...prev, cover_media: [] }))
    }
  }

  const normalizeUploadResponse = (res) => {
    if (res && typeof res === 'object') {
      if (Object.prototype.hasOwnProperty.call(res, 'success')) return res
      if (res.data && typeof res.data === 'object' && Object.prototype.hasOwnProperty.call(res.data, 'success')) {
        return res.data
      }
      if (res.url || res.path || res.paths) {
        return { success: true, data: res }
      }
      return res
    }

    if (typeof res === 'string') {
      const start = res.indexOf('{')
      const end = res.lastIndexOf('}')
      if (start !== -1 && end > start) {
        try {
          const parsed = JSON.parse(res.slice(start, end + 1))
          if (parsed && typeof parsed === 'object') return parsed
        } catch {
          // ignore parse error and fall through
        }
      }
    }

    return {}
  }

  const uploadNormalMedia = async (file) => {
    const uploadForm = new FormData()
    uploadForm.append('file', file)
    const raw = await postsAPI.uploadMedia(uploadForm)
    const res = normalizeUploadResponse(raw)
    if (!res.success) {
      throw new Error(res.message || '上传失败')
    }
    const mediaUrl = res.data?.url || res.url || ''
    if (!mediaUrl) {
      throw new Error('上传成功但未返回媒体地址')
    }
    return mediaUrl
  }

  const isBigPicture = form.post_type === 'big-picture'

  return (
    <div>
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/admin/posts">{lang('postList')}</Link>
          </li>
          <li className="breadcrumb-item active">
            {isEdit ? lang('editPost') : lang('addPost')}
          </li>
        </ol>
      </nav>

      <div className="card shadow-sm position-relative">
        {uploadingCover && (
          <div
            className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center rounded"
            style={{
              background: 'rgba(255, 255, 255, 0.8)',
              zIndex: 1050,
              top: 0,
              left: 0
            }}
          >
            <div className="spinner-border text-primary mb-2" role="status"></div>
            <div className="fw-bold text-primary">{lang('uploadingCover')}</div>
            <div className="small text-muted mt-1">{lang('doNotClosePage')}</div>
          </div>
        )}
        <div className="card-header bg-white">
          <h4 className="mb-0">
            <i className={`bi ${isEdit ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
            {isEdit ? lang('editPost') : lang('addPost')}
          </h4>
        </div>

        {loading && !form.title ? (
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">{lang('loading')}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">
                  <i className="bi bi-type me-1"></i>
                  {lang('postTitle')} <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  className="form-control form-control-lg"
                  placeholder={lang('postTitle')}
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  <i className="bi bi-link me-1"></i>
                  {lang('customSlug')}
                </label>
                <div className="input-group">
                  <span className="input-group-text">/post/</span>
                  <input
                    type="text"
                    name="slug"
                    className="form-control"
                    placeholder="about-us"
                    value={form.slug}
                    onChange={handleChange}
                  />
                </div>
                <small className="text-muted">
                  {lang('customSlugHelp')}
                </small>
              </div>

              {!forcedPostType && (
                <div className="mb-3">
                  <label className="form-label">
                    <i className="bi bi-collection me-1"></i>
                    {lang('postType')}
                  </label>
                  <div className="d-flex gap-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="post_type"
                        id="postTypeNormal"
                        value="normal"
                        checked={form.post_type === 'normal'}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="postTypeNormal">
                        normal
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="post_type"
                        id="postTypeBigPicture"
                        value="big-picture"
                        checked={form.post_type === 'big-picture'}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="postTypeBigPicture">
                        big-picture
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {patterns.length > 0 && (
                <div className="mb-3">
                  <label className="form-label">
                    <i className="bi bi-palette me-1"></i>
                    {lang('pagePattern')}
                  </label>
                  <select
                    name="page_pattern"
                    className="form-select"
                    value={form.page_pattern}
                    onChange={handleChange}
                  >
                    <option value="">{lang('pagePatternDefault')}</option>
                    {patterns.map(pattern => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.name}
                      </option>
                    ))}
                  </select>
                  {form.page_pattern && (
                    <small className="text-muted d-block mt-1">
                      {patterns.find(p => p.id === form.page_pattern)?.description || ''}
                    </small>
                  )}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">
                  <i className="bi bi-tags me-1"></i>
                  {lang('postCategory')} <span className="text-danger">*</span>
                </label>
                <select
                  name="tag"
                  className="form-select"
                  value={form.tag}
                  onChange={handleChange}
                  required
                >
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.tag}>
                      {tag.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {isBigPicture && (
                <>
                  <div className="mb-3">
                    <label className="form-label">
                      <i className="bi bi-card-text me-1"></i>
                      {lang('coverSummary')}
                    </label>
                    <textarea
                      name="summary"
                      className="form-control"
                      rows="3"
                      placeholder={lang('coverSummaryPlaceholder')}
                      value={form.summary}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      <i className="bi bi-images me-1"></i>
                      {lang('coverMedia')}
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
                      multiple
                      onChange={handleCoverUpload}
                      disabled={uploadingCover}
                    />
                    <small className="text-muted">
                      {lang('coverMediaPath')}
                    </small>
                  </div>

                  {form.cover_media.length > 0 && (
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-muted small">
                          {lang('uploadedFiles')}: {form.cover_media.length}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={clearAllCoverMedia}
                        >
                          <i className="bi bi-trash-fill me-1"></i>
                          {lang('clearAll')}
                        </button>
                      </div>
                      <div className="row g-3">
                        {form.cover_media.map((path, index) => (
                          <div key={`${path}-${index}`} className="col-md-4">
                            <div className="card h-100 border shadow-none bg-light">
                              <div className="position-relative">
                                {isMp4(path) ? (
                                  <video src={toPublicPath(path)} className="card-img-top rounded-0" style={{ maxHeight: '180px', objectFit: 'contain', background: '#000' }} />
                                ) : (
                                  <img
                                    src={toPublicPath(path)}
                                    alt="cover"
                                    className="card-img-top rounded-0"
                                    style={{ maxHeight: '180px', objectFit: 'cover' }}
                                  />
                                )}
                                <div className="position-absolute top-0 end-0 p-1">
                                  <button
                                    type="button"
                                    className="btn btn-dark btn-sm p-1 rounded-circle"
                                    style={{ width: '24px', height: '24px', lineHeight: '1', opacity: 0.8 }}
                                    onClick={() => removeCoverMedia(index)}
                                    title={lang('remove')}
                                  >
                                    <i className="bi bi-x"></i>
                                  </button>
                                </div>
                              </div>
                              <div className="card-body p-2 d-flex flex-column">
                                <div className="small text-muted text-break flex-grow-1 mb-2" style={{ fontSize: '0.75rem' }}>
                                  {path.split('/').pop()}
                                </div>
                                <div className="d-flex gap-1 justify-content-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light border"
                                    disabled={index === 0}
                                    onClick={() => moveCoverMedia(index, -1)}
                                    title={lang('moveForward')}
                                  >
                                    <i className="bi bi-arrow-left"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light border"
                                    disabled={index === form.cover_media.length - 1}
                                    onClick={() => moveCoverMedia(index, 1)}
                                    title={lang('moveBackward')}
                                  >
                                    <i className="bi bi-arrow-right"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mb-3">
                <label className="form-label">
                  <i className="bi bi-body-text me-1"></i>
                  {lang('postContent')}
                </label>
                <Suspense fallback={
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading editor...</span>
                    </div>
                    <p className="text-muted mt-2">Loading editor...</p>
                  </div>
                }>
                  <TiptapEditor
                    value={form.content}
                    onChange={(nextContent) => setForm(prev => ({ ...prev, content: nextContent }))}
                    onUploadImage={uploadNormalMedia}
                    onUploadVideo={uploadNormalMedia}
                    onUploadAudio={uploadNormalMedia}
                  />
                </Suspense>
              </div>

              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="allowComments"
                    name="allow_comments"
                    checked={form.allow_comments}
                    onChange={(e) => setForm({ ...form, allow_comments: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="allowComments">
                    <i className="bi bi-chat-dots me-1"></i>
                    {lang('allowComments')}
                  </label>
                </div>
              </div>
            </div>

            <div className="card-footer bg-white d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    {lang('loading')}
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1"></i>
                    {lang('submit')}
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/admin/posts')}
              >
                <i className="bi bi-x-lg me-1"></i>
                {lang('cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
