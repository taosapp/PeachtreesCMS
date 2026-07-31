import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { postsAPI, commentsAPI, apiUrl } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import Header from '../../components/Header'
import CategoryNav from '../../components/CategoryNav'
import Footer from '../../components/Footer'
import { getLayoutComponent } from '../../layouts'
import { patternUrl, uploadUrl } from '../../utils/path'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import { toast } from '../../utils/toast'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

function isMp4(path) {
  return /\.mp4($|\?)/i.test(path)
}

export default function PostDetail() {
  const { identifier } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [commentForm, setCommentForm] = useState({
    nickname: '',
    email: '',
    website: '',
    content: '',
    captcha: ''
  })
  const [captchaUrl, setCaptchaUrl] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const { lang } = useLanguage()
  const { layout } = useTheme()

  useEffect(() => {
    loadPost()
  }, [identifier])

  useEffect(() => {
    if (post && post.id) {
      loadComments(post.id)
    }
  }, [post])

  const loadPost = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await postsAPI.getOne(identifier)
      if (res.success) {
        setPost(res.data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Dynamically load page pattern CSS - Category style takes precedence over post style
  useEffect(() => {
    // Remove old pattern CSS
    const existing = document.getElementById('page-pattern-css')
    if (existing) existing.remove()

    // Determine the page style to use: Category style takes precedence over post style
    const effectivePageStyle = post?.tag_page_style || post?.page_style

    // Add new pattern CSS
    if (effectivePageStyle) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = patternUrl(effectivePageStyle, 'style.css')
      link.id = 'page-pattern-css'
      document.head.appendChild(link)
    }

    // Cleanup function: remove pattern CSS when leaving page
    return () => {
      const el = document.getElementById('page-pattern-css')
      if (el) el.remove()
    }
  }, [post])

  const loadComments = async (postId) => {
    setCommentsLoading(true)
    try {
      const res = await commentsAPI.getList({ post_id: postId, status: 1 })
      if (res.success) {
        setComments(res.data.comments)
      }
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setCommentsLoading(false)
    }
  }

  const refreshCaptcha = () => {
    setCaptchaUrl(`${apiUrl('/captcha.php')}?t=${Date.now()}`)
  }

  useEffect(() => {
    refreshCaptcha()
  }, [])

  const handleCommentSubmit = async (e) => {
    e.preventDefault()

    if (!commentForm.nickname.trim()) {
      toast(lang('fieldRequired').replace('{field}', lang('nickname')), 'error')
      return
    }
    if (!commentForm.email.trim()) {
      toast(lang('fieldRequired').replace('{field}', lang('email')), 'error')
      return
    }
    if (!commentForm.content.trim()) {
      toast(lang('fieldRequired').replace('{field}', lang('commentContent')), 'error')
      return
    }
    if (!commentForm.captcha.trim()) {
      toast(lang('fieldRequired').replace('{field}', lang('captcha')), 'error')
      return
    }

    setSubmitting(true)
    try {
      await commentsAPI.create({
        post_id: post.id,
        nickname: commentForm.nickname,
        email: commentForm.email,
        website: commentForm.website,
        content: commentForm.content,
        captcha: commentForm.captcha,
        parent_id: replyingTo ? replyingTo.id : null
      })
      toast(lang('commentSubmitSuccess'), 'success')
      setCommentForm({
        nickname: '',
        email: '',
        website: '',
        content: '',
        captcha: ''
      })
      setShowCommentForm(false)
      setReplyingTo(null)
      refreshCaptcha()
      loadComments(post.id) // 刷新评论列表
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = (comment) => {
    setReplyingTo(comment)
    setShowCommentForm(true)
    // Scroll to the comment form
    setTimeout(() => {
      const formElement = document.getElementById('comment-form')
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  const handleCommentInputChange = (e) => {
    setCommentForm({ ...commentForm, [e.target.name]: e.target.value })
  }

  const renderComment = (comment, depth = 0) => {
    return (
      <div key={comment.id} className={`comment-item ${depth > 0 ? 'comment-reply' : ''}`}>
        <div className="comment-card">
          <div className="comment-header">
            <div className="comment-author">
              <strong>{comment.nickname}</strong>
              {comment.website && (
                <a
                  href={comment.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="comment-website"
                >
                  {lang('website')}
                </a>
              )}
            </div>
            <div className="comment-meta">
              <small className="comment-date">{comment.created_at}</small>
              <button
                className="comment-reply-btn"
                onClick={() => handleReply(comment)}
              >
                {lang('reply')}
              </button>
            </div>
          </div>
          <p className="comment-content">{comment.content}</p>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const layoutTemplate = layout?.post?.template || 'single-column'
  const sidebarPosition = layout?.post?.columns?.sidebar || 'left'
  const Layout = getLayoutComponent(layoutTemplate)

  const header = <Header />
  const tagsSection = (
    <section className="tags">
      <CategoryNav className="li-horizontal" />
    </section>
  )
  const footer = <Footer />

  const renderLayout = (mainContent) => (
    <Layout
      header={header}
      tags={tagsSection}
      main={mainContent}
      footer={footer}
      sidebarPosition={sidebarPosition}
    />
  )

  if (loading) {
    return renderLayout(
      <div className="post-list-state">
        {lang('loading')}
      </div>
    )
  }

  if (error || !post) {
    return renderLayout(
      <div className="post-list-state error">
        {lang('error')}
      </div>
    )
  }

  const isBigPicture = post.post_type === 'big-picture'
  const coverMedia = Array.isArray(post.cover_media)
    ? post.cover_media.map(item => typeof item === 'string' ? { path: item, caption: '' } : item)
    : []

  const renderBigPictureCover = () => (
    <div className="main-big-picture-cover">
      {coverMedia.length > 1 ? (
        <Swiper
          className="main-big-picture-swiper"
          modules={[Pagination, Navigation]}
          loop
          pagination={{ clickable: true }}
          navigation={true}
        >
          {coverMedia.map((item, idx) => (
            <SwiperSlide key={`${item.path}-${idx}`}>
              {isMp4(item.path) ? (
                <video src={uploadUrl(item.path)} className="main-big-picture-media" autoPlay muted loop playsInline />
              ) : (
                <div className="main-big-picture-media" style={{ backgroundImage: `url(${uploadUrl(item.path)})` }} />
              )}
              {item.caption && <div className="caption"><div className="inner">{item.caption}</div></div>}
            </SwiperSlide>
          ))}
        </Swiper>
      ) : coverMedia.length === 1 ? (
        <div className="main-big-picture-single">
          {isMp4(coverMedia[0].path) ? (
            <video src={uploadUrl(coverMedia[0].path)} className="main-big-picture-media" autoPlay muted loop playsInline />
          ) : (
            <div className="main-big-picture-media" style={{ backgroundImage: `url(${uploadUrl(coverMedia[0].path)})` }} />
          )}
          {coverMedia[0].caption && <div className="caption"><div className="inner">{coverMedia[0].caption}</div></div>}
        </div>
      ) : ("")}

    </div>
  )

  const renderPostArticle = () => (
    <article className="article-detail">
      {!isBigPicture && <h1 className="article-title">{post.title}</h1>}
      <div className="meta">
        <small>{lang('postDate')}: {post.created_at}</small>
        {post.updated_at !== post.created_at && (
          <small>{lang('updatedAtLabel')}: {post.updated_at}</small>
        )}
      </div>
      <div
        className="content"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
      />
    </article>
  )

  const renderCommentsSection = () => {
    if (post.allow_comments !== 1) return null
    return (
      <div className="comments">
        <div className="title">
          <h5>{lang('comments')}</h5>
        </div>
        <div className="comments-body">
          {!showCommentForm && (
            <button
              className="btn-show-form"
              onClick={() => {
                setReplyingTo(null)
                setShowCommentForm(true)
              }}
            >
              {lang('postComment')}
            </button>
          )}

          {showCommentForm && (
            <form id="comment-form" className="comment-form" onSubmit={handleCommentSubmit}>
              {replyingTo && (
                <div className="replying-to">
                  {lang('replyTo')} {replyingTo.nickname}
                </div>
              )}
              <div className="field">
                <label>{lang('nickname')} <span>*</span></label>
                <input
                  required
                  type="text"
                  name="nickname"
                  value={commentForm.nickname}
                  onChange={handleCommentInputChange}
                />
              </div>
              <div className="field">
                <label>{lang('email')} <span>*</span></label>
                <input
                  required
                  type="email"
                  name="email"
                  value={commentForm.email}
                  onChange={handleCommentInputChange}
                />
              </div>
              <div className="field">
                <label>{lang('website')}</label>
                <input
                  placeholder="https://"
                  type="url"
                  name="website"
                  value={commentForm.website}
                  onChange={handleCommentInputChange}
                />
              </div>
              <div className="field">
                <label>{lang('commentContent')} <span>*</span></label>
                <textarea
                  name="content"
                  rows="4"
                  required
                  value={commentForm.content}
                  onChange={handleCommentInputChange}
                />
              </div>
              <div className="field">
                <label>{lang('captcha')} <span>*</span></label>
                <div className="captcha">
                  <input
                    required
                    placeholder={lang('captchaPlaceholder')}
                    type="text"
                    name="captcha"
                    value={commentForm.captcha}
                    onChange={handleCommentInputChange}
                  />
                  <img
                    alt={lang('captcha')}
                    title={lang('refreshCaptcha')}
                    src={captchaUrl}
                    onClick={refreshCaptcha}
                  />
                </div>
              </div>
              <div className="actions">
                <button type="submit" disabled={submitting}>
                  {submitting ? lang('submitting') : lang('submit')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCommentForm(false)
                    handleCancelReply()
                  }}
                >
                  {lang('cancel')}
                </button>
              </div>
            </form>
          )}

          {commentsLoading ? (
            <div className="comments-loading">{lang('loading')}</div>
          ) : comments.length === 0 ? (
            <div className="comments-empty">{lang('noCommentsYet')}</div>
          ) : (
            <div className="comments-list">
              {comments.map(comment => renderComment(comment))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderNavigation = () => {
    const prevPost = post.prev_post
    const nextPost = post.next_post

    if (!prevPost && !nextPost) return null

    return (
      <div className="article-nav">
        {prevPost && (
          <Link to={`/post/${prevPost.slug || prevPost.id}`}>
            <small>{lang('prevPost')}</small>
            <h6>{prevPost.title}</h6>
          </Link>
        )}
        {nextPost && (
          <Link to={`/post/${nextPost.slug || nextPost.id}`}>
            <small>{lang('nextPost')}</small>
            <h6>{nextPost.title}</h6>
          </Link>
        )}
      </div>
    )
  }

  const mainContent = (
    <>
      {renderPostArticle()}
      {renderNavigation()}
      {renderCommentsSection()}
    </>
  )

  return (
    <>
      {isBigPicture && renderBigPictureCover()}
      {renderLayout(mainContent)}
    </>
  )
}
