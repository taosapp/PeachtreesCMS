import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { useLanguage } from '../../contexts/LanguageContext'
import { mediaAPI } from '../../services/api'

const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'video' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes({ controls: 'true', style: 'max-width: 100%; height: auto;' }, HTMLAttributes)]
  },
})

const Audio = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'audio' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['audio', mergeAttributes({ controls: 'true', style: 'width: 100%;' }, HTMLAttributes)]
  },
})

function ToolbarButton({ onClick, active = false, label, icon, disabled = false }) {
  return (
    <button
      type="button"
      className={`btn btn-sm ${active ? 'btn-dark' : 'btn-outline-secondary'}`}
      onClick={onClick}
      title={label}
      disabled={disabled}
    >
      <i className={`bi ${icon}`}></i>
    </button>
  )
}

export default function TiptapEditor({ value, onChange, onUploadImage, onUploadVideo, onUploadAudio }) {
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [sourceCode, setSourceCode] = useState(value || '')
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [mediaType, setMediaType] = useState('image')
  const [mediaFiles, setMediaFiles] = useState([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaPage, setMediaPage] = useState(1)
  const { lang } = useLanguage()

  const mediaPerPage = 50

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image,
      Video,
      Audio,
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content'
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML())
    }
  })

  useEffect(() => {
    if (!editor) return
    const nextValue = value || ''
    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, false)
    }
  }, [editor, value])

  useEffect(() => {
    if (showSource) {
      setSourceCode(value || '')
    }
  }, [showSource, value])

  useEffect(() => {
    if (!showMediaModal) return
    const loadMedia = async () => {
      setMediaLoading(true)
      try {
        const res = await mediaAPI.getList()
        if (res.success) {
          setMediaFiles(res.data.files || [])
        }
      } finally {
        setMediaLoading(false)
      }
    }
    loadMedia()
  }, [showMediaModal])

  useEffect(() => {
    if (showMediaModal) {
      setMediaPage(1)
    }
  }, [mediaType, showMediaModal])

  if (!editor) return null

  const handleImageSelect = () => {
    imageInputRef.current?.click()
  }

  const handleUpload = async (event, onUpload, insertMedia) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!onUpload) return

    setUploadingMedia(true)
    try {
      const mediaUrl = await onUpload(file)
      if (mediaUrl) {
        insertMedia(mediaUrl)
      }
    } catch (err) {
      console.error('Failed to upload media:', err)
      alert(err.message || lang('uploadFailed'))
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href || ''
    const input = window.prompt(lang('enterLinkUrl'), previousUrl)

    if (input === null) return

    const url = input.trim()
    if (!url) {
      editor.chain().focus().unsetLink().run()
      return
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' })
      .run()
  }

  const handleSourceSave = () => {
    editor.commands.setContent(sourceCode, false)
    onChange(sourceCode)
    setShowSource(false)
  }

  const openMediaModal = (type) => {
    setMediaType(type)
    setShowMediaModal(true)
  }

  const insertMedia = (url) => {
    if (!url) return
    if (mediaType === 'image') {
      editor.chain().focus().setImage({ src: url }).run()
    } else if (mediaType === 'video') {
      editor.chain().focus().insertContent({ type: 'video', attrs: { src: url } }).run()
    } else if (mediaType === 'audio') {
      editor.chain().focus().insertContent({ type: 'audio', attrs: { src: url } }).run()
    }
    setShowMediaModal(false)
  }

  const handleModalUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    setMediaUploading(true)
    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('files[]', file))
      await mediaAPI.upload(formData)
      const res = await mediaAPI.getList()
      if (res.success) {
        setMediaFiles(res.data.files || [])
        setMediaPage(1)
      }
    } catch (err) {
      alert(err.message || lang('uploadFailed'))
    } finally {
      setMediaUploading(false)
      event.target.value = ''
    }
  }

  const modalFiles = useMemo(() => {
    const list = mediaFiles.filter((file) => file.type === mediaType)
    const start = (mediaPage - 1) * mediaPerPage
    return {
      total: list.length,
      items: list.slice(start, start + mediaPerPage)
    }
  }, [mediaFiles, mediaType, mediaPage])

  const totalPages = Math.max(1, Math.ceil(modalFiles.total / mediaPerPage))

  return (
    <div className="tiptap-editor card border-0 shadow-sm">
      <div className="card-header bg-white d-flex flex-wrap gap-2">
        <ToolbarButton
          icon="bi-type-bold"
          label={lang('editorBold')}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon="bi-type-italic"
          label={lang('editorItalic')}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon="bi-type-underline"
          label={lang('editorStrike')}
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          icon="bi-list-ul"
          label={lang('editorBulletList')}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon="bi-list-ol"
          label={lang('editorOrderedList')}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          icon="bi-code-slash"
          label={lang('editorCodeBlock')}
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <ToolbarButton
          icon="bi-quote"
          label={lang('editorBlockquote')}
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          icon="bi-link-45deg"
          label={lang('editorLink')}
          active={editor.isActive('link')}
          onClick={handleSetLink}
        />
        <ToolbarButton
          icon="bi-link"
          label={lang('editorUnlink')}
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
        />
        <ToolbarButton
          icon="bi-table"
          label={lang('editorInsertTable')}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        />
        <ToolbarButton
          icon="bi-plus-square"
          label={lang('editorAddRow')}
          onClick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!editor.isActive('table')}
        />
        <ToolbarButton
          icon="bi-plus-square-dotted"
          label={lang('editorAddColumn')}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!editor.isActive('table')}
        />
        <ToolbarButton
          icon="bi-trash"
          label={lang('editorDeleteTable')}
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={!editor.isActive('table')}
        />
        <ToolbarButton
          icon="bi-image"
          label={lang('editorAddImage')}
          onClick={() => openMediaModal('image')}
          disabled={uploadingMedia || !onUploadImage}
        />
        <ToolbarButton
          icon="bi-film"
          label={lang('editorAddVideo')}
          onClick={() => openMediaModal('video')}
          disabled={uploadingMedia || !onUploadVideo}
        />
        <ToolbarButton
          icon="bi-music-note-beamed"
          label={lang('editorAddAudio')}
          onClick={() => openMediaModal('audio')}
          disabled={uploadingMedia || !onUploadAudio}
        />
        <ToolbarButton
          icon="bi-arrow-counterclockwise"
          label={lang('editorUndo')}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          icon="bi-arrow-clockwise"
          label={lang('editorRedo')}
          onClick={() => editor.chain().focus().redo().run()}
        />
        <ToolbarButton
          icon="bi-filetype-html"
          label={lang('editorSourceCode')}
          active={showSource}
          onClick={() => setShowSource(!showSource)}
        />
      </div>
      <div className="card-body p-0">
        {showSource ? (
          <div className="p-3">
            <textarea
              className="form-control font-monospace"
              rows="8"
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              style={{ fontSize: '0.875rem' }}
            />
            <div className="mt-2 d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleSourceSave}
              >
                <i className="bi bi-check-lg me-1"></i>
                {lang('apply')}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowSource(false)}
              >
                <i className="bi bi-x-lg me-1"></i>
                {lang('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
      {showMediaModal && (
        <div className="media-modal-backdrop">
          <div className="media-modal">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{lang('mediaSelect')}</h5>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowMediaModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="d-flex align-items-center gap-2 mb-3">
              <label className="btn btn-primary btn-sm mb-0">
                <i className="bi bi-upload me-1"></i>
                {mediaUploading ? lang('uploading') : lang('mediaUpload')}
                <input
                  type="file"
                  multiple
                  accept={mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/*' : 'audio/*'}
                  className="d-none"
                  onChange={handleModalUpload}
                  disabled={mediaUploading}
                />
              </label>
              <span className="text-muted small">{lang('mediaUploadHint')}</span>
            </div>

            {mediaLoading ? (
              <div className="text-muted">{lang('loading')}</div>
            ) : modalFiles.total === 0 ? (
              <div className="text-muted">{lang('mediaEmpty')}</div>
            ) : (
              <>
                <div className="media-grid">
                  {modalFiles.items.map((file) => (
                    <div className="card h-100 shadow-sm" key={file.path}>
                      <div className="media-preview">
                        {file.type === 'image' && <img src={file.url} alt={file.path} className="media-thumb" />}
                        {file.type === 'video' && <video className="media-thumb" controls src={file.url} />}
                        {file.type === 'audio' && <audio className="media-audio" controls src={file.url} />}
                      </div>
                      <div className="card-body">
                        <div className="text-break small mb-2">{file.path}</div>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => insertMedia(file.url)}>
                          <i className="bi bi-check2 me-1"></i>
                          {lang('mediaInsert')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav className="mt-3">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${mediaPage <= 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setMediaPage(mediaPage - 1)} disabled={mediaPage <= 1}>
                          {lang('prev')}
                        </button>
                      </li>
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1
                        return (
                          <li className={`page-item ${pageNum === mediaPage ? 'active' : ''}`} key={pageNum}>
                            <button className="page-link" onClick={() => setMediaPage(pageNum)}>
                              {pageNum}
                            </button>
                          </li>
                        )
                      })}
                      <li className={`page-item ${mediaPage >= totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setMediaPage(mediaPage + 1)} disabled={mediaPage >= totalPages}>
                          {lang('next')}
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
