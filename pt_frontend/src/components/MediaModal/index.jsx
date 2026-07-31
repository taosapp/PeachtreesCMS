import { useState, useEffect } from 'react'
import { mediaAPI } from '../../services/api'
import { uploadUrl } from '../../utils/path'
import { useLanguage } from '../../contexts/LanguageContext'

export default function MediaModal({ isOpen, onClose, onSelect }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  // Store ordered selection: array of paths in selection order
  const [selectedOrder, setSelectedOrder] = useState([])
  const { lang } = useLanguage()

  useEffect(() => {
    if (isOpen) {
      loadMedia()
      // Reset selection when modal opens
      setSelectedOrder([])
    }
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

  const toggleSelect = (path) => {
    setSelectedOrder(prev => {
      const idx = prev.indexOf(path)
      if (idx >= 0) {
        // Remove from selection
        return prev.filter(p => p !== path)
      } else {
        // Add to end of selection
        return [...prev, path]
      }
    })
  }

  const getSelectionIndex = (path) => {
    return selectedOrder.indexOf(path) + 1 // 1-based index
  }

  const isSelected = (path) => selectedOrder.includes(path)

  const handleConfirm = () => {
    onSelect(selectedOrder)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {lang('mediaLibrary')}
              {selectedOrder.length > 0 && (
                <span className="badge bg-primary ms-2">
                  {lang('mediaSelected').replace('{count}', selectedOrder.length)}
                </span>
              )}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="row g-2">
                {items.map(item => {
                  const selected = isSelected(item.path)
                  const orderNum = getSelectionIndex(item.path)
                  return (
                    <div key={item.path} className="col-3 col-sm-2">
                      <div
                        className={`card position-relative cursor-pointer media-select-card ${selected ? 'border-primary border-2' : ''}`}
                        onClick={() => toggleSelect(item.path)}
                        style={{ cursor: 'pointer' }}
                      >
                        <img
                          src={uploadUrl(item.url || item.path)}
                          className="card-img-top"
                          alt={item.path}
                          style={{
                            height: 90,
                            objectFit: 'cover',
                            filter: selected ? 'brightness(0.85)' : 'none'
                          }}
                        />
                        {selected && (
                          <div
                            className="position-absolute top-0 end-0 m-1 d-flex align-items-center justify-content-center"
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              backgroundColor: '#0d6efd',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                          >
                            {orderNum}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{lang('cancel')}</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={selectedOrder.length === 0}
            >
              <i className="bi bi-check-lg me-1"></i>
              {lang('confirm')}
              {selectedOrder.length > 0 && ` (${selectedOrder.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
