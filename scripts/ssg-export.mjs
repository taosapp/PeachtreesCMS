import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const value = argv[i + 1]
    args[key.slice(2)] = value
    i += 1
  }
  return args
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function emptyDir(dir) {
  if (!fsSync.existsSync(dir)) {
    await ensureDir(dir)
    return
  }
  const entries = await fs.readdir(dir, { withFileTypes: true })
  await Promise.all(entries.map(async (entry) => {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await emptyDir(target)
      await fs.rmdir(target)
    } else {
      await fs.unlink(target)
    }
  }))
}

async function copyDir(src, dest, options = {}) {
  if (!fsSync.existsSync(src)) return
  await ensureDir(dest)
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.' || entry.name === '..') continue
    if (options.skip && options.skip.has(entry.name)) continue
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDir(from, to, options)
    } else {
      await fs.copyFile(from, to)
    }
  }
}

function writeStatus(statusPath, payload) {
  const dir = path.dirname(statusPath)
  if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true })
  const tmp = `${statusPath}.tmp`
  fsSync.writeFileSync(tmp, JSON.stringify(payload), 'utf8')
  fsSync.renameSync(tmp, statusPath)
}

function prefixFor(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/')
  const dir = path.posix.dirname(normalized)
  if (dir === '.' || dir === '') return ''
  const depth = dir.split('/').length
  return '../'.repeat(depth)
}

function sanitizeSlug(slug, fallbackId) {
  const safe = String(slug || '').trim()
  if (safe && /^[a-zA-Z0-9_-]+$/.test(safe)) return safe
  return String(fallbackId)
}

