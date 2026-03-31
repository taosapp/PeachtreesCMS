import { useState } from 'react'
import { dataAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

export default function Data() {
  const { lang } = useLanguage()
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/pt_api/'
  const apiUrl = (path) => `${apiBase.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  const [selectedFile, setSelectedFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingStatic, setExportingStatic] = useState(false)
  const [exportStatus, setExportStatus] = useState({ message: '', progress: 0, done: false })
  const [result, setResult] = useState(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch(apiUrl('/data/export.php'), {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        let message = lang('downloadFailed')
        try {
          const data = await response.json()
          message = data.message || message
        } catch (err) {
          console.error('Failed to parse export error response:', err)
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || `peachtrees.WordPress.${new Date().toISOString().slice(0, 10)}.xml`
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message)
    } finally {
      setExporting(false)
    }
  }


  const handleStaticExport = async () => {
    setExportingStatic(true)
    setExportStatus({ message: lang('exportStaticStarting'), progress: 0, done: false })
    let polling = true

    const pollStatus = async () => {
      if (!polling) return
      try {
        const res = await fetch(apiUrl('/data/export-static-status.php'), {
          method: 'GET',
          credentials: 'include'
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.success) {
            const status = data.data
            const progress = status.progress ?? 0
            const message = status.message || ''
            const done = status.status === 'done'
            setExportStatus({ message, progress, done })
            if (done) {
              polling = false
            }
          }
        }
      } catch (err) {
        // ignore polling errors
      }
    }

    const timer = setInterval(pollStatus, 1000)
    pollStatus()

    try {
      const response = await fetch(apiUrl('/data/export-static.php'), {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        let message = lang('downloadFailed')
        try {
          const data = await response.json()
          message = data.message || message
        } catch (err) {
          console.error('Failed to parse export error response:', err)
        }
        throw new Error(message)
      }

      const data = await response.json()
      if (data?.success) {
        setExportStatus({ message: lang('exportStaticDone'), progress: 100, done: true })
      } else {
        throw new Error(data?.message || lang('downloadFailed'))
      }
    } catch (err) {
      setExportStatus({ message: err.message, progress: 0, done: false })
      alert(err.message)
    } finally {
      polling = false
      clearInterval(timer)
      setExportingStatic(false)
    }
  }

  const handleImport = async (e) => {
    e.preventDefault()

    if (!selectedFile) {
      alert(lang('chooseXmlFirst'))
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const res = await dataAPI.importWxr(formData)
      if (res.success) {
        setResult(res.data)
      }
    } catch (err) {
      alert(err.message || lang('importFailed'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h4 className="mb-1">
          <i className="bi bi-arrow-left-right me-2"></i>
          {lang('dataImportExport')}
        </h4>
        <p className="text-muted mb-0">{lang('importHint')}</p>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-download me-2"></i>
                {lang('exportPosts')}
              </h5>
              <p className="text-muted">{lang('exportDescription')}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExport}
                disabled={exporting}
              >
                <i className={`bi ${exporting ? 'bi-arrow-repeat' : 'bi-file-earmark-arrow-down'} me-2`}></i>
                {exporting ? lang('exporting') : lang('downloadExport')}
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-globe2 me-2"></i>
                {lang('exportStaticSite')}
              </h5>
              <p className="text-muted">{lang('exportStaticDescription')}</p>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={handleStaticExport}
                disabled={exportingStatic}
              >
                <i className={`bi ${exportingStatic ? 'bi-arrow-repeat' : 'bi-box-arrow-down'} me-2`}></i>
                {exportingStatic ? lang('exporting') : lang('exportStaticStart')}
              </button>
              {exportStatus.message && (
                <div className="mt-2 text-muted small">
                  {exportStatus.progress}% - {exportStatus.message}
                </div>
              )}
              {exportStatus.done && (
                <div className="mt-2 small text-success">
                  {lang('exportStaticInstruction')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-upload me-2"></i>
                {lang('importPosts')}
              </h5>
              <p className="text-muted">{lang('importDescription')}</p>

              <form onSubmit={handleImport}>
                <div className="mb-3">
                  <label htmlFor="wxr-file" className="form-label">{lang('selectXmlFile')}</label>
                  <input
                    id="wxr-file"
                    type="file"
                    className="form-control"
                    accept=".xml,text/xml,application/xml"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>

                {selectedFile && (
                  <div className="alert alert-secondary py-2">
                    <strong>{lang('selectedFile')}:</strong> {selectedFile.name}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={importing}
                >
                  <i className={`bi ${importing ? 'bi-arrow-repeat' : 'bi-cloud-arrow-up'} me-2`}></i>
                  {importing ? lang('importing') : lang('importNow')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="card shadow-sm mt-4">
          <div className="card-body">
            <h5 className="card-title mb-3">{lang('importSummary')}</h5>
            <div className="row g-3">
              <div className="col-6 col-md-3">
                <div className="border rounded p-3 bg-light">
                  <div className="text-muted small">{lang('tagsImported')}</div>
                  <div className="fs-4 fw-semibold">{result.tags_created ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="border rounded p-3 bg-light">
                  <div className="text-muted small">{lang('postsImported')}</div>
                  <div className="fs-4 fw-semibold">{result.posts_created ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="border rounded p-3 bg-light">
                  <div className="text-muted small">{lang('postsUpdated')}</div>
                  <div className="fs-4 fw-semibold">{result.posts_updated ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="border rounded p-3 bg-light">
                  <div className="text-muted small">{lang('commentsImported')}</div>
                  <div className="fs-4 fw-semibold">{result.comments_created ?? 0}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-muted">
              <strong>{lang('lastImportFile')}:</strong> {result.file_name}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
