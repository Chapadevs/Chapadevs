import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import './OurServices.css'

const OurServices = () => {
  const { isAuthenticated } = useAuth()

  const benefits = [
    {
      icon: 'fas fa-bolt',
      title: 'Instant Analysis',
      text: 'Get project overview, features, and tech stack recommendations in seconds.',
    },
    {
      icon: 'fas fa-chart-line',
      title: 'Timeline & Budget',
      text: 'AI-powered estimates for timeline phases and budget breakdown.',
    },
    {
      icon: 'fas fa-code',
      title: 'Live React Preview',
      text: 'See a working website preview. Copy or download the code.',
    },
    {
      icon: 'fas fa-layer-group',
      title: '5 Generations per Project',
      text: 'Refine your idea with multiple AI generations per project.',
    },
  ]

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
        <div className="services-feature-hero">
          <header className="services-feature-header">
            <div className="title-brand-split">
              <div className="title-line-1">
                <span className="dark-text">AI</span>
              </div>
              <div className="title-line-2">
                <span className="green-text">PROJECT PREVIEW</span>
              </div>
            </div>
            <p className="services-feature-description">
              Describe your project and get instant AI analysis—overview, features, tech stack, timeline, and a live website preview. Available in your project dashboard.
            </p>
          </header>

          <div className="services-benefits">
            {benefits.map((benefit, index) => (
              <div key={index} className="services-benefit-item">
                <div className="services-benefit-icon">
                  <i className={benefit.icon}></i>
                </div>
                <div className="services-benefit-content">
                  <h4 className="services-benefit-title">{benefit.title}</h4>
                  <p className="services-benefit-text">{benefit.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="services-tags">
            <span className="service-tag">Powered by Vertex AI</span>
            <span className="service-tag">Live Preview</span>
            <span className="service-tag">Tech Stack Recommendations</span>
          </div>

          <div className="services-cta">
            <Link
              to={isAuthenticated ? '/projects/create' : '/register'}
              className="btn btn--primary"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OurServices
