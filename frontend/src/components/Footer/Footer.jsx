import React from 'react'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="company-info">
            <h3 className="company-name">ChaPaDevs</h3>
            <p className="company-tagline">Building digital experiences that drive results</p>
          </div>
        </div>
        
        <div className="footer-section">
          <div className="contact-info">
            <h4 className="contact-title">Get In Touch</h4>
            <a href="mailto:contact@chapadevs.com" className="contact-email">
              <i className="fas fa-envelope"></i>
              contact@chapadevs.com
            </a>
            <a
              href="https://www.linkedin.com/company/chapadevs/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-linkedin-link"
              aria-label="Visit ChaPaDevs on LinkedIn"
            >
              <img
                src="assets/images/linkedin.png"
                alt="LinkedIn"
                className="footer-linkedin-logo"
              />
            </a>
          </div>
        </div>
        
        <div className="footer-section">
          <div className="footer-links">
            <a href="#inquiry-form" className="footer-link">Start Project</a>
            <a href="#services" className="footer-link">Services</a>
            <a href="#team" className="footer-link">Team</a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-border"></div>
        <div className="copyright">
          <span>&copy; 2025 ChaPaDevs. All rights reserved.</span>
          <span className="built-with">Built with passion for quality</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer

