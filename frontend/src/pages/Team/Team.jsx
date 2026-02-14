import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../../components/layout-components/Header/Header'
import TeamSection from '../../components/landing-components/Team/Team'
import AI from '../../components/landing-components/AI/AI'
import Footer from '../../components/layout-components/Footer/Footer'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui-components'
import './Team.css'

const Team = () => {
  const { isAuthenticated } = useAuth()
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [hash])

  return (
    <>
      <Header />
      <main className="team-page">
        <section className="team-page-hero">
          <div className="team-page-hero-content">
            <h1 className="team-page-title">
              <span className="team-page-title-dark">THE PEOPLE BEHIND</span>
            </h1>
            <p className="team-page-subtitle">
              Expert developers and strategists dedicated to turning your vision into reality.
              We combine technical excellence with transparent communication.
            </p>
          </div>
        </section>

        <TeamSection />

        <AI />

        <section className="team-page-cta">
          <div className="team-page-cta-content">
            <h2 className="team-page-cta-title">Ready to work with us?</h2>
            <p className="team-page-cta-text">
              Start your project today and experience our streamlined development process.
            </p>
            <div className="team-page-cta-buttons">
              <Button
                to={isAuthenticated ? '/projects/create' : '/register'}
                variant="primary"
                size="lg"
                className="btn btn-primary team-page-cta-btn"
              >
                {isAuthenticated ? 'Create Project' : 'Get Started'}
              </Button>
              <Button to="/contact" variant="secondary" size="lg" className="btn btn-secondary team-page-cta-btn">
                Contact Us
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export { Team as default }
