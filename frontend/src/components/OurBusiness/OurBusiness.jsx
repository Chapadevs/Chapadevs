import React, { useEffect, useState, useRef } from 'react'
import './OurBusiness.css'

const OurBusiness = () => {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [monitorScrollProgress, setMonitorScrollProgress] = useState(0)
  const [laptopScrollProgress, setLaptopScrollProgress] = useState(0)
  const mobileRef = useRef(null)
  const monitorRef = useRef(null)
  const laptopRef = useRef(null)

  useEffect(() => {
    const updateScrollProgress = () => {
      // Mobile column animation
      if (mobileRef.current) {
        const rect = mobileRef.current.getBoundingClientRect()
        const windowHeight = window.innerHeight
        const startPoint = windowHeight * 0.8
        const endPoint = windowHeight * 0.2
        const currentPosition = rect.top

        if (currentPosition <= startPoint && currentPosition >= endPoint) {
          const progress = (startPoint - currentPosition) / (startPoint - endPoint)
          setScrollProgress(Math.max(0, Math.min(1, progress)))
        } else if (currentPosition < endPoint) {
          setScrollProgress(1)
        } else {
          setScrollProgress(0)
        }
      }

      // Monitor column animation
      if (monitorRef.current) {
        const rect = monitorRef.current.getBoundingClientRect()
        const windowHeight = window.innerHeight
        const startPoint = windowHeight * 0.8
        const endPoint = windowHeight * 0.2
        const currentPosition = rect.top

        if (currentPosition <= startPoint && currentPosition >= endPoint) {
          const progress = (startPoint - currentPosition) / (startPoint - endPoint)
          setMonitorScrollProgress(Math.max(0, Math.min(1, progress)))
        } else if (currentPosition < endPoint) {
          setMonitorScrollProgress(1)
        } else {
          setMonitorScrollProgress(0)
        }
      }

      // Laptop column animation
      if (laptopRef.current) {
        const rect = laptopRef.current.getBoundingClientRect()
        const windowHeight = window.innerHeight
        const startPoint = windowHeight * 0.8
        const endPoint = windowHeight * 0.2
        const currentPosition = rect.top

        if (currentPosition <= startPoint && currentPosition >= endPoint) {
          const progress = (startPoint - currentPosition) / (startPoint - endPoint)
          setLaptopScrollProgress(Math.max(0, Math.min(1, progress)))
        } else if (currentPosition < endPoint) {
          setLaptopScrollProgress(1)
        } else {
          setLaptopScrollProgress(0)
        }
      }
    }

    window.addEventListener('scroll', updateScrollProgress)
    setTimeout(updateScrollProgress, 100)
    setTimeout(updateScrollProgress, 200)

    return () => window.removeEventListener('scroll', updateScrollProgress)
  }, [])

  return (
    <section className="support-section support" id="about">
      <div className="floating-shape-1"></div>
      <div className="floating-shape-2"></div>
      <div className="floating-shape-3"></div>

      <header className="section-header">
        <h1 className="title-brand-split">
          <div className="title-line-1">
            <span className="dark-text">OUR</span>
            <span className="green-text">BUSINESS</span>
          </div>
        </h1>
        <p className="section-description">
          We deliver custom web solutions to help your business grow with transparency and the best technology.
        </p>
      </header>

      <div className="services-container">
        <div className="services-grid-2x3">
          <div 
            className="image-column mobile-column" 
            ref={mobileRef}
            style={{
              transform: `translateX(${-300 + (scrollProgress * 300)}px)`,
              opacity: scrollProgress
            }}
          >
            <div className="image-container mobile-container">
              <img src="assets/images/mobile.png" alt="Smartphone showing mobile app interface" className="mobile-image" />
            </div>
          </div>
          
          <div className="service-column">
            <article className="service-card">
              <div className="card-content">
                <div className="corner-accent-top-right"></div>
                <div className="corner-accent-bottom-left"></div>
                <h2>
                  <span className="green-text">MODERN</span> <span className="dark-text">WEB</span> <span className="dark-text">APPLICATIONS</span>
                </h2>
                <p>
                  We build fast and responsive web applications using modern frameworks and mobile design while ensuring excellent SEO.
                </p>
                <div className="service-tags">
                  <span className="tag">REACT & ANGULAR</span>
                  <span className="tag">MOBILE-FIRST DESIGN</span>
                  <span className="tag">PROGRESSIVE WEB APPS</span>
                  <span className="tag">CUSTOM UX/UI</span>
                </div>
              </div>
            </article>
          </div>

          <div className="service-column">
            <article className="service-card">
              <div className="card-content">
                <h2>
                  <span className="green-text">BUSINESS</span> <span className="dark-text">SOLUTIONS</span>
                </h2>
                <p>
                  We deliver business solutions with integrations, automation, and connectivity to boost your company's efficiency and growth.
                </p>
                <div className="service-tags">
                  <span className="tag">E-COMMERCE PLATFORMS</span>
                  <span className="tag">CRM INTEGRATION</span>
                  <span className="tag">PAYMENT PROCESSING</span>
                  <span className="tag">DATA ANALYTICS</span>
                </div>
              </div>
            </article>
          </div>

          <div 
            className="image-column monitor-column" 
            ref={monitorRef}
            style={{
              transform: `scale(${0.5 + (monitorScrollProgress * 0.5)})`,
              opacity: monitorScrollProgress
            }}
          >
            <div className="image-container monitor-container">
              <img src="assets/images/monitor.png" alt="Monitor showing inventory management system" className="monitor-image" />
            </div>
          </div>

          <div 
            className="image-column laptop-column" 
            ref={laptopRef}
            style={{
              opacity: laptopScrollProgress
            }}
          >
            <div className="image-container laptop-container">
              <img src="assets/images/leptop.png" alt="Laptop showing minimalist web page with circular graphics" className="laptop-image" />
            </div>
          </div>
          
          <div className="service-column">
            <article className="service-card">
              <div className="card-content">
                <h2>
                  <span className="green-text">DIGITAL</span> <span className="dark-text">TRANSFORMATION</span>
                </h2>
                <p>
                  We help businesses modernize their digital infrastructure with cutting-edge technologies and strategic implementation.
                </p>
                <div className="service-tags">
                  <span className="tag">LEGACY MIGRATION</span>
                  <span className="tag">CLOUD STRATEGY</span>
                  <span className="tag">DEVOPS IMPLEMENTATION</span>
                  <span className="tag">SECURITY AUDITING</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OurBusiness

