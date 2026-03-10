import React from 'react'
import { Tag } from '../../ui-components'
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
            src="/assets/icons/avatars/romano-avatar.png"
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
            <Tag variant="skill" className="skill">React</Tag>
            <Tag variant="skill" className="skill">TypeScript</Tag>
            <Tag variant="skill" className="skill">UI/UX</Tag>
            <Tag variant="skill" className="skill">Visual Design</Tag>
            <Tag variant="skill" className="skill">Responsive Design</Tag>
          </div>
        </article>
        <article className="team-card">
          <img
            src="/assets/icons/avatars/erik-avatar.png"
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
            <Tag variant="skill" className="skill">Project Management</Tag>
            <Tag variant="skill" className="skill">Docker</Tag>
            <Tag variant="skill" className="skill">Google Cloud</Tag>
            <Tag variant="skill" className="skill">DevOps</Tag>
            <Tag variant="skill" className="skill">System Design</Tag>
          </div>
        </article>
        <article className="team-card">
          <img
            src="/assets/icons/avatars/maxel-avatar.png"
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
            <Tag variant="skill" className="skill">Java/Spring Boot</Tag>
            <Tag variant="skill" className="skill">Databases</Tag>
            <Tag variant="skill" className="skill">API Design</Tag>
            <Tag variant="skill" className="skill">Security</Tag>
            <Tag variant="skill" className="skill">Google Cloud</Tag>
          </div>
        </article>
      </div>
    </section>
  )
}

export default Team

