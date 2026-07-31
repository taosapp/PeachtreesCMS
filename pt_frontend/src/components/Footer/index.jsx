import { useTheme } from '../../contexts/ThemeContext'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import { apiUrl } from '../../services/api'

export default function Footer() {
  const { siteOptions } = useTheme()
  const footerContent = siteOptions.footer_text;

  // Safely filter HTML
  const safeHtml = sanitizeHtml(footerContent)

  return (
    <footer className="footer">
      <div className="inner">
        <div className="footer-text" dangerouslySetInnerHTML={{ __html: safeHtml }} />
        <p>Powered by <a href="https://github.com/taotaotao-studio/PeachtreesCMS" target="_blank">PeachtreesCMS</a> · <a href={apiUrl('/rss.php')} target="_blank">RSS</a> </p>
      </div>
    </footer>
  )
}
