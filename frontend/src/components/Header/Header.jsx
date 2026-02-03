import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../NotificationBell/NotificationBell'
import './Header.css'

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [platformOpen, setPlatformOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const platformRef = useRef(null)
  const resourcesRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const closePlatform = () => setPlatformOpen(false)
  const closeResources = () => setResourcesOpen(false)

  useEffect(() => {
    if (!platformOpen) return
    const handleClickOutside = (e) => {
      if (platformRef.current && !platformRef.current.contains(e.target)) {
        closePlatform()
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') closePlatform()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [platformOpen])

  useEffect(() => {
    if (!resourcesOpen) return
    const handleClickOutside = (e) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target)) {
        closeResources()
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeResources()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [resourcesOpen])

  const handlePlatformKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setPlatformOpen((prev) => !prev)
    }
  }

  const handleResourcesKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setResourcesOpen((prev) => !prev)
    }
  }

  return (
    <header className="main-header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo-section">
            <Link to="/">
              <img
                src="/assets/logos/chapadevs-logo.png"
                alt="Chapadevs Logo"
                className="header-logo"
              />
            </Link>
          </div>
          <div
            className="platform-wrapper"
            ref={platformRef}
            onMouseEnter={() => setPlatformOpen(true)}
            onMouseLeave={() => setPlatformOpen(false)}
          >
            <button
              type="button"
              className="header-btn header-btn--platform"
              aria-expanded={platformOpen}
              aria-haspopup="true"
              aria-controls="platform-dropdown"
              id="platform-trigger"
              onClick={() => setPlatformOpen((prev) => !prev)}
              onKeyDown={handlePlatformKeyDown}
            >
              PLATFORM
            </button>
            <div
              id="platform-dropdown"
              className={`platform-dropdown ${platformOpen ? 'platform-dropdown--open' : ''}`}
              role="menu"
              aria-labelledby="platform-trigger"
              aria-hidden={!platformOpen}
            >
              <div className="resources-dropdown-group">
                <span className="resources-dropdown-label">About the business</span>
                <Link to="/#about" className="resources-dropdown-link" role="menuitem" onClick={closePlatform}>
                  Our Business
                </Link>
                <Link to="/#services" className="resources-dropdown-link" role="menuitem" onClick={closePlatform}>
                  Our Services
                </Link>
                <Link to="/#team" className="resources-dropdown-link" role="menuitem" onClick={closePlatform}>
                  Team
                </Link>
              </div>
            </div>
          </div>
          <div
            className="resources-wrapper"
            ref={resourcesRef}
            onMouseEnter={() => setResourcesOpen(true)}
            onMouseLeave={() => setResourcesOpen(false)}
          >
            <button
              type="button"
              className="header-btn header-btn--resources"
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
              aria-controls="resources-dropdown"
              id="resources-trigger"
              onClick={() => setResourcesOpen((prev) => !prev)}
              onKeyDown={handleResourcesKeyDown}
            >
              RESOURCES
            </button>
            <div
              id="resources-dropdown"
              className={`resources-dropdown ${resourcesOpen ? 'resources-dropdown--open' : ''}`}
              role="menu"
              aria-labelledby="resources-trigger"
              aria-hidden={!resourcesOpen}
            >
              <div className="resources-dropdown-group">
                <span className="resources-dropdown-label">Platform</span>
                <Link to="/#ai" className="resources-dropdown-link" role="menuitem" onClick={closeResources}>
                  How we work (AI)
                </Link>
                <Link to="/#faq" className="resources-dropdown-link" role="menuitem" onClick={closeResources}>
                  FAQ
                </Link>
              </div>
              <div className="resources-dropdown-group">
                <span className="resources-dropdown-label">Get in touch</span>
                <Link to="/contact" className="resources-dropdown-link" role="menuitem" onClick={closeResources}>
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
        <nav className="header-navigation" aria-label="Account and actions">
          {!isAuthenticated ? (
            <Link to="/login" className="header-btn header-btn--login">
              LOGIN
            </Link>
          ) : (
            <div className="user-menu">
              <Link to="/dashboard" className="header-btn header-btn--dashboard">
                DASHBOARD
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="header-btn header-btn--admin">
                  ADMIN
                </Link>
              )}
              <NotificationBell />
              <button className="header-btn header-btn--logout" onClick={handleLogout}>
                LOGOUT
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
