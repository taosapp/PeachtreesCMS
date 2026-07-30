import { useState, useEffect } from 'react'
import { stylesAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { publicUrl } from '../../utils/path'

// Helper function to parse background rules from CSS body tag and convert them for React styles
function parseBackgroundStyles(cssText, slug) {
  // Regex to match body { ... } block (case-insensitive)
  const bodyMatch = cssText.match(/body\s*\{([^}]+)\}/i);
  if (!bodyMatch) return {};

  const styles = {};
  const rules = bodyMatch[1].split(';');

  rules.forEach(rule => {
    const parts = rule.split(':');
    if (parts.length >= 2) {
      const prop = parts[0].trim().toLowerCase();
      // Join remaining parts in case the value contains colons, like url("http://...")
      const val = parts.slice(1).join(':').trim();

      if (prop.startsWith('background')) {
        let finalVal = val;

        // Handle relative URLs in background-image, e.g., url("./bg.svg")
        if (prop === 'background-image' && val.includes('url(')) {
          const urlMatch = val.match(/url\(['"]?([^'")]+)['"]?\)/);
          if (urlMatch) {
            const relUrl = urlMatch[1];
            // Resolve relative path against the pattern directory, e.g. ./bg.svg -> /pattern/01/bg.svg
            const resolvedUrl = relUrl.startsWith('.')
              ? publicUrl(`/pattern/${slug}/${relUrl.replace(/^\.\//, '')}`)
              : relUrl;
            finalVal = `url("${resolvedUrl}")`;
          }
        }

        // Convert kebab-case property to camelCase for React inline styles
        const camelProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styles[camelProp] = finalVal;
      }
    }
  });
  return styles;
}

export default function Patterns() {
  const { lang } = useLanguage()
  const [styles, setStyles] = useState([])
  const [bgStyles, setBgStyles] = useState({}) // Stores parsed backgrounds keyed by style slug
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStyles()
  }, [])

  const loadStyles = async () => {
    setLoading(true)
    try {
      const res = await stylesAPI.getList()
      if (res.success) {
        const styleList = Array.isArray(res.data.styles) ? res.data.styles : []
        setStyles(styleList)

        // Fetch and parse CSS backgrounds for ALL patterns
        const parsedBgs = {}
        await Promise.all(
          styleList.map(async (style) => {
            if (style.css_url) {
              try {
                const response = await fetch(publicUrl(style.css_url))
                if (response.ok) {
                  const cssText = await response.text()
                  const parsed = parseBackgroundStyles(cssText, style.name)
                  if (Object.keys(parsed).length > 0) {
                    parsedBgs[style.name] = parsed
                  }
                }
              } catch (e) {
                console.error(`Failed to fetch css background for ${style.name}:`, e)
              }
            }
          })
        )
        setBgStyles(parsedBgs)
      }
    } catch (err) {
      console.error('Failed to load styles:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-brush me-2"></i>
          {lang('patternManagement')}
        </h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={loadStyles} disabled={loading}>
            <i className="bi bi-arrow-repeat me-1"></i>
            {lang('scanLocalPatterns')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : styles.length === 0 ? (
        <div className="alert alert-warning">{lang('noPatternFound')}</div>
      ) : (
        <div className="row g-3">
          {styles.map((style) => (
            <div key={style.id} className="col-12 col-md-4 col-xl-2">
              <div className="card shadow-sm h-100">
                <div className="position-relative">
                  {/* Applied parsed background styles (color, repeat, url, etc.) dynamically */}
                  <div
                    className="pattern-card-thumb border-bottom"
                    style={{
                      minHeight: '240px',
                      ...bgStyles[style.name],
                      backgroundSize: bgStyles[style.name]?.backgroundSize,
                      backgroundColor: bgStyles[style.name]?.backgroundColor || '#f8f9fa'
                    }}
                  >
                  </div>
                </div>
                <div className="card-body d-flex flex-column p-3">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className="card-title mb-0 fw-bold">{style.name}</h6>
                  </div>
                  <div className="small text-muted mb-2">
                    {lang('version')} {style.version || '-'} · {style.author || lang('unknownAuthor')}
                  </div>
                  <p className="card-text text-muted small flex-grow-1 mb-3" style={{ minHeight: '40px' }}>
                    {style.description || lang('noDescription')}
                  </p>
                  <div className="d-flex gap-2 mt-auto">
                    <a
                      href={publicUrl(style.css_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-secondary flex-grow-1"
                    >
                      <i className="bi bi-eye me-1"></i>
                      {lang('viewCSS')}
                    </a>
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
