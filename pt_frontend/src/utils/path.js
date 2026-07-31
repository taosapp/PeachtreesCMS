import { STATIC_DIRS } from '../constants'

/**
 * PeachtreesCMS 前端路径工具（统一路径转换的唯一入口）
 *
 * ── 路径约定（请所有开发者遵守）───────────────────────────────────────
 * 1. 后端 API 一律返回【站点相对路径】，例如：
 *      upload/2026/04/07-xxx.jpg   （upload/ 前缀）
 *      theme/default/style.css     （theme/ 前缀，来自 css_url）
 *      pattern/01/style.css        （pattern/ 前缀，来自 css_url）
 *    禁止返回带站点目录前缀的根绝对路径（如 /blog/upload/...）。
 * 2. 前端组件【只在渲染/展示时】调用本文件函数把相对路径转成可访问 URL；
 *    不要在组件里手动拼接 /upload/、/theme/、/pattern/ 前缀。
 * 3. 编辑器存储到数据库的内容里保存相对路径（upload/...），浏览器渲染时
 *    天然按当前页面目录解析，开发环境由 vite.config.js 的代理兜底。
 *
 * ── 各环境行为 ───────────────────────────────────────────────────────
 * 开发环境 (pnpm dev):
 *   - upload/theme/pattern 资源由本地 PHP 服务提供，需拼上站点前缀
 *     （从 VITE_API_BASE_URL 推导，如 /PeachtreesCMS/）走 Vite 代理；
 *   - languages/imgs 等静态资源由 Vite public/ 直接提供。
 * 生产环境 (base './'):
 *   - 全部统一拼接相对 base，实现“构建一次、到处运行”。
 * 绝对外链 (http(s):// 或 //) 一律原样返回。
 */

// 开发环境下参与代理的静态资源目录（与 vite.config.js 共用 src/constants.js，新增目录改一处即可）
const PROXIED_DIRS = STATIC_DIRS.map((dir) => `${dir}/`)

/**
 * 开发环境站点根前缀：'/PeachtreesCMS/pt_api/' -> '/PeachtreesCMS'
 */
function getSitePrefix() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/PeachtreesCMS/pt_api/'
  return apiBase.replace(/pt_api\/?$/, '').replace(/\/$/, '')
}

/**
 * 将站点相对路径转换为可访问 URL（统一转换入口）
 * @param {string} path - 相对路径（可带或不带前导 /）
 * @returns {string}
 */
export function publicUrl(path) {
  if (!path) return ''

  // 绝对外链（http://、https://、//）原样返回
  if (/^(https?:)?\/\//i.test(path)) {
    return path
  }

  const normalized = path.startsWith('/') ? path.slice(1) : path

  // 开发环境：upload/theme/pattern 由 PHP 服务提供，拼站点前缀走 Vite 代理
  if (import.meta.env.DEV) {
    if (PROXIED_DIRS.some((dir) => normalized.startsWith(dir))) {
      return `${getSitePrefix()}/${normalized}`
    }
    // 其余静态资源（languages/imgs/favicon）由 Vite public/ 提供
    return `/${normalized}`
  }

  // 生产环境：统一拼接 Vite base（'./'），实现任意子目录部署
  const base = import.meta.env.BASE_URL || '/'
  return `${base.endsWith('/') ? base : base + '/'}${normalized}`
}

/**
 * 上传附件 URL。接受 'upload/2026/04/x.jpg'（推荐）、'/upload/...' 或绝对外链。
 */
export function uploadUrl(path) {
  if (!path) return ''
  const str = String(path)
  if (/^(https?:)?\/\//i.test(str)) return str
  const normalized = str.startsWith('/') ? str.slice(1) : str
  const rel = normalized.startsWith('upload/') ? normalized : `upload/${normalized}`
  return publicUrl(rel)
}

/**
 * 主题资源 URL。slug 为主题目录名（如 'default'），file 默认 style.css。
 */
export function themeUrl(slug, file = 'style.css') {
  if (!slug) return ''
  return publicUrl(`/theme/${encodeURIComponent(slug)}/${String(file).replace(/^\/+/, '')}`)
}

/**
 * 页面风格(pattern)资源 URL。slug 为风格目录名（如 '01'），file 默认 style.css。
 */
export function patternUrl(slug, file = 'style.css') {
  if (!slug) return ''
  return publicUrl(`/pattern/${encodeURIComponent(slug)}/${String(file).replace(/^\/+/, '')}`)
}

/**
 * 语言包资源 URL（languages/{code}.json）
 */
export function languageUrl(langCode) {
  return publicUrl(`/languages/${langCode}.json`)
}
