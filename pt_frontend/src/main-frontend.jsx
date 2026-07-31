import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProviders, FrontendRoutes } from './AppRoutes'

const frontendContainer = document.getElementById('root')
const frontendRoot = ReactDOM.createRoot(frontendContainer)

// Vite HMR — entry module should NOT self-accept; full reload on change is correct
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    frontendRoot.unmount()
  })
}

frontendRoot.render(
  <React.StrictMode>
    <AppProviders>
      <HashRouter>
        <FrontendRoutes />
      </HashRouter>
    </AppProviders>
  </React.StrictMode>
)
