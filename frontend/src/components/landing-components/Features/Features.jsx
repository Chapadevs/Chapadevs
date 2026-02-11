import React from 'react'
import './Features.css'

const Features = () => {
  return (
    <section className="features-section">
      <header className="section-header">
        <div className="title-brand-split">
          <div className="title-line-1">
            <span className="dark-text">AI-POWERED,</span>
            <span className="green-text">HUMAN-CONTROLLED</span>
          </div>
        </div>
        <p className="section-description">
          We leverage cutting-edge AI tools while maintaining complete human
          oversight. Every decision, design, and line of code is reviewed by our
          expert team.
        </p>
      </header>
      <div className="flow-container">
        <div className="flow-timeline">
          <article className="flow-step">
            <div className="step-number">1</div>
            <h3 className="step-title">AI Analysis</h3>
            <p className="step-description">
              Advanced AI tools analyze your business needs and technical
              requirements for optimal solutions.
            </p>
            <div className="tools-list">
              <span className="tool-tag">Cursor AI</span>
              <span className="tool-tag">Analytics</span>
              <span className="tool-tag">Research</span>
            </div>
          </article>

          <article className="flow-step">
            <div className="step-number">2</div>
            <h3 className="step-title">Design Generation</h3>
            <p className="step-description">
              Lovable AI generates stunning designs while our team ensures
              professional standards and brand alignment.
            </p>
            <div className="tools-list">
              <span className="tool-tag">Lovable AI</span>
              <span className="tool-tag">Figma</span>
              <span className="tool-tag">Branding</span>
            </div>
          </article>

          <article className="flow-step">
            <div className="step-number">3</div>
            <h3 className="step-title">Human Review</h3>
            <p className="step-description">
              Every component undergoes thorough human review, testing, and
              optimization by our expert team.
            </p>
            <div className="tools-list">
              <span className="tool-tag">React</span>
              <span className="tool-tag">Spring Boot</span>
              <span className="tool-tag">Testing</span>
            </div>
          </article>

          <article className="flow-step">
            <div className="step-number">4</div>
            <h3 className="step-title">Performance</h3>
            <p className="step-description">
              Continuous monitoring and optimization ensure maximum performance,
              SEO, and user experience.
            </p>
            <div className="tools-list">
              <span className="tool-tag">Analytics</span>
              <span className="tool-tag">Search Console</span>
              <span className="tool-tag">Monitoring</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export default Features

