import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProviders, AdminRoutes } from './AppRoutes'

// Load Bootstrap CSS and Icons for admin pages
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './admin.css'

const adminContainer = document.getElementById('root')
const adminRoot = ReactDOM.createRoot(adminContainer)

// Vite HMR — entry module should NOT self-accept; full reload on change is correct
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    adminRoot.unmount()
  })
}

adminRoot.render(
  <React.StrictMode>
    <AppProviders>
      <HashRouter>
        <AdminRoutes />
      </HashRouter>
    </AppProviders>
  </React.StrictMode>
)
