import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Handle GitHub Pages 404 redirect: when 404.html redirects here, restore the intended URL
if (sessionStorage.redirect) {
  const redirect = sessionStorage.redirect
  sessionStorage.removeItem('redirect')
  const url = new URL(redirect)
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

