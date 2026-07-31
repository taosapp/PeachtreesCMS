/**
 * 安全 HTML 消毒函数（前端唯一消毒入口）
 * 仅保留白名单标签/属性，并对 href/src 做协议过滤，防止 XSS。
 */

// TipTap 富文本编辑器可能输出的标签
const ALLOWED_TAGS = [
  // 基础排版
  'div', 'p', 'span', 'strong', 'em', 's', 'u', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'figure', 'figcaption',
  // 链接 / 图片 / 媒体
  'a', 'img', 'video', 'audio', 'source',
  // 表格
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col'
]

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  video: ['src', 'controls', 'poster', 'width', 'height', 'autoplay', 'muted', 'loop', 'playsinline'],
  audio: ['src', 'controls', 'autoplay', 'muted', 'loop'],
  source: ['src', 'type'],
  th: ['colspan', 'rowspan', 'scope'],
  td: ['colspan', 'rowspan'],
  ol: ['start'],
  li: ['value']
}

// 允许的 URL 协议/前缀（用于 href / src）
// 站点相对路径前缀（upload/theme/pattern 为 CMS 内部资源目录）+ 常见协议/锚点
const SAFE_URL_PREFIXES = ['http://', 'https://', '//', '/', './', '../', '#', 'mailto:', 'upload/', 'theme/', 'pattern/']

function isSafeUrl(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return true
  const lower = trimmed.toLowerCase()
  // 显式拒绝危险协议
  if (/^(javascript|vbscript|data):/i.test(lower)) return false
  return SAFE_URL_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

/**
 * 过滤 HTML，仅保留安全标签和属性
 * @param {string} html - 原始 HTML 字符串
 * @returns {string} - 消毒后的 HTML 字符串
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // 创建一个临时 DOM 元素来解析 HTML
  const div = document.createElement('div')
  div.innerHTML = html

  function cleanElement(element) {
    if (element.nodeType === Node.ELEMENT_NODE) {
      const tagName = element.tagName.toLowerCase()

      if (!ALLOWED_TAGS.includes(tagName)) {
        // 移除禁止标签，但保留其子节点
        while (element.firstChild) {
          element.parentNode.insertBefore(element.firstChild, element)
        }
        element.parentNode.removeChild(element)
        return
      }

      // 清理属性
      const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || []
      const attrsToRemove = []
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i]
        const name = attr.name.toLowerCase()
        if (!allowedAttrs.includes(name)) {
          attrsToRemove.push(attr.name)
          continue
        }
        // 对 href / src 做协议过滤
        if ((name === 'href' || name === 'src') && !isSafeUrl(attr.value)) {
          attrsToRemove.push(attr.name)
        }
      }
      attrsToRemove.forEach((attrName) => {
        element.removeAttribute(attrName)
      })

      // 链接安全属性
      if (tagName === 'a') {
        const href = element.getAttribute('href')
        if (href && !href.startsWith('#')) {
          element.setAttribute('rel', 'noopener noreferrer')
          element.setAttribute('target', '_blank')
        }
      }
    }

    // 递归处理子节点
    const children = Array.from(element.childNodes)
    children.forEach((child) => cleanElement(child))
  }

  // 从 body 开始清理（div.innerHTML 会自动包裹进 body）
  Array.from(div.childNodes).forEach((child) => cleanElement(child))

  return div.innerHTML
}
