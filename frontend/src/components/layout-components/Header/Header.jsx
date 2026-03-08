import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import RoleGate from '../RoleGate/RoleGate'
import NotificationBell from '../../ui-components/NotificationBell/NotificationBell'
import { Button, NavDropdown, StatusDropdown, Avatar, AvatarImage, AvatarFallback } from '../../ui-components'
import { getAvatarUrl } from '../../../utils/avatarUtils'
import './Header.css'

const Header = () => {
  const { user, isAuthenticated } = useAuth()

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

          <NavDropdown label="PLATFORM">
            <div className="resources-dropdown-group">
              <span className="resources-dropdown-label">About the business</span>
              <Link to="/#about" className="resources-dropdown-link">Our Business</Link>
              <Link to="/#services" className="resources-dropdown-link">Our Services</Link>
              <Link to="/#faq" className="resources-dropdown-link">FAQ</Link>
            </div>
          </NavDropdown>

          <NavDropdown label="RESOURCES">
            <div className="resources-dropdown-group">
              <span className="resources-dropdown-label">Get in touch</span>
              <Link to="/contact" className="resources-dropdown-link">Contact</Link>
              <Link to="/team" className="resources-dropdown-link">Team</Link>
            </div>
          </NavDropdown>

          <Button
            variant="ghost"
            to="/assignments"
          >
            EXPLORE
          </Button>
        </div>

        <nav className="header-navigation" aria-label="Account and actions">
          {!isAuthenticated ? (
            <Button to="/login" variant="primary" size="sm">
              LOGIN
            </Button>
          ) : (
            <div className="user-menu flex items-center gap-2">
              <RoleGate allow={['admin']}>
                <Button to="/admin" variant="ghost" size="sm">
                  ADMIN
                </Button>
              </RoleGate>
              
              <NotificationBell />

              <StatusDropdown 
                trigger={
                  <div className="relative cursor-pointer">
                    <Avatar className="w-8 h-8 bg-transparent">
                      <AvatarImage src={getAvatarUrl(user?.avatar)} alt={user?.name} />
                      <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    
                    <span 
                      className="absolute bottom-0 right-0 z-20 w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: user?.status === 'online' ? '#4caf50' : 
                                        user?.status === 'busy' ? '#f44336' : 
                                        user?.status === 'away' ? '#facc15' : '#9e9e9e' 
                      }} 
                    />
                  </div>
                } 
              />
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header