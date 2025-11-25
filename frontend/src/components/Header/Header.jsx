import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Header.css'

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const scrollToFaq = () => {
    const faqElement = document.querySelector('.faq-section')
    if (faqElement) {
      faqElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }
  }
  
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
              src="/Chapadevs/assets/logos/chapadevs-logo.png"
              alt="Chapadevs Logo"
              className="header-logo"
            />
          </Link>
          <a 
            href="https://www.linkedin.com/company/chapadevs/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="linkedin-link"
            aria-label="Visit ChaPaDevs LinkedIn page"
          >
            <img
              src="/Chapadevs/assets/images/linkedin.png"
              alt="LinkedIn"
              className="linkedin-logo"
            />
          </a>
        </div>
        <nav className="header-navigation">
          {!isAuthenticated ? (
            <>
              <button className="header-btn header-btn--faq" onClick={scrollToFaq}>
                FAQ
              </button>
              <button className="header-btn header-btn--inquiry" onClick={scrollToInquiry}>
                INQUIRY
              </button>
              <Link to="/login" className="header-btn header-btn--login">
                LOGIN
              </Link>
            </>
          ) : (
            <>
              <span className="user-name">Welcome, {user?.name}</span>
              <div className="user-menu">
                <Link to="/dashboard" className="header-btn header-btn--dashboard">
                  DASHBOARD
                </Link>
                <Link to="/profile" className="header-btn header-btn--profile">
                  PROFILE
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

