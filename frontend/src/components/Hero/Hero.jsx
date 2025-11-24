import React from 'react'
import './Hero.css'

const Hero = () => {
  const scrollToInquiryForm = () => {
    const el = document.getElementById('inquiry-form')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content">
          <h1 className="title title--hero">
            Your <span className="highlight">Digital Vision</span>,
            <span className="highlight">OUR CODE</span>
          </h1>

          <p className="text text--lead hero-subtitle-creato">
            We turn your <span className="highlight">business ideas</span> into
            <span className="highlight">powerful web applications</span> with
            <span className="highlight">speed</span> and the
            <span className="highlight">control</span> you need.
          </p>

          <div className="hero-buttons">
            <button className="btn btn--primary" onClick={scrollToInquiryForm}>
              Start Your Project
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero



