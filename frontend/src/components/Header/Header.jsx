import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../NotificationBell/NotificationBell'
import UserStatusDropdown from '../UserStatusDropdown/UserStatusDropdown'
import './Header.css'

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [platformOpen, setPlatformOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [exploreOpen, setExploreOpen] = useState(false)
  const platformRef = useRef(null)
  const resourcesRef = useRef(null)
  const exploreRef = useRef(null)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const closePlatform = () => setPlatformOpen(false)
  const closeResources = () => setResourcesOpen(false)
  const closeExplore = () => setExploreOpen(false)

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

  useEffect(() => {
    if (!exploreOpen) return
    const handleClickOutside = (e) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target)) {
        closeExplore()
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeExplore()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [exploreOpen])

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

  const handleExploreKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setExploreOpen((prev) => !prev)
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
                <Link to="/#faq" className="resources-dropdown-link" role="menuitem" onClick={closePlatform}>
                  FAQ
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
                <span className="resources-dropdown-label">Get in touch</span>
                <Link to="/contact" className="resources-dropdown-link" role="menuitem" onClick={closeResources}>
                  Contact
                </Link>
              </div>
            </div>
          </div>
          <div
            className="explore-wrapper"
            ref={exploreRef}
            onMouseEnter={() => setExploreOpen(true)}
            onMouseLeave={() => setExploreOpen(false)}
          >
            <button
              type="button"
              className="header-btn header-btn--explore"
              aria-expanded={exploreOpen}
              aria-haspopup="true"
              aria-controls="explore-dropdown"
              id="explore-trigger"
              onClick={() => setExploreOpen((prev) => !prev)}
              onKeyDown={handleExploreKeyDown}
            >
              EXPLORE
            </button>
            <div
              id="explore-dropdown"
              className={`explore-dropdown ${exploreOpen ? 'explore-dropdown--open' : ''}`}
              role="menu"
              aria-labelledby="explore-trigger"
              aria-hidden={!exploreOpen}
            >
              <div className="resources-dropdown-group">
                <Link to="/assignments" className="resources-dropdown-link" role="menuitem" onClick={closeExplore}>
                  Available projects
                </Link>
                <Link to="/team" className="resources-dropdown-link" role="menuitem" onClick={closeExplore}>
                  Team
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
              {user?.role === 'admin' && (
                <Link to="/admin" className="header-btn header-btn--admin">
                  ADMIN
                </Link>
              )}
              <NotificationBell />
              <Link to="/projects" className="header-btn header-btn--profile">
                PROJECTS
              </Link>
              <UserStatusDropdown />
              <button
                type="button"
                className="header-btn header-btn--logout"
                onClick={handleLogout}
                aria-label="Log out"
              >
                <svg
                  className="header-btn-logout-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                  aria-hidden
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
