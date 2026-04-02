import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getLayoutComponent } from '../layouts'
import StaticHeader from './components/StaticHeader'
import StaticTags from './components/StaticTags'
import StaticFooter from './components/StaticFooter'
import StaticPager from './components/StaticPager'

function Document({ lang, title, themeHref, bodyHtml }) {
  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="stylesheet" href={themeHref} />
      </head>
      <body dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </html>
  )
}

function wrapDocument({ lang, title, themeHref, body }) {
  const html = renderToStaticMarkup(<Document lang={lang} title={title} themeHref={themeHref} bodyHtml={body} />)
  return `<!doctype html>${html}`
}

function buildLayout({ layoutTemplate, sidebarPosition, header, tags, main, footer }) {
  const Layout = getLayoutComponent(layoutTemplate)
  return renderToStaticMarkup(
    <Layout header={header} tags={tags} main={main} footer={footer} sidebarPosition={sidebarPosition} />
  )
}

export function renderHomePage({ siteOptions, tagMap, posts, pagination, layout, prefix, themeHref, labels, baseName }) {
  const layoutTemplate = layout?.home?.template || 'single-column'
  const sidebarPosition = layout?.home?.columns?.sidebar || 'left'

  const header = <StaticHeader siteTitle={siteOptions.site_title} prefix={prefix} />
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

  return wrapDocument({ lang: labels.lang, title, themeHref, body })
}

export function renderPostPage({ siteOptions, tagMap, post, prev, next, layout, prefix, themeHref, labels }) {
  const layoutTemplate = layout?.post?.template || 'single-column'
  const sidebarPosition = layout?.post?.columns?.sidebar || 'left'

  const header = <StaticHeader siteTitle={siteOptions.site_title} prefix={prefix} />
  const tags = <StaticTags tagMap={tagMap} prefix={prefix} layoutTemplate={layoutTemplate} />
  const footer = <StaticFooter footerHtml={siteOptions.footer_text || `© ${new Date().getFullYear()} ${siteOptions.site_title}`} />

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
        <h1 className="article-title">{post.title}</h1>
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

  return wrapDocument({ lang: labels.lang, title, themeHref, body })
}
