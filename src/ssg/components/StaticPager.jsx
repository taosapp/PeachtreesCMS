import React from 'react'

export default function StaticPager({ page, totalPages, baseName, prefix, labels }) {
  if (totalPages <= 1) return null
  const prevPage = page - 1
  const nextPage = page + 1
  const makeHref = (p) => (p <= 1 ? `${prefix}${baseName}.html` : `${prefix}${baseName}_${p}.html`)

  return (
    <nav className="main-pager-nav">
      <ul className="pagination main-pager-list">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <a className="page-link main-pager-link" href={page <= 1 ? undefined : makeHref(prevPage)}>
            <i className="bi bi-chevron-left"></i>
            {labels.prev}
          </a>
        </li>
        <li className="page-item disabled">
          <span className="page-link main-pager-current">{page} / {totalPages}</span>
        </li>
        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
          <a className="page-link main-pager-link" href={page >= totalPages ? undefined : makeHref(nextPage)}>
            {labels.next}
            <i className="bi bi-chevron-right"></i>
          </a>
        </li>
      </ul>
    </nav>
  )
}