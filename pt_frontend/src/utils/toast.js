/**
 * 轻量级 Toast 提示工具（不依赖 Bootstrap，前后台通用）
 * 用法：
 *   toast('保存成功', 'success')
 *   toast(err.message, 'error')
 *   toast('正在加载...', 'info')
 */

const TOAST_STYLE = `
.pt-toast-container{position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:min(360px,calc(100vw - 32px));pointer-events:none}
.pt-toast{pointer-events:auto;box-sizing:border-box;padding:10px 14px;border-radius:8px;font-size:14px;line-height:1.5;color:#fff;background:#333;box-shadow:0 4px 14px rgba(0,0,0,.18);word-break:break-word;animation:pt-toast-in .18s ease-out}
.pt-toast-success{background:#198754}
.pt-toast-error{background:#dc3545}
.pt-toast-info{background:#0d6efd}
.pt-toast-leave{opacity:0;transform:translateY(-6px);transition:opacity .25s,transform .25s}
@keyframes pt-toast-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
`

let container = null
let styleInjected = false

function ensureContainer() {
  if (!styleInjected) {
    styleInjected = true
    const styleEl = document.createElement('style')
    styleEl.textContent = TOAST_STYLE
    document.head.appendChild(styleEl)
  }
  if (!container) {
    container = document.createElement('div')
    container.className = 'pt-toast-container'
    document.body.appendChild(container)
  }
  return container
}

/**
 * 显示一条 toast 提示
 * @param {string} message 提示内容
 * @param {'success'|'error'|'info'} [type='info'] 类型
 * @param {number} [duration=3200] 显示时长（ms）
 */
export function toast(message, type = 'info', duration = 3200) {
  if (!message) return
  const el = document.createElement('div')
  el.className = `pt-toast pt-toast-${type === 'success' || type === 'error' ? type : 'info'}`
  el.textContent = String(message)
  ensureContainer().appendChild(el)

  setTimeout(() => {
    el.classList.add('pt-toast-leave')
    setTimeout(() => el.remove(), 300)
  }, duration)
}

export default toast
