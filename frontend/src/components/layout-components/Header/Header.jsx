import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import RoleGate from '../RoleGate/RoleGate'
import NotificationBell from '../../ui-components/NotificationBell/NotificationBell'
import { Button, NavDropdown, StatusDropdown, Avatar, AvatarImage, AvatarFallback } from '../../ui-components'
import './Header.css'

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    if (avatar.startsWith('data:image/')) return avatar
    if (avatar.startsWith('/uploads/')) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
      const baseUrl = backendUrl.replace('/api', '').replace(/\/$/, '')
      return `${baseUrl}${avatar}`
    }
    return avatar
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
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

          <NavDropdown label="PLATFORM" triggerClassName="header-btn--platform">
            <div className="resources-dropdown-group">
              <span className="resources-dropdown-label">About the business</span>
              <Link to="/#about" className="resources-dropdown-link">Our Business</Link>
              <Link to="/#services" className="resources-dropdown-link">Our Services</Link>
              <Link to="/#faq" className="resources-dropdown-link">FAQ</Link>
            </div>
          </NavDropdown>

          <NavDropdown label="RESOURCES" triggerClassName="header-btn--resources">
            <div className="resources-dropdown-group">
              <span className="resources-dropdown-label">Get in touch</span>
              <Link to="/contact" className="resources-dropdown-link">Contact</Link>
              <Link to="/team" className="resources-dropdown-link">Team</Link>
            </div>
          </NavDropdown>

          <Button
            variant="ghost"
            className="header-btn header-btn--explore"
            to="/assignments"
          >
            EXPLORE
          </Button>
        </div>

        <nav className="header-navigation" aria-label="Account and actions">
          {!isAuthenticated ? (
            <Button to="/login" variant="primary" size="sm" className="header-btn header-btn--login">
              LOGIN
            </Button>
          ) : (
            <div className="user-menu flex items-center gap-2">
              <RoleGate allow={['admin']}>
                <Button to="/admin" variant="ghost" size="sm" className="header-btn--admin">
                  ADMIN
                </Button>
              </RoleGate>
              
              <NotificationBell />
              
              <Button to="/projects" variant="ghost" size="sm" className="header-btn--profile">
                PROJECTS
              </Button>

              <StatusDropdown 
                trigger={
                  <div className="relative cursor-pointer">
                    <Avatar className="w-10 h-10 border border-white/10">
                      <AvatarImage src={getAvatarUrl(user?.avatar)} alt={user?.name} />
                      <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <span 
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black"
                      style={{ 
                        backgroundColor: user?.status === 'online' ? '#4caf50' : 
                                        user?.status === 'busy' ? '#f44336' : 
                                        user?.status === 'away' ? '#facc15' : '#9e9e9e' 
                      }} 
                    />
                  </div>
                } 
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="header-btn--logout"
                onClick={handleLogout}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header