function rewriteContentUrls(html, prefix) {
  if (!html) return ''
  let output = html
  output = output.replace(/(src|href)=(["'])\/upload\//g, `$1=$2${prefix}upload/`)
  output = output.replace(/(src|href)=(["'])\/theme\//g, `$1=$2${prefix}theme/`)
  output = output.replace(/url\((["']?)\/upload\//g, `url($1${prefix}upload/`)
  output = output.replace(/url\((["']?)\/theme\//g, `url($1${prefix}theme/`)
  return output
}

function buildTagMap(tags) {
  const map = {}
  for (const tag of tags) {
    if (!tag || !tag.tag) continue
    map[tag.tag] = tag.display_name || tag.tag
  }
  return map
}

function paginate(items, perPage) {
  const total = items.length
  const totalPages = total > perPage ? Math.ceil(total / perPage) : 1
  const pages = []
  for (let page = 1; page <= totalPages; page += 1) {
    const offset = (page - 1) * perPage
    pages.push({
      page,
      items: items.slice(offset, offset + perPage),
      totalPages
    })
  }
  return pages
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const dataPath = args.data
  const outDir = args.out
  const statusPath = args.status

  if (!dataPath || !outDir || !statusPath) {
    console.error('Missing required arguments: --data --out --status')
    process.exit(1)
  }

  const payload = JSON.parse(await fs.readFile(dataPath, 'utf8'))
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const siteOptions = payload.siteOptions || {}
  const theme = payload.theme || { slug: 'default', entry_css: 'style.css' }
  const layout = payload.layout || {}
  const postsRaw = Array.isArray(payload.posts) ? payload.posts : []
  const tags = Array.isArray(payload.tags) ? payload.tags : []

  const perPage = 100
  const labels = siteOptions.lang === 'en'
    ? {
        lang: 'en',
        latest: 'Latest Posts',
        empty: 'No posts in this category',
        back: 'Back to list',
        dateLabel: 'Date:',
        updatedLabel: 'Updated:',
        prev: 'Prev',
        next: 'Next',
        categoryPrefix: 'Category: '
      }
    : {
        lang: 'zh-CN',
        latest: '最新文章',
        empty: '该分类下无文章',
        back: '返回列表',
        dateLabel: '发布时间:',
        updatedLabel: '更新于:',
        prev: '上一页',
        next: '下一页',
        categoryPrefix: '分类: '
      }

  writeStatus(statusPath, { status: 'running', progress: 0, message: 'Initializing export' })

  await emptyDir(outDir)
  await ensureDir(outDir)

  const themeSrc = path.join(root, 'public', 'theme', theme.slug)
  const themeDest = path.join(outDir, 'theme', theme.slug)
  await copyDir(themeSrc, themeDest, { skip: new Set(['theme.json', 'thumbnail.svg']) })

  const uploadSrc = path.join(root, 'upload')
  const uploadDest = path.join(outDir, 'upload')
  await copyDir(uploadSrc, uploadDest)

  const tagMap = buildTagMap(tags)
  const posts = postsRaw
    .map((post) => ({
      ...post,
      slug: sanitizeSlug(post.slug, post.id)
    }))
    .sort((a, b) => {
      const ad = new Date(a.created_at || 0).getTime()
      const bd = new Date(b.created_at || 0).getTime()
      if (bd !== ad) return bd - ad
      return (b.id || 0) - (a.id || 0)
    })

  const vite = await createServer({
    root,
    configFile: false,
    envFile: false,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
    plugins: [react()],
    resolve: {
      preserveSymlinks: true
    },
    ssr: {
      external: ['react', 'react-dom', 'react-dom/server']
    }
  })

  const renderer = await vite.ssrLoadModule('/src/ssg/entry-server.jsx')
  const { renderHomePage, renderPostPage } = renderer

  const totalListPages = (() => {
    const homePages = paginate(posts, perPage).length
    let tagPages = 0
    for (const tag of tags) {
      const tagPosts = posts.filter((p) => p.tag === tag.tag)
      tagPages += paginate(tagPosts, perPage).length
    }
    return homePages + tagPages
  })()

  const totalPostPages = posts.length
  const totalUnits = totalListPages + totalPostPages + 2
  let completed = 0

  const updateProgress = (message) => {
    completed += 1
    const progress = Math.min(100, Math.round((completed / totalUnits) * 100))
    writeStatus(statusPath, { status: 'running', progress, message })
  }

  const themeHrefFor = (relativePath) => {
    const prefix = prefixFor(relativePath)
    return `${prefix}theme/${encodeURIComponent(theme.slug)}/${theme.entry_css}`
  }

  // Home pages
  const homePages = paginate(posts, perPage)
  for (const pageData of homePages) {
    const baseName = 'index'
    const fileName = pageData.page === 1 ? `${baseName}.html` : `${baseName}_${pageData.page}.html`
    const relPath = fileName
    const prefix = prefixFor(relPath)
    const html = renderHomePage({
      siteOptions,
      tagMap,
      posts: pageData.items,
      pagination: { page: pageData.page, totalPages: pageData.totalPages },
      layout,
      prefix,
      themeHref: themeHrefFor(relPath),
      labels: { ...labels, categoryName: '' },
      baseName
    })
    await fs.writeFile(path.join(outDir, fileName), html)
    updateProgress(`Exporting ${fileName}`)
  }

  // Tag pages (always generate even if empty)
  for (const tag of tags) {
    const tagPosts = posts.filter((p) => p.tag === tag.tag)
    const pages = paginate(tagPosts, perPage)
    for (const pageData of pages) {
      const baseName = encodeURIComponent(tag.tag)
      const fileName = pageData.page === 1 ? `${baseName}.html` : `${baseName}_${pageData.page}.html`
      const relPath = fileName
      const prefix = prefixFor(relPath)
      const html = renderHomePage({
        siteOptions,
        tagMap,
        posts: pageData.items,
        pagination: { page: pageData.page, totalPages: pageData.totalPages },
        layout,
        prefix,
        themeHref: themeHrefFor(relPath),
        labels: { ...labels, categoryName: tag.display_name || tag.tag },
        baseName
      })
      await fs.writeFile(path.join(outDir, fileName), html)
      updateProgress(`Exporting ${fileName}`)
    }
  }

  // Post pages with prev/next
  for (let i = 0; i < posts.length; i += 1) {
    const post = { ...posts[i] }
    const prev = posts[i + 1] || null
    const next = posts[i - 1] || null
    const fileName = `${post.slug}.html`
    const relPath = path.posix.join('post', fileName)
    const prefix = prefixFor(relPath)
    post.content = rewriteContentUrls(post.content || '', prefix)

    const html = renderPostPage({
      siteOptions,
      tagMap,
      post,
      prev,
      next,
      layout,
      prefix,
      themeHref: themeHrefFor(relPath),
      labels
    })
    const postDir = path.join(outDir, 'post')
    await ensureDir(postDir)
    await fs.writeFile(path.join(postDir, fileName), html)
    updateProgress(`Exporting post/${fileName}`)
  }

  // RSS
  const siteUrl = (siteOptions.site_url || '').replace(/\/$/, '')
  const rssItems = posts.slice(0, 20)
  const rssLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"><channel>',
    `<title>${escapeXml(siteOptions.site_title || 'PeachtreesCMS')}</title>`,
    `<link>${siteUrl || ''}</link>`,
    '<description></description>'
  ]
  for (const item of rssItems) {
    const link = siteUrl ? `${siteUrl}/post/${encodeURIComponent(item.slug)}.html` : `post/${encodeURIComponent(item.slug)}.html`
    rssLines.push('<item>')
    rssLines.push(`<title>${escapeXml(item.title || '')}</title>`)
    rssLines.push(`<link>${link}</link>`)
    rssLines.push(`<guid>${link}</guid>`)
    rssLines.push(`<pubDate>${new Date(item.created_at || Date.now()).toUTCString()}</pubDate>`)
    rssLines.push(`<description><![CDATA[${item.summary || ''}]]></description>`)
    rssLines.push('</item>')
  }
  rssLines.push('</channel></rss>')
  await fs.writeFile(path.join(outDir, 'rss.xml'), rssLines.join('\n'))
  updateProgress('Exporting rss.xml')

  // Sitemap
  const sitemapUrls = []
  const addUrl = (rel) => {
    if (siteUrl) {
      sitemapUrls.push(`${siteUrl}/${rel}`)
    } else {
      sitemapUrls.push(rel)
    }
  }
  addUrl('index.html')
  for (const pageData of homePages.slice(1)) {
    addUrl(`index_${pageData.page}.html`)
  }
  for (const tag of tags) {
    const tagPosts = posts.filter((p) => p.tag === tag.tag)
    const pages = paginate(tagPosts, perPage)
    const baseName = encodeURIComponent(tag.tag)
    pages.forEach((pageData) => {
      const rel = pageData.page === 1 ? `${baseName}.html` : `${baseName}_${pageData.page}.html`
      addUrl(rel)
    })
  }
  for (const post of posts) {
    addUrl(`post/${encodeURIComponent(post.slug)}.html`)
  }
  const sitemapLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ]
  for (const url of sitemapUrls) {
    sitemapLines.push(`<url><loc>${url}</loc></url>`)
  }
  sitemapLines.push('</urlset>')
  await fs.writeFile(path.join(outDir, 'sitemap.xml'), sitemapLines.join('\n'))
  updateProgress('Exporting sitemap.xml')

  writeStatus(statusPath, { status: 'done', progress: 100, message: 'Export completed' })

  await vite.close()

  const summary = {
    path: 'static_html',
    posts: posts.length,
    pages: totalListPages + totalPostPages
  }
  process.stdout.write(JSON.stringify(summary))
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
