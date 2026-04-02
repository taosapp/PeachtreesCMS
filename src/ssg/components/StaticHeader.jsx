import React from 'react'

export default function StaticHeader({ siteTitle, prefix }) {
  return (
    <header className="header">
      <h1>
        <a className="header-link" href={`${prefix}index.html`}>
          {siteTitle}
        </a>
      </h1>
    </header>
  )
}