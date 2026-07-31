import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useTheme } from './ThemeContext'
import { languageUrl } from '../utils/path'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const { siteOptions, loading: themeLoading } = useTheme()
  
  // Default to Simplified Chinese
  const [language, setLanguage] = useState('zh-CN')
  const [translations, setTranslations] = useState({})
  const [loading, setLoading] = useState(true)

  const loadLanguage = useCallback(async (langCode) => {
    try {
      const response = await fetch(languageUrl(langCode))
      if (!response.ok) throw new Error(`Failed to load ${langCode}`)
      const data = await response.json()
      setTranslations(prev => ({ ...prev, [langCode]: data }))
    } catch (err) {
      console.error(`Error loading language file:`, err)
    }
  }, [])

  // After siteOptions is loaded, use the site default language
  useEffect(() => {
    if (themeLoading) return
    
    const siteLang = siteOptions?.default_lang || 'zh-CN'
    
    const applyLanguage = async () => {
      // 并行加载站点默认语言 + 回退语言（减少首屏等待）
      const otherLang = siteLang === 'zh-CN' ? 'en-US' : 'zh-CN'
      await Promise.all([loadLanguage(siteLang), loadLanguage(otherLang)])
      
      setLanguage(siteLang)
      setLoading(false)
    }

    applyLanguage()
  }, [themeLoading, siteOptions?.default_lang, loadLanguage])

  useEffect(() => {
    document.documentElement.lang = language === 'zh-CN' ? 'zh-CN' : 'en'
  }, [language])

  const lang = (key) => {
    const current = translations[language] || {}
    const fallback = translations['zh-CN'] || translations['en-US'] || {}

    return current[key] || fallback[key] || key
  }

  const setLanguageWithStorage = (newLang) => {
    setLanguage(newLang)
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Language...</div>
  }

  return (
    <LanguageContext.Provider value={{ language, lang, loading, setLanguage: setLanguageWithStorage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
