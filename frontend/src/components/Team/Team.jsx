import React from 'react'
import './Team.css'

const Team = () => {
  return (
    <section className="team-section team" id="team">
      <header className="section-header">
        <div className="title-brand-split">
          <div className="title-line-1">
            <span className="dark-text">MEET</span>
            <span className="green-text">OUR TEAM</span>
          </div>
        </div>
        <p className="section-description team-description-creato">
          <strong>We specialize in creating and selling high-quality websites for customers with rapid delivery.</strong>
          <span>
            {' '}From initial inquiry to final deployment, we transform your business ideas into <strong>powerful web applications</strong>{' '}
            within weeks, not months. Our streamlined process ensures <strong>transparency, quality, and speed</strong>{' '}
            while maintaining the control you need over your digital presence.
          </span>
        </p>
      </header>
      <div className="team-grid">
        <article className="team-card">
          <img
            src="assets/icons/avatars/romano-avatar.png"
            alt="Romano Avatar"
            className="team-avatar"
            loading="lazy"
          />
          <h3 className="team-name">ROMANO</h3>
          <div className="team-role">Frontend Developer</div>
          <p className="team-bio">
            Creates stunning user interfaces with modern React frameworks and
            ensures perfect user experiences.
          </p>
          <div className="team-skills">
            <span className="skill">React</span>
            <span className="skill">TypeScript</span>
            <span className="skill">UI/UX</span>
            <span className="skill">Visual Design</span>
            <span className="skill">Responsive Design</span>
          </div>
        </article>
        <article className="team-card">
          <img
            src="assets/icons/avatars/erik-avatar.png"
            alt="Erik Avatar"
            className="team-avatar"
            loading="lazy"
          />
          <h3 className="team-name">ERIK</h3>
          <div className="team-role">Founder, Project Owner & Technology Lead</div>
          <p className="team-bio">
            Drives business strategy, leads AI and web development, manages client relations, 
            and oversees end-to-end project delivery.
          </p>
          <div className="team-skills">
            <span className="skill">Project Management</span>
            <span className="skill">Docker</span>
            <span className="skill">Google Cloud</span>
            <span className="skill">DevOps</span>
            <span className="skill">System Design</span>
          </div>
        </article>
        <article className="team-card">
          <img
            src="assets/icons/avatars/maxel-avatar.png"
            alt="Maxel Avatar"
            className="team-avatar"
            loading="lazy"
          />
          <h3 className="team-name">MAXEL</h3>
          <div className="team-role">Backend Developer</div>
          <p className="team-bio">
            Builds robust server architectures and APIs that power scalable web
            applications.
          </p>
          <div className="team-skills">
            <span className="skill">Java/Spring Boot</span>
            <span className="skill">Databases</span>
            <span className="skill">API Design</span>
            <span className="skill">Security</span>
            <span className="skill">Google Cloud</span>
          </div>
        </article>
      </div>
    </section>
  )
}

export default Team

