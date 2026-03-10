import React from 'react'
import { Tag } from '../../ui-components'
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
              <Tag variant="primary" className="tool-tag">Cursor AI</Tag>
              <Tag variant="primary" className="tool-tag">Analytics</Tag>
              <Tag variant="primary" className="tool-tag">Research</Tag>
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
              <Tag variant="primary" className="tool-tag">Lovable AI</Tag>
              <Tag variant="primary" className="tool-tag">Figma</Tag>
              <Tag variant="primary" className="tool-tag">Branding</Tag>
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
              <Tag variant="primary" className="tool-tag">React</Tag>
              <Tag variant="primary" className="tool-tag">Spring Boot</Tag>
              <Tag variant="primary" className="tool-tag">Testing</Tag>
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
              <Tag variant="primary" className="tool-tag">Analytics</Tag>
              <Tag variant="primary" className="tool-tag">Search Console</Tag>
              <Tag variant="primary" className="tool-tag">Monitoring</Tag>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export default Features

