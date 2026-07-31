import { useEffect, useMemo, useState } from 'react'
import { mediaAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { uploadUrl } from '../../utils/path'
import { toast } from '../../utils/toast'

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export default function Media() {
  const { lang } = useLanguage()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [page, setPage] = useState(1)

  const perPage = 50

  const loadFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await mediaAPI.getList()
      if (res.success) {
        setFiles(res.data.files || [])
      } else {
        setError(res.message || lang('error'))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [filter, monthFilter])

  const monthOptions = useMemo(() => {
    const options = new Set()
    files.forEach((file) => {
      if (!file.modified_at) return
      const month = file.modified_at.slice(0, 7)
      if (month.length === 7) options.add(month)
    })
    return Array.from(options).sort().reverse()
  }, [files])

  const filteredFiles = useMemo(() => {
    let result = files
    if (filter !== 'all') {
      result = result.filter((file) => file.type === filter)
    }
    if (monthFilter !== 'all') {
      result = result.filter((file) => file.modified_at?.startsWith(monthFilter))
    }
    return result
  }, [files, filter, monthFilter])

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / perPage))
  const pagedFiles = useMemo(() => {
    const start = (page - 1) * perPage
    return filteredFiles.slice(start, start + perPage)
  }, [filteredFiles, page])

  const handleDelete = async (file) => {
    if (!window.confirm(lang('deleteFileConfirm'))) return
    try {
      await mediaAPI.delete(file.path)
      setFiles((prev) => prev.filter((item) => item.path !== file.path))
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const handleUpload = async (event) => {
    const selected = Array.from(event.target.files || [])
    if (selected.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      selected.forEach((file) => formData.append('files[]', file))
      await mediaAPI.upload(formData)
      await loadFiles()
      setPage(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const renderPreview = (file) => {
    const src = uploadUrl(file.url || file.path)
    if (file.type === 'image') {
      return <img src={src} alt={file.path} className="media-thumb" />
    }
    if (file.type === 'video') {
      return (
        <video className="media-thumb" controls src={src}>
          {lang('loading')}
        </video>
      )
    }
    if (file.type === 'audio') {
      return (
        <audio className="media-audio" controls src={src}>
          {lang('loading')}
        </audio>
      )
    }
    return null
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="mb-0">{lang('mediaLibrary')}</h2>
        <div className="d-flex align-items-center gap-2">
          <label className="btn btn-primary btn-sm mb-0">
            <i className="bi bi-upload me-1"></i>
            {uploading ? lang('uploading') : lang('mediaUpload')}
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              className="d-none"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <button className="btn btn-outline-secondary btn-sm" onClick={loadFiles} disabled={uploading}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            {lang('refresh')}
          </button>
        </div>
      </div>
      <div className="text-muted small mb-3">{lang('mediaUploadHint')}</div>

      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="btn-group" role="group" aria-label="media filter">
        <button
          type="button"
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setFilter('all')}
        >
          {lang('mediaTypeAll')}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filter === 'image' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setFilter('image')}
        >
          {lang('mediaTypeImage')}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filter === 'video' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setFilter('video')}
        >
          {lang('mediaTypeVideo')}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filter === 'audio' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setFilter('audio')}
        >
          {lang('mediaTypeAudio')}
        </button>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">{lang('mediaFilterMonth')}</span>
          <select
            className="form-select form-select-sm"
            style={{ width: '160px' }}
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
          >
            <option value="all">{lang('mediaFilterAll')}</option>
            {monthOptions.map((month) => {
              const label = lang('mediaMonthLabelFormat')
                .replace('{year}', month.slice(0, 4))
                .replace('{month}', month.slice(5, 7))
              return (
                <option key={month} value={month}>
                  {label}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-muted">{lang('loading')}</div>
      ) : error ? (
        <div className="text-danger">{error}</div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-muted">{lang('mediaEmpty')}</div>
      ) : (
        <>
          <div className="media-grid">
            {pagedFiles.map((file) => (
              <div className="card h-100 shadow-sm" key={file.path}>
                <div className="media-preview">{renderPreview(file)}</div>
                <div className="card-body">
                  <div className="small text-muted mb-2">{lang('filePath')}</div>
                  <div className="text-break mb-2">{file.path}</div>
                  <div className="d-flex justify-content-between small text-muted mb-3">
                    <span>{lang('fileSize')}: {formatSize(file.size)}</span>
                    <span>{lang('lastModified')}: {file.modified_at}</span>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <a className="btn btn-outline-primary btn-sm" href={uploadUrl(file.url || file.path)} target="_blank" rel="noopener noreferrer">
                      <i className="bi bi-box-arrow-up-right me-1"></i>
                      {lang('view')}
                    </a>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(file)}>
                      <i className="bi bi-trash me-1"></i>
                      {lang('delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="mt-4">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                    {lang('prev')}
                  </button>
                </li>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1
                  return (
                    <li className={`page-item ${pageNum === page ? 'active' : ''}`} key={pageNum}>
                      <button className="page-link" onClick={() => setPage(pageNum)}>
                        {pageNum}
                      </button>
                    </li>
                  )
                })}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                    {lang('next')}
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
