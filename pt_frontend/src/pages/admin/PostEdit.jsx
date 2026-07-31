import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { postsAPI, tagsAPI, stylesAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { uploadUrl } from '../../utils/path'
import { toast } from '../../utils/toast'
import MediaModal from '../../components/MediaModal'

const TiptapEditor = lazy(() => import('../../components/TiptapEditor'))

function isMp4(path) {
  return /\.mp4($|\?)/i.test(path)
}

export default function PostEdit({ forcedPostType = null }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverFileInputRef = useRef(null)
  const [tags, setTags] = useState([])
  const [patterns, setPatterns] = useState([])
  const [form, setForm] = useState({
    post_type: forcedPostType || 'normal',
    title: '',
    slug: '',
    tag: '',
    summary: '',
    cover_media: [], // Array of { path, caption }
    page_style: '',
    content: '',
    allow_comments: true,
    created_at: ''
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
      const res = await stylesAPI.getList()
      if (res.success) {
        setPatterns(res.data.styles || [])
      }
    } catch (err) {
      console.error('Failed to load patterns:', err)
    }
  }

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
        const data = res.data
        const coverMedia = Array.isArray(data.cover_media) 
          ? data.cover_media.map(item => typeof item === 'string' ? { path: item, caption: '' } : item)
          : []
          
        setForm({
          post_type: data.post_type || 'normal',
          title: data.title,
          slug: data.slug || '',
          tag: data.tag,
          summary: data.summary || '',
          cover_media: coverMedia,
          page_style: data.page_style || '',
          content: data.content,
          allow_comments: data.allow_comments === 1,
          created_at: data.created_at || ''
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
      toast(lang('required'), 'error')
      return
    }

    if (form.post_type === 'big-picture' && form.cover_media.length === 0) {
      toast(lang('bigPictureRequired'), 'error')
      return
    }

    setLoading(true)
    try {
      if (isEdit) {
        await postsAPI.update({ id, ...form })
      } else {
        await postsAPI.create(form)
      }
      navigate('/admin/posts')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleMediaSelect = (paths) => {
    const newItems = paths.map(path => ({ path, caption: '' }))
    setForm(prev => ({
      ...prev,
      cover_media: [...prev.cover_media, ...newItems]
    }))
  }

  const updateCaption = (index, caption) => {
    const nextList = [...form.cover_media]
    nextList[index].caption = caption
    setForm(prev => ({ ...prev, cover_media: nextList }))
  }

  const removeCoverMedia = (index) => {
    setForm(prev => ({ ...prev, cover_media: prev.cover_media.filter((_, i) => i !== index) }))
  }

  const moveCoverMedia = (index, direction) => {
    const nextList = [...form.cover_media]
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= nextList.length) return
    const temp = nextList[index]
    nextList[index] = nextList[targetIdx]
    nextList[targetIdx] = temp
    setForm(prev => ({ ...prev, cover_media: nextList }))
  }

  const clearAllCoverMedia = () => {
    if (window.confirm(lang('confirmClearCover'))) setForm(prev => ({ ...prev, cover_media: [] }))
  }

  const normalizeUploadResponse = (res) => {
    if (res && typeof res === 'object') {
      if (res.success) return res
      if (res.data?.success) return res.data
      if (res.paths) return { success: true, data: res }
    }
    return { success: false }
  }

  // uploadBigPicture returns { success: true, data: { paths: [...] } } already
  // axios interceptor returns response.data directly, so res = { success: true, data: { paths } }

  const uploadNormalMedia = async (file) => {
    const uploadForm = new FormData()
    uploadForm.append('file', file)
    const raw = await postsAPI.uploadMedia(uploadForm)
    const res = normalizeUploadResponse(raw)
    if (!res.success) throw new Error(res.message || lang('uploadFailed'))
    return res.data?.url || res.url || ''
  }

  const handleCoverDirectUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploadingCover(true)
    try {
      const uploadForm = new FormData()
      files.forEach(f => uploadForm.append('files[]', f))

      const raw = await postsAPI.uploadBigPicture(uploadForm)
      const res = normalizeUploadResponse(raw)

      if (res.success) {
        const paths = res.data?.paths || res.paths || []
        const newItems = paths.map(path => ({ path, caption: '' }))
        if (newItems.length > 0) {
          setForm(prev => ({
            ...prev,
            cover_media: [...prev.cover_media, ...newItems]
          }))
        }
      } else {
        throw new Error(res.message || lang('uploadFailed'))
      }
    } catch (err) {
      toast(err.message || lang('uploadFailed'), 'error')
    } finally {
      setUploadingCover(false)
      // Reset file input
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = ''
      }
    }
  }

  const triggerCoverUpload = () => {
    coverFileInputRef.current?.click()
  }

  const isBigPicture = form.post_type === 'big-picture'

  return (
    <div>
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin/posts">{lang('postList')}</Link></li>
          <li className="breadcrumb-item active">{isEdit ? lang('editPost') : lang('addPost')}</li>
        </ol>
      </nav>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          <div className="col-md-9">
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                {/* 1. Article Title */}
                <div className="mb-3">
                  <label className="form-label fw-bold">{lang('postTitle')} *</label>
                  <input type="text" name="title" className="form-control form-control-lg" value={form.title} onChange={handleChange} required />
                </div>

                {/* 2. Article Post Type (Radio Buttons) */}
                {!forcedPostType && (
                  <div className="mb-3">
                    <label className="form-label fw-bold d-block">{lang('postType')}</label>
                    <div className="d-flex gap-4 my-2">
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
                          {lang('postTypeNormal')}
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
                          {lang('postTypeBigPicture')}
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Big Picture Cover Media Manager (Rendered above Content, right below Post Type) */}
                {isBigPicture && (
                  <div className="mb-4 p-3 bg-light rounded border">
                    <label className="form-label fw-bold">{lang('coverMedia')} *</label>

                    {/* Upload buttons */}
                    <div className="d-flex gap-2 mb-3">
                      <input
                        ref={coverFileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/mp4"
                        style={{ display: 'none' }}
                        onChange={handleCoverDirectUpload}
                      />
                      <button
                        type="button"
                        className="btn btn-primary d-flex align-items-center"
                        onClick={triggerCoverUpload}
                        disabled={uploadingCover}
                      >
                        {uploadingCover ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            {lang('uploading')}
                          </>
                        ) : (
                          <>
                            <i className="bi bi-cloud-upload me-1"></i>
                            {lang('uploadImagesVideos')}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary d-flex align-items-center"
                        onClick={() => setShowMediaModal(true)}
                      >
                        <i className="bi bi-folder2-open me-1"></i>
                        {lang('selectFromLibrary')}
                      </button>
                    </div>

                    <div className="small text-muted mb-3">
                      <i className="bi bi-info-circle me-1"></i>
                      {lang('coverMediaHelp')}
                    </div>

                    {form.cover_media.length > 0 && (
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-semibold text-body">
                          <i className="bi bi-images me-1"></i>
                          {lang('mediaCountAdded').replace('{count}', form.cover_media.length)}
                        </span>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={clearAllCoverMedia}>
                          <i className="bi bi-trash3 me-1"></i> {lang('clearAll')}
                        </button>
                      </div>
                    )}

                    {form.cover_media.length === 0 && (
                      <div className="text-center py-4 text-muted border rounded bg-white">
                        <i className="bi bi-image display-6 d-block mb-2"></i>
                        <div className="small">{lang('noMediaYet')}</div>
                      </div>
                    )}

                    {form.cover_media.map((item, index) => (
                      <div key={index} className="card border shadow-sm bg-white mb-2">
                        <div className="card-body p-3">
                          <div className="d-flex gap-3">
                            {/* Thumbnail */}
                            <div className="flex-shrink-0 position-relative">
                              {isMp4(item.path) ? (
                                <video src={uploadUrl(item.path)} style={{ width: 120, height: 90, objectFit: 'cover', background: '#000', borderRadius: 6 }} />
                              ) : (
                                <img src={uploadUrl(item.path)} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 6 }} />
                              )}
                              <span className="position-absolute top-0 start-0 badge bg-primary rounded-pill m-1" style={{ fontSize: '0.65rem' }}>
                                {index + 1}
                              </span>
                              {isMp4(item.path) && (
                                <i className="bi bi-play-circle position-absolute top-50 start-50 translate-middle text-white fs-4"></i>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-grow-1 min-w-0">
                              <label className="form-label small mb-1">{lang('captionLabel')}</label>
                              <input
                                className="form-control form-control-sm mb-2"
                                placeholder="{lang('captionPlaceholder')}"
                                value={item.caption}
                                onChange={(e) => updateCaption(index, e.target.value)}
                              />
                              <div className="small text-muted text-truncate">
                                <i className="bi bi-file-earmark me-1"></i>
                                {item.path.split('/').pop()}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex-shrink-0 d-flex flex-column gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={index === 0}
                                onClick={() => moveCoverMedia(index, -1)}
                                title={lang('moveUp')}
                              >
                                <i className="bi bi-chevron-up"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={index === form.cover_media.length - 1}
                                onClick={() => moveCoverMedia(index, 1)}
                                title={lang('moveDown')}
                              >
                                <i className="bi bi-chevron-down"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeCoverMedia(index)}
                                title={lang('delete')}
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 4. Article Content Editor */}
                <div className="mb-3">
                  <label className="form-label fw-bold">{lang('postContent')}</label>
                  <Suspense fallback={<div>Loading...</div>}>
                    <TiptapEditor
                      value={form.content}
                      onChange={(next) => setForm(prev => ({ ...prev, content: next }))}
                      onUploadImage={uploadNormalMedia}
                      onUploadVideo={uploadNormalMedia}
                      onUploadAudio={uploadNormalMedia}
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar configuration panel (fixed width 240px) */}
          <div className="col-md-3">
            <div className="card shadow-sm p-3" style={{ minWidth: '240px' }}>
              <h6 className="fw-bold mb-3 border-bottom pb-2">{lang('publishSettings')}</h6>
              
              <div className="mb-3">
                <label className="form-label">{lang('customUrlLabel')}</label>
                <input type="text" name="slug" className="form-control" placeholder="about-us" value={form.slug} onChange={handleChange} />
              </div>

              <div className="mb-3">
                <label className="form-label">{lang('publishTime')}</label>
                <input type="datetime-local" className="form-control" value={form.created_at ? form.created_at.replace(' ', 'T').slice(0, 16) : ''} onChange={(e) => setForm({...form, created_at: e.target.value.replace('T', ' ') + ':00'})} />
              </div>

              <div className="mb-3">
                <label className="form-label">{lang('postCategory')}</label>
                <select name="tag" className="form-select" value={form.tag} onChange={handleChange} required>
                  {tags.map(t => <option key={t.id} value={t.tag}>{t.display_name}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">{lang('pageStyle')}</label>
                <select name="page_style" className="form-select" value={form.page_style} onChange={handleChange}>
                  <option value="">{lang('pageStyleDefault')}</option>
                  {patterns.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>

              <div className="form-check form-switch mb-4">
                <input className="form-check-input" type="checkbox" id="allowComments" checked={form.allow_comments} onChange={(e) => setForm({...form, allow_comments: e.target.checked})} />
                <label className="form-check-label" htmlFor="allowComments">{lang('allowComments')}</label>
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                <i className="bi bi-save me-1"></i>
                {lang('save')}
              </button>
            </div>
          </div>
        </div>
      </form>

      <MediaModal 
        isOpen={showMediaModal} 
        onClose={() => setShowMediaModal(false)} 
        onSelect={handleMediaSelect} 
      />
    </div>
  )
}
