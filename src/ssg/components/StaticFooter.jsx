import React from 'react'

export default function StaticFooter({ footerHtml }) {
  return (
    <footer className="footer">
      <div className="inner" dangerouslySetInnerHTML={{ __html: footerHtml }} />
    </footer>
  )
}