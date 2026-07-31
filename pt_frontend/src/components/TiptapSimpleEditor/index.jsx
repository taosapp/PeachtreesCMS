import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useLanguage } from '../../contexts/LanguageContext'

export default function TiptapSimpleEditor({ value, onChange }) {
  const [showSource, setShowSource] = useState(false)
  const [sourceCode, setSourceCode] = useState(value || '')
  const { lang } = useLanguage()
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable unwanted marks
        code: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
        horizontalRule: false,
        hardBreak: false,
        link: false
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      })
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap-simple-content'
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

  if (!editor) return null

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

  return (
    <div className="tiptap-simple-editor card border-0 shadow-sm">
      <div className="card-header bg-white d-flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${editor.isActive('bold') ? 'btn-dark' : 'btn-outline-secondary'}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title={lang('editorBold')}
        >
          <i className="bi bi-type-bold"></i>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${editor.isActive('italic') ? 'btn-dark' : 'btn-outline-secondary'}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title={lang('editorItalic')}
        >
          <i className="bi bi-type-italic"></i>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${editor.isActive('link') ? 'btn-dark' : 'btn-outline-secondary'}`}
          onClick={handleSetLink}
          title={lang('editorLink')}
        >
          <i className="bi bi-link-45deg"></i>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${showSource ? 'btn-dark' : 'btn-outline-secondary'}`}
          onClick={() => setShowSource(!showSource)}
          title={lang('editorSourceCode')}
        >
          <i className="bi bi-code-slash"></i>
        </button>
      </div>
      <div className="card-body p-0">
        {showSource ? (
          <div className="p-3">
            <textarea
              className="form-control font-monospace"
              rows="5"
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
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
    </div>
  )
}
