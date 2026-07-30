import { useState, useEffect } from 'react'
import { mediaAPI } from '../../services/api'
import { publicUrl } from '../../utils/path'
import { useLanguage } from '../../contexts/LanguageContext'

export default function MediaModal({ isOpen, onClose, onSelect }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const { lang } = useLanguage()

  useEffect(() => {
    if (isOpen) loadMedia()
  }, [isOpen])

  const loadMedia = async () => {
    setLoading(true)
    try {
      const res = await mediaAPI.getList()
      if (res.success && res.data) {
        setItems(Array.isArray(res.data.files) ? res.data.files : [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    const formData = new FormData()
    files.forEach(f => formData.append('files[]', f))
    try {
      await mediaAPI.upload(formData)
      loadMedia()
    } catch (err) {
      alert(err.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{lang('mediaLibrary')}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <input type="file" className="form-control mb-3" multiple onChange={handleUpload} />
            <div className="row g-2">
              {items.map(item => (
                <div key={item.path} className="col-3">
                  <div className={`card ${selected.has(item.path) ? 'border-primary' : ''}`} onClick={() => {
                    const next = new Set(selected)
                    if (next.has(item.path)) next.delete(item.path)
                    else next.add(item.path)
                    setSelected(next)
                  }}>
                    <img src={publicUrl(item.path)} className="card-img-top" style={{ height: 80, objectFit: 'cover' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{lang('cancel')}</button>
            <button type="button" className="btn btn-primary" onClick={() => { onSelect(Array.from(selected)); onClose(); }}>{lang('confirm')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
