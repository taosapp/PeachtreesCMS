import { useEffect, useMemo, useState } from 'react'
import { pluginsAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { toast } from '../../utils/toast'

export default function Plugins() {
  const { lang, language } = useLanguage()
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})

  const loadPlugins = async () => {
    setLoading(true)
    try {
      const res = await pluginsAPI.getList()
      if (res.success) {
        setPlugins(res.data || [])
      }
    } catch (err) {
      console.error('Failed to load plugins:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlugins()
  }, [])

  const handleToggle = async (slug, enabled) => {
    setSaving(prev => ({ ...prev, [slug]: true }))
    try {
      const res = await pluginsAPI.setEnabled({ slug, enabled })
      if (res.success) {
        setPlugins(prev => prev.map(p => (p.slug === slug ? { ...p, enabled: res.data.enabled } : p)))
      }
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(prev => ({ ...prev, [slug]: false }))
    }
  }

  const items = useMemo(() => {
    return plugins.map(plugin => {
      const name = language === 'en-US'
        ? plugin.name_en || plugin.name
        : plugin.name
      const description = language === 'en-US'
        ? plugin.description_en || plugin.description
        : plugin.description
      return { ...plugin, displayName: name, displayDesc: description }
    })
  }, [plugins, language])

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{lang('loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white">
        <h5 className="mb-0">
          <i className="bi bi-plug me-2"></i>
          {lang('pluginManagement')}
        </h5>
      </div>
      <div className="card-body">
        <p className="text-muted">{lang('pluginManagementDesc')}</p>
        {items.length === 0 ? (
          <div className="alert alert-warning">{lang('pluginEmpty')}</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{lang('plugins')}</th>
                  <th>{lang('version')}</th>
                  <th>{lang('status')}</th>
                  <th className="text-end">{lang('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(plugin => (
                  <tr key={plugin.slug}>
                    <td>
                      <div className="fw-medium">{plugin.displayName}</div>
                      {plugin.displayDesc && (
                        <div className="text-muted small">{plugin.displayDesc}</div>
                      )}
                      <div className="text-muted small">{lang('pluginSlug')}: {plugin.slug}</div>
                    </td>
                    <td className="text-muted">{plugin.version || '-'}</td>
                    <td>
                      {plugin.enabled ? (
                        <span className="badge bg-success">{lang('enabled')}</span>
                      ) : (
                        <span className="badge bg-secondary">{lang('disabled')}</span>
                      )}
                    </td>
                    <td className="text-end">
                      <button
                        className={`btn btn-sm ${plugin.enabled ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                        onClick={() => handleToggle(plugin.slug, !plugin.enabled)}
                        disabled={saving[plugin.slug]}
                      >
                        {plugin.enabled ? lang('disable') : lang('enable')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
