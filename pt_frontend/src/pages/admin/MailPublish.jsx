import { useEffect, useState } from 'react'
import { optionsAPI, tagsAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { toast } from '../../utils/toast'

export default function MailPublish() {
  const { lang } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tags, setTags] = useState([])
  const [form, setForm] = useState({
    secret: '',
    whitelist: '',
    defaultTag: ''
  })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [optionsRes, tagsRes] = await Promise.all([
          optionsAPI.get(),
          tagsAPI.getList()
        ])

        if (optionsRes.success) {
          const options = optionsRes.data || {}
          setForm({
            secret: options.mail_publish_secret || '',
            whitelist: options.mail_publish_whitelist || '',
            defaultTag: options.mail_publish_default_tag || ''
          })
        }

        if (tagsRes.success) {
          setTags(tagsRes.data || [])
        }
      } catch (err) {
        console.error('Failed to load mail publish settings:', err)
        toast(lang('mailPublishLoadFailed'), 'error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [lang])

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await optionsAPI.update({
        mail_publish_secret: form.secret.trim(),
        mail_publish_whitelist: form.whitelist.trim(),
        mail_publish_default_tag: form.defaultTag.trim()
      })
      toast(lang('mailPublishSaved'), 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

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
          <i className="bi bi-envelope me-2"></i>
          {lang('mailPublish')}
        </h5>
      </div>
      <div className="card-body">
        <p className="text-muted">{lang('mailPublishDesc')}</p>
        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label">{lang('mailPublishSecret')}</label>
            <input
              type="password"
              className="form-control"
              value={form.secret}
              onChange={handleChange('secret')}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">{lang('mailPublishWhitelist')}</label>
            <textarea
              className="form-control"
              rows="3"
              value={form.whitelist}
              onChange={handleChange('whitelist')}
              placeholder="you@example.com, team@example.com"
            />
            <div className="form-text">{lang('mailPublishWhitelistHelp')}</div>
          </div>
          <div className="mb-4">
            <label className="form-label">{lang('mailPublishDefaultTag')}</label>
            <select
              className="form-select"
              value={form.defaultTag}
              onChange={handleChange('defaultTag')}
            >
              <option value="">{lang('disabled')}</option>
              {tags.map(tag => (
                <option key={tag.tag} value={tag.tag}>{tag.display_name || tag.tag}</option>
              ))}
            </select>
            <div className="form-text">{lang('mailPublishDefaultTagHelp')}</div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? lang('saving') : lang('save')}
          </button>
        </form>
      </div>
    </div>
  )
}
