import React from 'react'
import './OurServices.css'

const OurServices = () => {
  return (
    <section className="services-section services" id="services">
      <div className="bg-float bg-float-1"></div>
      <div className="bg-float bg-float-2"></div>
      <div className="bg-float bg-float-3"></div>
      <div className="bg-float bg-float-4"></div>
      <div className="bg-float bg-float-5"></div>
      <div className="bg-float bg-float-6"></div>
      <div className="bg-float bg-float-7"></div>
      
      <div className="services-container">
        <div className="services-grid">
          <article className="service-card service-card-left">
            <div className="card-bg-blur"></div>
            
            <div className="service-icon">
              <i className="fas fa-layer-group"></i>
            </div>
            <h3>COMPLETE LAUNCH & SETUP</h3>
            <p>
              We launch your entire digital presence. Domain setup, hosting, and all
              technical details handled.
            </p>
            <div className="service-tags">
              <span className="service-tag">DOMAIN & HOSTING SETUP</span>
              <span className="service-tag">SSL CERTIFICATES</span>
              <span className="service-tag">EMAIL CONFIGURATION</span>
            </div>
          </article>
          
          <header className="section-header">
            <div className="title-brand-split">
              <div className="title-line-1">
                <span className="dark-text">OUR</span>
              </div>
              <div className="title-line-2">
                <span className="green-text">SERVICES</span>
              </div>
            </div>
          </header>
          
          <article className="service-card service-card-right">
            <div className="card-bg-blur"></div>
            
            <div className="service-icon">
              <i className="fas fa-tools"></i>
            </div>
            <h3>MAINTENANCE & UPDATES</h3>
            <p>
              We keep your site secure and up to date with ongoing maintenance and future improvements.
            </p>
            <div className="service-tags">
              <span className="service-tag">CONTINUOUS SUPPORT</span>
              <span className="service-tag">SECURITY UPDATES</span>
              <span className="service-tag">FUTURE FEATURES</span>
              <span className="service-tag">RELIABILITY</span>
            </div>
          </article>
          
          <article className="service-card service-card-bottom">
            <div className="card-bg-blur"></div>
            
            <div className="service-icon">
              <i className="fas fa-rocket"></i>
            </div>
            <h3>RAPID DEPLOYMENT</h3>
            <p>
              We don't waste time with unnecessary over-engineering. 
              We deliver your website fast, using the best technologies.
            </p>
            <div className="service-tags">
              <span className="service-tag">1-2 WEEK DELIVERY</span>
              <span className="service-tag">QUALITY ASSURANCE</span>
              <span className="service-tag">ONGOING SUPPORT</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export default OurServices

