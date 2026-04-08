import { useState, useEffect } from 'react'
import { optionsAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import TiptapSimpleEditor from '../../components/TiptapSimpleEditor'

export default function Settings() {
    const { lang } = useLanguage()
    const { refetchSettings } = useTheme()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
        site_title: '',
        footer_text: '',
        default_lang: 'zh-CN',
        show_logo: false
    })

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        setLoading(true)
        try {
            const res = await optionsAPI.get()
            if (res.success) {
                setSettings({
                    site_title: res.data.site_title || '',
                    footer_text: res.data.footer_text || '',
                    default_lang: res.data.default_lang || 'zh-CN',
                    show_logo: res.data.show_logo === '1' || res.data.show_logo === true
                })
            }
        } catch (err) {
            alert(lang('loadSettingsFailed') + ': ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const dataToSave = {
                ...settings,
                show_logo: settings.show_logo ? '1' : '0'
            }
            await optionsAPI.update(dataToSave)
            if (refetchSettings) {
                await refetchSettings()
            }
            alert(lang('saveSuccess'))
        } catch (err) {
            alert(lang('error') + ': ' + err.message)
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
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">
                    <i className="bi bi-gear me-2"></i>
                    {lang('systemSettings')}
                </h2>
            </div>

            <div className="card shadow-sm">
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div className="mb-4">
                            <label className="form-label fw-bold">{lang('siteTitle')}</label>
                            <input
                                type="text"
                                className="form-control"
                                value={settings.site_title}
                                onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                                placeholder={lang('siteTitlePlaceholder')}
                                required
                            />
                            <div className="form-text">{lang('siteTitleHelp')}</div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold">{lang('showLogo')}</label>
                            <div>
                                <div className="form-check form-check-inline">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="show_logo"
                                        id="show_logo_yes"
                                        value="1"
                                        checked={settings.show_logo === true}
                                        onChange={() => setSettings({ ...settings, show_logo: true })}
                                    />
                                    <label className="form-check-label" htmlFor="show_logo_yes">
                                        {lang('yes')}
                                    </label>
                                </div>
                                <div className="form-check form-check-inline">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="show_logo"
                                        id="show_logo_no"
                                        value="0"
                                        checked={settings.show_logo === false}
                                        onChange={() => setSettings({ ...settings, show_logo: false })}
                                    />
                                    <label className="form-check-label" htmlFor="show_logo_no">
                                        {lang('no')}
                                    </label>
                                </div>
                            </div>
                            <div className="form-text">{lang('showLogoHelp')}</div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold">{lang('defaultLanguage')}</label>
                            <select
                                className="form-select"
                                value={settings.default_lang}
                                onChange={(e) => setSettings({ ...settings, default_lang: e.target.value })}
                            >
                                <option value="zh-CN">{lang('chineseSimplified')}</option>
                                <option value="en-US">{lang('english')}</option>
                            </select>
                            <div className="form-text">{lang('defaultLanguageHelp')}</div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold">{lang('footerText')}</label>
                            <TiptapSimpleEditor
                                value={settings.footer_text}
                                onChange={(html) => setSettings({ ...settings, footer_text: html })}
                            />
                            <div className="form-text">{lang('footerTextHelp')}</div>
                        </div>

                        <div className="border-top pt-4">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        {lang('saving')}
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-lg me-1"></i>
                                        {lang('saveSettings')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
