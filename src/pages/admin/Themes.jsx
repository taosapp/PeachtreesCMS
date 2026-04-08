import { useState, useEffect } from 'react'
import { themesAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

const THUMBNAIL_FILES = ['thumbnail.svg', 'thumbnail.webp', 'thumbnail.png', 'thumbnail.jpg', 'thumbnail.jpeg', 'thumbnail.gif']

function ThemeThumbnail({ slug, name, thumbnail }) {
  const { lang } = useLanguage()
  const candidates = [
    thumbnail,
    ...THUMBNAIL_FILES.filter(f => f !== thumbnail)
  ].filter(Boolean).map((file) => `/theme/${encodeURIComponent(slug)}/${file}`)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState(false)

  const src = index < candidates.length ? candidates[index] : null

  const handleError = () => {
    if (index < candidates.length - 1) {
      setIndex((prev) => prev + 1)
    } else {
      setError(true)
    }
  }

  if (error || !src) {
    // 显示默认占位符
    return (
      <div
        className="theme-card-thumb d-flex align-items-center justify-content-center bg-light text-muted"
      >
        <div className="text-center">
          <i className="bi bi-image fs-1 d-block mb-2"></i>
          <small className="d-block">{lang('noThumbnail')}</small>
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`${name} thumbnail`}
      className="theme-card-thumb w-100 object-fit-cover"
      onError={handleError}
      loading="lazy"
    />
  )
}

export default function Themes() {
  const { lang } = useLanguage()
  const [themes, setThemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [switchingSlug, setSwitchingSlug] = useState('')

  useEffect(() => {
    loadThemes()
  }, [])

  const loadThemes = async () => {
    setLoading(true)
    try {
      const res = await themesAPI.getList()
      if (res.success) {
        setThemes(Array.isArray(res.data.themes) ? res.data.themes : [])
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetActive = async (slug) => {
    if (!slug) return
    setSwitchingSlug(slug)
    try {
      const res = await themesAPI.setActive({ slug })
      if (res.success) {
        await loadThemes()
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setSwitchingSlug('')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-palette me-2"></i>
          {lang('themeManagement')}
        </h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={loadThemes} disabled={loading}>
            <i className="bi bi-arrow-repeat me-1"></i>
            {lang('scanLocalThemes')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : themes.length === 0 ? (
        <div className="alert alert-warning">{lang('noThemeFound')}</div>
      ) : (
        <div className="row g-3">
          {themes.map((theme) => (
            <div key={theme.id} className="col-12 col-md-4 col-xl-2">
              <div className="card shadow-sm h-80 theme-card">
                <div className="position-relative">
                  <ThemeThumbnail slug={theme.slug} name={theme.name} thumbnail={theme.thumbnail} />
                  <span className={`badge position-absolute top-0 end-0 m-2 ${theme.is_active === 1 ? 'bg-success' : 'bg-secondary'}`}>
                    {theme.is_active === 1 ? lang('enabled') : lang('disabled')}
                  </span>
                </div>
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className="card-title mb-0">{theme.name}</h6>
                  </div>
                  <div className="small text-muted mb-2">
                    <code>{theme.slug}</code>
                  </div>
                  <div className="small text-muted mb-2">
                    {lang('version')} {theme.version || '-'} · {theme.author || lang('unknownAuthor')}
                  </div>
                  <p className="card-text text-muted small flex-grow-1 mb-3">
                    {theme.description || lang('noDescription')}
                  </p>
                  <div className="d-grid gap-2" style={{ height: '42px' }}>
                    {theme.is_active !== 1 && (
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={switchingSlug === theme.slug}
                        onClick={() => handleSetActive(theme.slug)}
                      >
                        {lang('enable')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
