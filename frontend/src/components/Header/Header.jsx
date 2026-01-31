import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Header.css'

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const scrollToInquiry = () => {
    const inquiryElement = document.getElementById('inquiry-form')
    if (inquiryElement) {
      inquiryElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="main-header">
      <div className="header-content">
        <div className="logo-section">
          <Link to="/">
            <img
              src="/assets/logos/chapadevs-logo.png"
              alt="Chapadevs Logo"
              className="header-logo"
            />
          </Link>
        </div>
        <nav className="header-navigation">
          {!isAuthenticated ? (
            <>
              <button className="header-btn header-btn--inquiry" onClick={scrollToInquiry}>
                INQUIRY
              </button>
              <Link to="/login" className="header-btn header-btn--login">
                LOGIN
              </Link>
            </>
          ) : (
            <>
              <div className="user-menu">
                <Link to="/dashboard" className="header-btn header-btn--dashboard">
                  DASHBOARD
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="header-btn header-btn--admin">
                    ADMIN
                  </Link>
                )}
                <button className="header-btn header-btn--logout" onClick={handleLogout}>
                  LOGOUT
                </button>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header

