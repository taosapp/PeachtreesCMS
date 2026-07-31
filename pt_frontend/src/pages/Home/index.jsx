import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { postsAPI } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import Header from '../../components/Header'
import CategoryNav from '../../components/CategoryNav'
import Footer from '../../components/Footer'
import Pager from '../../components/Pager'
import { getLayoutComponent } from '../../layouts'
import { patternUrl } from '../../utils/path'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { lang } = useLanguage()
  const { layout } = useTheme()

  const page = parseInt(searchParams.get('page') || '1')
  const tag = searchParams.get('tag')
  const layoutTemplate = layout?.home?.template || 'single-column'
  const sidebarPosition = layout?.home?.columns?.sidebar || 'left'
  const Layout = getLayoutComponent(layoutTemplate)

  useEffect(() => {
    loadPosts()
  }, [page, tag])

  // Dynamically load category page pattern CSS
  useEffect(() => {
    const existing = document.getElementById('tag-pattern-css')
    if (existing) existing.remove()

    if (tag && posts.length > 0 && posts[0].tag_page_style) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = patternUrl(posts[0].tag_page_style, 'style.css')
      link.id = 'tag-pattern-css'
      document.head.appendChild(link)
    }

    return () => {
      const el = document.getElementById('tag-pattern-css')
      if (el) el.remove()
    }
  }, [tag, posts])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const params = { page, perPage: 10 }
      if (tag) params.tag = tag

      const res = await postsAPI.getList(params)
      if (res.success) {
        setPosts(res.data.posts)
        setPagination(res.data.pagination)
      }
    } catch (err) {
      console.error('Failed to load posts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage)
    setSearchParams(params)
    window.scrollTo(0, 0)
  }

  const renderPostList = () => {
    if (loading) {
      return (
        <div className="post-list-state">
          {lang('loading')}
        </div>
      )
    }

    if (error) {
      return (
        <div className="post-list-state error">
          {lang('error')}
        </div>
      )
    }

    if (posts.length === 0) {
      return (
        <div className="post-list-state empty">
          {lang('noPosts')}
        </div>
      )
    }

    return (
      <div className="post-list">
        {posts.map(post => (
          <article key={post.id}>
            <h2>
              <Link to={`/post/${post.slug || post.id}`}>
                {post.title}
              </Link>
              {post.post_type === 'big-picture' && (
                <span className="label-big-picture">big-picture</span>
              )}
            </h2>
            <p className="article-excerpt">{post.excerpt}</p>
            <div className="article-meta">
              <small>{post.created_at?.split(' ')[0]}</small>
              {post.display_name && (
                <Link to={`/?tag=${post.tag}`}>
                  {post.display_name}
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    )
  }

  const header = <Header />
  const tagsSection = (
    <section className="tags">
      <CategoryNav className="li-horizontal" />
    </section>
  )
  const mainContent = (
    <>
      {renderPostList()}
      <div className="main-pager">
        <Pager
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </>
  )
  const footer = <Footer />

  return (
    <Layout
      header={header}
      tags={tagsSection}
      main={mainContent}
      footer={footer}
      sidebarPosition={sidebarPosition}
    />
  )
}
