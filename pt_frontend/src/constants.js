/**
 * PeachtreesCMS 站点静态资源目录（唯一来源）
 *
 * 该常量被两处共同引用，新增静态资源目录（如 plugins/、fonts/）时只需改这里：
 *   1. vite.config.js  —— 自动生成开发代理（带前缀 + 无前缀兼容重写）
 *   2. src/utils/path.js —— 开发环境前缀特判（走 Vite 代理到本地 PHP）
 *
 * 注意：目录名必须是"站点相对路径的第一段"，且与后端约定一致
 * （后端 API 返回 upload/...、theme/...、pattern/... 相对路径）。
 */
export const STATIC_DIRS = ['upload', 'theme', 'pattern']
