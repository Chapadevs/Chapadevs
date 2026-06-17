import React from 'react'
import { useAuth } from '../../../context/AuthContext'
import { Button, Tag } from '../../ui-components'
import './OurServices.css'

const OurServices = () => {
  const { isAuthenticated } = useAuth()

  const benefits = [
    {
      icon: 'fas fa-lightbulb',
      title: 'Website ideas first',
      text: 'Describe your business once and get several concrete site directions—pages, features, and visual direction—before you commit.',
    },
    {
      icon: 'fas fa-bolt',
      title: 'Structured project plan',
      text: 'When you pick a direction, we pre-fill a real project scope your developers can execute—goals, features, and tech stack in our JS stack.',
    },
    {
      icon: 'fas fa-code',
      title: 'Live React preview',
      text: 'Inside your project workspace, generate working previews. Our team turns the chosen direction into the final live site.',
    },
    {
      icon: 'fas fa-layer-group',
      title: 'One shared workspace',
      text: 'Approvals, assets, phases, and AI previews stay in one place so nothing gets lost in endless chat threads.',
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
                <span className="dark-text">IDEAS</span>
              </div>
              <div className="title-line-2">
                <span className="green-text">THEN BUILD</span>
              </div>
            </div>
            <p className="services-feature-description">
              Start with AI website ideas tailored to your business. Choose a direction, open a project, and let Chapadevs developers ship your real site—with previews and workspace in one flow.
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
            <Tag variant="primary" className="service-tag">Vertex AI ideas</Tag>
            <Tag variant="primary" className="service-tag">Live preview in project</Tag>
            <Tag variant="primary" className="service-tag">Human-led build</Tag>
          </div>

          <div className="services-cta flex flex-wrap items-center gap-3">
            <Button to="/ideas" variant="secondary" size="hero">
              Explore website ideas
            </Button>
            {isAuthenticated ? (
              <Button to="/projects/create" variant="ghost" size="hero">
                Create project
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export default OurServices
