import React from 'react'

export default function StaticTags({ tagMap, prefix, layoutTemplate }) {
  if (!tagMap || Object.keys(tagMap).length === 0) return null
  const navClass = layoutTemplate === 'two-column' ? '' : 'li-horizontal'
  return (
    <section className="tags">
      <nav className={navClass || undefined}>
        <ul>
          {Object.entries(tagMap).map(([tag, name]) => (
            <li key={tag}>
              <a href={`${prefix}${encodeURIComponent(tag)}.html`}>{name}</a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}