import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { themesAPI, optionsAPI } from '../services/api'

const THEME_LINK_ID = 'pt-theme-style'

const defaultLayout = {
  home: {
    template: 'single-column',
    columns: { sidebar: 'left' }
  },
  post: {
    template: 'single-column',
    columns: { sidebar: 'left' }
  }
}

const layoutForTheme = (theme) => {
  if (theme?.slug === 'peachtrees-two-column') {
    return {
      home: { template: 'two-column', columns: { sidebar: 'left' } },
      post: { template: 'two-column', columns: { sidebar: 'left' } }
    }
  }
  return defaultLayout
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(null)
  const [siteOptions, setSiteOptions] = useState({ site_title: '', footer_text: '', default_lang: 'zh-CN', show_logo: false })
  const [loading, setLoading] = useState(true)
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.hash.startsWith('#/admin'))

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      try {
        const [themeRes, optionsRes] = await Promise.all([
          themesAPI.getActive(),
          optionsAPI.get().catch(() => ({ success: false })) // 允许 options 接口失败
        ])

        if (cancelled) return

        if (themeRes.success && themeRes.data) {
          const nextTheme = {
            ...themeRes.data
          }
          setTheme(nextTheme)
        }

        if (optionsRes.success && optionsRes.data) {
          setSiteOptions({
            site_title: optionsRes.data.site_title || '',
            footer_text: optionsRes.data.footer_text || '',
            default_lang: optionsRes.data.default_lang || 'zh-CN',
            show_logo: optionsRes.data.show_logo === '1' || optionsRes.data.show_logo === true
          })
        }
      } catch (err) {
        console.error('Failed to load site data:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminRoute(window.location.hash.startsWith('#/admin'))
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  useEffect(() => {
    const link = document.getElementById(THEME_LINK_ID)

    if (isAdminRoute) {
      if (link) link.remove()
      return
    }

    if (theme?.css_url) {
      let nextLink = link
      if (!nextLink) {
        nextLink = document.createElement('link')
        nextLink.id = THEME_LINK_ID
        nextLink.rel = 'stylesheet'
        document.head.appendChild(nextLink)
      }
      nextLink.href = theme.css_url
    }
  }, [isAdminRoute, theme])

  useEffect(() => {
    if (siteOptions.site_title) {
      document.title = isAdminRoute ? `${siteOptions.site_title} - admin` : siteOptions.site_title
    }
  }, [siteOptions.site_title, isAdminRoute])

  const refetchSettings = async () => {
    try {
      const res = await optionsAPI.get()
      if (res.success && res.data) {
        setSiteOptions({
          site_title: res.data.site_title || '',
          footer_text: res.data.footer_text || '',
          default_lang: res.data.default_lang || 'zh-CN',
          show_logo: res.data.show_logo === '1' || res.data.show_logo === true
        })
      }
    } catch (err) {
      console.error('Failed to refetch site settings:', err)
    }
  }

  const value = useMemo(() => ({
    theme,
    loading,
    layout: layoutForTheme(theme),
    siteOptions,
    refetchSettings
  }), [theme, loading, siteOptions])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
