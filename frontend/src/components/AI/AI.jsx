import React from 'react'
import './AI.css'

const AI = () => {
  return (
    <section className="features-section" id="ai">
      <header className="section-header">
        <div className="title-brand-split">
          <div className="title-line-1">
            <span className="dark-text">AI POWERED,</span>
            <span className="green-text">HUMAN CONTROLLED</span>
          </div>
        </div>
        <p className="section-description">
          We code and build using AI tools while maintaining complete human oversight. 
          Every decision, design, and line of code is reviewed by our team.
        </p>
      </header>
      <div className="flow-container">
        <div className="flow-timeline">
          <article className="flow-step">
            <div className="corner-accent top-left"></div>
            <div className="corner-accent top-right"></div>
            <div className="corner-accent bottom-left"></div>
            <div className="corner-accent bottom-right"></div>
            <div className="step-number">1</div>
            <h3 className="step-title">Design</h3>
            <p className="step-description">
              Advanced AI design tools generate layouts while our team ensures
              professional standards and brand alignment.
            </p>
          </article>

          <article className="flow-step">
            <div className="corner-accent top-left"></div>
            <div className="corner-accent top-right"></div>
            <div className="corner-accent bottom-left"></div>
            <div className="corner-accent bottom-right"></div>
            <div className="step-number">2</div>
            <h3 className="step-title">Human Review</h3>
            <p className="step-description">
              Every component undergoes thorough human review, testing, and
              optimization by our expert team.
            </p>
          </article>

          <article className="flow-step">
            <div className="corner-accent top-left"></div>
            <div className="corner-accent top-right"></div>
            <div className="corner-accent bottom-left"></div>
            <div className="corner-accent bottom-right"></div>
            <div className="step-number">3</div>
            <h3 className="step-title">Monitoring</h3>
            <p className="step-description">
              Continuous monitoring and AI regulation ensure maximum structure safety.
              Every prompt is carefully reviewed and optimized.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

export default AI

