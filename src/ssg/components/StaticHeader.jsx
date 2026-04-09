import React from 'react'

export default function StaticHeader({ siteTitle, prefix, siteOptions = {} }) {
  return (
    <header className="header">
      <h1>
        <a className="header-link" href={`${prefix}index.html`}>
          {siteOptions.show_logo ? (
            <img src={`${prefix}theme/default/logo.png`} alt={siteTitle} />
          ) : (
            siteTitle
          )}
        </a>
      </h1>
    </header>
  )
}
