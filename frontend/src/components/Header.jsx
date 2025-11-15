import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
              src="/assets/logos/chapadevs-logo.png"
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
              src="/assets/images/linkedin.png"
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
              <Link to="/dashboard" className="header-btn header-btn--dashboard">
                DASHBOARD
              </Link>
              <div className="user-menu">
                <span className="user-name">{user?.name}</span>
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

