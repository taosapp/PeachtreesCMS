import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getLayoutComponent } from '../layouts'
import StaticHeader from './components/StaticHeader'
import StaticTags from './components/StaticTags'
import StaticFooter from './components/StaticFooter'
import StaticPager from './components/StaticPager'

function Document({ lang, title, themeHref, bodyHtml, extraCss = [], extraJs = [], extraInlineScripts = [] }) {
  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {extraCss.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        <link rel="stylesheet" href={themeHref} />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        {extraJs.map((src) => (
          <script key={src} src={src}></script>
        ))}
        {extraInlineScripts.map((code, idx) => (
          <script key={`inline-${idx}`} dangerouslySetInnerHTML={{ __html: code }}></script>
        ))}
      </body>
    </html>
  )
}

function wrapDocument({ lang, title, themeHref, body, extraCss, extraJs, extraInlineScripts }) {
  const html = renderToStaticMarkup(
    <Document
      lang={lang}
      title={title}
      themeHref={themeHref}
      bodyHtml={body}
      extraCss={extraCss}
      extraJs={extraJs}
      extraInlineScripts={extraInlineScripts}
    />
  )
  return `<!doctype html>${html}`
}

function buildLayout({ layoutTemplate, sidebarPosition, header, tags, main, footer }) {
  const Layout = getLayoutComponent(layoutTemplate)
  return renderToStaticMarkup(
    <Layout header={header} tags={tags} main={main} footer={footer} sidebarPosition={sidebarPosition} />
  )
}

export function renderHomePage({
  siteOptions,
  tagMap,
  posts,
  pagination,
  layout,
  prefix,
  themeHref,
  labels,
  baseName,
  extraCss = [],
  extraJs = [],
  extraInlineScripts = []
}) {
  const layoutTemplate = layout?.home?.template || 'single-column'
  const sidebarPosition = layout?.home?.columns?.sidebar || 'left'

  const header = <StaticHeader siteTitle={siteOptions.site_title} prefix={prefix} siteOptions={siteOptions} />
  const tags = <StaticTags tagMap={tagMap} prefix={prefix} layoutTemplate={layoutTemplate} />
  const footer = <StaticFooter footerHtml={siteOptions.footer_text || `© ${new Date().getFullYear()} ${siteOptions.site_title}`} />

  const main = (
    <>
      <div className="post-list">
        {posts.length === 0 ? (
          <div className="post-list-state empty">{labels.empty}</div>
        ) : (
          posts.map((post) => (
            <article key={post.id}>
              <h2>
                <a href={`${prefix}post/${encodeURIComponent(post.slug || post.id)}.html`}>{post.title}</a>
                {post.post_type === 'big-picture' && (
                  <span className="label-big-picture">big-picture</span>
                )}
              </h2>
              <p className="article-excerpt">{post.excerpt}</p>
              <div className="article-meta">
                <small>{post.created_at?.split(' ')[0]}</small>
                {post.display_name && (
                  <a href={`${prefix}${encodeURIComponent(post.tag)}.html`}>{post.display_name}</a>
                )}
              </div>
            </article>
          ))
        )}
      </div>
      <div className="main-pager">
        <StaticPager
          page={pagination.page}
          totalPages={pagination.totalPages}
          baseName={baseName}
          prefix={prefix}
          labels={labels}
        />
      </div>
    </>
  )

  const body = buildLayout({ layoutTemplate, sidebarPosition, header, tags, main, footer })
  const title = baseName === 'index' ? `${labels.latest} - ${siteOptions.site_title}` : `${labels.categoryPrefix}${labels.categoryName} - ${siteOptions.site_title}`

  return wrapDocument({ lang: labels.lang, title, themeHref, body, extraCss, extraJs, extraInlineScripts })
}

