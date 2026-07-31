# PeachtreesCMS 前端路径体系（开发者必读）

> 本文档说明 `theme / pattern / upload / languages` 等资源从前端视角的路径约定，
> 是新增开发者理解前端代码的第一站。配套阅读：`pt_frontend/src/utils/path.js`。

## 1. 核心约定

**后端 API 一律返回“站点相对路径”，前端只在渲染时通过 `utils/path.js` 统一转成可访问 URL。**

| 资源 | 后端返回（相对路径示例） | 前端转换函数 |
|------|--------------------------|--------------|
| 上传附件 | `upload/2026/04/07-abc.jpg` | `uploadUrl(path)` |
| 主题资源 | `theme/default/style.css`（来自 `css_url`） | `themeUrl(slug, file)` |
| 页面风格 | `pattern/01/style.css`（来自 `css_url`） | `patternUrl(slug, file)` |
| 语言包 | `languages/zh-CN.json` | `languageUrl(code)` |
| 其余静态资源 | `imgs/...`、`favicon.svg` | `publicUrl(path)` |

**禁止事项：**
- 组件内禁止手写拼接 `/upload/`、`/theme/`、`/pattern/` 前缀；
- 后端禁止返回带站点目录前缀的根绝对路径（如 `/blog/upload/...`）——
  历史版本曾返回，会导致前端 `publicUrl()` 二次加前缀、子目录部署 404。

## 2. 前端路径转换原理（utils/path.js）

```
publicUrl(path)
├─ http(s):// 或 //         → 原样返回（外链）
├─ 开发环境 (pnpm dev)
│   ├─ upload/theme/pattern → 拼站点前缀 /PeachtreesCMS/（走 Vite 代理到本地 PHP）
│   └─ 其他                 → 直接 /languages/... 等（Vite public/ 提供）
└─ 生产环境 (base './')    → 统一拼 ./ 相对路径（任意子目录部署可用）
```

开发环境的站点前缀由 `VITE_API_BASE_URL` 推导：

```
VITE_API_BASE_URL=/PeachtreesCMS/pt_api/  →  站点前缀 /PeachtreesCMS
```

新增静态资源目录（如 `plugins/`、`fonts/`）时，需要**同步**修改两处：
1. `pt_frontend/src/utils/path.js` 的 `PROXIED_DIRS`；
2. `pt_frontend/vite.config.js` 的代理配置。

## 3. 编辑器内容中的媒体路径

TipTap 编辑器（`TiptapEditor`）插入图片/视频/音频时，内容中保存的是**相对路径**
`upload/...`，渲染时由浏览器按当前页面目录解析：
- 生产环境 `/blog/` 部署 → 自动解析为 `/blog/upload/...`；
- 开发环境由 `vite.config.js` 的 `^/upload` 代理重写到本地 PHP 服务。

因此迁移站点/更换域名时，历史内容中的媒体不需要批量替换。

## 4. API 地址

- 前端统一通过 `services/api.js` 的 axios 实例请求（自动带 cookie）；
- 原生 fetch / 标签场景（RSS、验证码、导出下载）使用 `apiUrl('/xxx.php')`；
- `getApiBaseURL()` 生产环境根据 `window.location.pathname` 自动推导，
  兼容 `/blog/`、`/blog/index.html`、`/blog` 三种形态。

## 5. 构建与发布

```
pnpm dev       # 前端开发（localhost:5173，代理到本地 PHP）
pnpm build     # 构建到 pt_frontend/dist（base './'，相对路径）
pnpm package   # 根目录一键打包 release.zip（含前端 dist + pt_api + 静态资源）
```

前端静态资源（`theme/`、`pattern/`、`languages/`、`imgs/`）位于
`pt_frontend/public/`，构建时由 Vite 原样拷贝进 `dist/`，再经 `scripts/package.js`
合并进发布包；`upload/` 在发布包中保持为空目录（由 PHP 运行期写入）。
