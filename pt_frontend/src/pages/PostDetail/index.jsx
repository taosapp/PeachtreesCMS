import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { postsAPI, commentsAPI, baseURL } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import Header from '../../components/Header'
import CategoryNav from '../../components/CategoryNav'
import Footer from '../../components/Footer'
import { getLayoutComponent } from '../../layouts'
import { publicUrl } from '../../utils/path'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

function toPublicPath(path) {
  if (!path) return ''
  return publicUrl(path)
}

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
    const base = baseURL.replace(/\/$/, '')
    setCaptchaUrl(`${base}/captcha.php?t=${Date.now()}`)
  }

  useEffect(() => {
    refreshCaptcha()
  }, [])

  const layoutTemplate = layout?.post?.template || 'single-column'
  const Layout = getLayoutComponent(layoutTemplate)

  if (loading) return <div className="text-center py-5">Loading...</div>
  if (error) return <div className="alert alert-danger">{error}</div>
  if (!post) return <div className="alert alert-warning">Post not found</div>

  const coverMedia = Array.isArray(post.cover_media) 
    ? post.cover_media.map(item => typeof item === 'string' ? { path: item, caption: '' } : item)
    : []

  return (
    <Layout>
      {post.post_type === 'big-picture' && (
        <div className="main-big-picture-container">
          {coverMedia.length > 1 ? (
            <Swiper
              className="main-big-picture-swiper"
              modules={[Autoplay, Pagination, Navigation]}
              loop
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              pagination={{ clickable: true }}
              navigation={true}
            >
              {coverMedia.map((item, idx) => (
                <SwiperSlide key={`${item.path}-${idx}`}>
                  {isMp4(item.path) ? (
                    <video src={toPublicPath(item.path)} className="main-big-picture-media" autoPlay muted loop playsInline />
                  ) : (
                    <div className="main-big-picture-media" style={{ backgroundImage: `url(${toPublicPath(item.path)})` }} />
                  )}
                  {item.caption && <div className="media-caption"><div className="caption-text">{item.caption}</div></div>}
                </SwiperSlide>
              ))}
            </Swiper>
          ) : coverMedia.length === 1 ? (
            <div className="main-big-picture-single">
              {isMp4(coverMedia[0].path) ? (
                <video src={toPublicPath(coverMedia[0].path)} className="main-big-picture-media" autoPlay muted loop playsInline />
              ) : (
                <div className="main-big-picture-media" style={{ backgroundImage: `url(${toPublicPath(coverMedia[0].path)})` }} />
              )}
              {coverMedia[0].caption && <div className="media-caption"><div className="caption-text">{coverMedia[0].caption}</div></div>}
            </div>
          ) : (
            <div className="main-big-picture-media main-big-picture-empty" />
          )}

          <div className="main-big-picture-overlay" />
          <div className="caption">
            <h1>{post.title}</h1>
            {(post.summary || post.display_name) && (
              <p className="summary">
                {post.summary}
                {post.display_name && (
                  <>
                    <span className="summary-sep">·</span>
                    <Link to={`/?tag=${post.tag}`}>{post.display_name}</Link>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="post-content">
        {post.post_type !== 'big-picture' && <h1>{post.title}</h1>}
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>

      <hr className="my-5" />
      {/* Comments section would be here */}
    </Layout>
  )
}