export function renderPostPage({
  siteOptions,
  tagMap,
  post,
  prev,
  next,
  layout,
  prefix,
  themeHref,
  labels,
  extraCss = [],
  extraJs = [],
  extraInlineScripts = []
}) {
  const layoutTemplate = layout?.post?.template || 'single-column'
  const sidebarPosition = layout?.post?.columns?.sidebar || 'left'

  const header = <StaticHeader siteTitle={siteOptions.site_title} prefix={prefix} siteOptions={siteOptions} />
  const tags = <StaticTags tagMap={tagMap} prefix={prefix} layoutTemplate={layoutTemplate} />
  const footer = <StaticFooter footerHtml={siteOptions.footer_text || `© ${new Date().getFullYear()} ${siteOptions.site_title}`} />

  // Add pattern CSS if post has a pattern
  const patternCssHref = post.page_pattern ? `${prefix}pattern/${post.page_pattern}/style.css` : null

  const isBigPicture = post.post_type === 'big-picture'
  const coverMedia = Array.isArray(post.cover_media) ? post.cover_media : []
  const renderCoverMedia = (path, idx) => {
    const isVideo = /\.mp4($|\?)/i.test(path)
    if (isVideo) {
      return (
        <video
          key={`${path}-${idx}`}
          src={path}
          className="main-big-picture-media"
          autoPlay
          muted
          loop
          playsInline
        />
      )
    }
    return (
      <div
        key={`${path}-${idx}`}
        className="main-big-picture-media"
        style={{ backgroundImage: `url(${path})` }}
      />
    )
  }

  const coverSummary = post.summary || ''
  const coverTagName = post.display_name || ''
  const coverTag = post.tag || ''

  const cover = isBigPicture ? (
    <div className="main-big-picture-cover">
      {coverMedia.length > 1 ? (
        <div className="main-big-picture-swiper swiper swiper-initialized swiper-horizontal swiper-backface-hidden">
          <div className="swiper-wrapper">
            {coverMedia.map((path, idx) => (
              <div className="swiper-slide" key={`${path}-${idx}`}>
                {renderCoverMedia(path, idx)}
              </div>
            ))}
          </div>
          <div className="swiper-pagination"></div>
          <div className="swiper-button-prev"></div>
          <div className="swiper-button-next"></div>
        </div>
      ) : coverMedia.length === 1 ? (
        renderCoverMedia(coverMedia[0], 0)
      ) : (
        <div className="main-big-picture-media main-big-picture-empty" />
      )}

      <div className="main-big-picture-overlay" />
      <div className="caption">
        <h1>{post.title}</h1>
        {(coverSummary || coverTagName) && (
          <p className="summary">
            {coverSummary}
            {coverTagName && (
              <>
                <span className="summary-sep">·</span>
                <a href={`${prefix}${encodeURIComponent(coverTag)}.html`}>{coverTagName}</a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  ) : null

  const nav = (prev || next) ? (
    <div className="article-nav">
      {prev && (
        <a href={`${prefix}post/${encodeURIComponent(prev.slug || prev.id)}.html`}>
          <small>上一篇</small>
          <h6>{prev.title}</h6>
        </a>
      )}
      {next && (
        <a href={`${prefix}post/${encodeURIComponent(next.slug || next.id)}.html`}>
          <small>下一篇</small>
          <h6>{next.title}</h6>
        </a>
      )}
    </div>
  ) : null

  const main = (
    <>
      <article className="article-detail">
        {!isBigPicture && <h1 className="article-title">{post.title}</h1>}
        <div className="meta">
          <small>{labels.dateLabel} {post.created_at}</small>
          {post.updated_at && post.updated_at !== post.created_at && (
            <small>{labels.updatedLabel} {post.updated_at}</small>
          )}
        </div>
        <div className="content" dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
      {nav}
    </>
  )

  const body = buildLayout({ layoutTemplate, sidebarPosition, header, tags, main, footer })
  const title = `${post.title} - ${siteOptions.site_title}`

  const bodyWithCover = cover ? renderToStaticMarkup(
    <>
      {cover}
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </>
  ) : body

  // Add pattern CSS to extraCss
  const allExtraCss = patternCssHref ? [...extraCss, patternCssHref] : extraCss

  return wrapDocument({ lang: labels.lang, title, themeHref, body: bodyWithCover, extraCss: allExtraCss, extraJs, extraInlineScripts })
}
