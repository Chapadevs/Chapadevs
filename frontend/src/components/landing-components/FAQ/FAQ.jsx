import React, { useState } from 'react'
import './FAQ.css'

const FAQ = () => {
  const [faqs, setFaqs] = useState([
    {
      question: 'What technologies do you use for development?',
      answer: 'We use modern technologies including React for frontend, Java Spring Boot for backend, and deploy exclusively on Oracle infrastructure for reliable performance.',
      isOpen: false
    },
    {
      question: 'Can you work with existing websites or only create new ones?',
      answer: 'We can both create new websites from scratch and work with existing ones. We offer redesign, optimization, and enhancement services for current websites.',
      isOpen: false
    },
    {
      question: 'How do you handle project communication and updates?',
      answer: 'We maintain clear communication throughout the project with regular updates, milestone reviews, and direct access to our development team. We use modern collaboration tools to keep you informed.',
      isOpen: false
    },
    {
      question: 'Are 50% payment plans available?',
      answer: 'Yes, we offer flexible 50% payment plans. You pay 50% upfront to start the project, and the remaining 50% upon completion and delivery. This helps manage your budget while ensuring project commitment.',
      isOpen: false
    },
    {
      question: 'What happens if you don\'t deliver the project?',
      answer: 'We have a 100% delivery guarantee. If for any reason we cannot deliver your project, you will receive a full refund of all payments made. However, this has never happened - we pride ourselves on our track record of successful deliveries.',
      isOpen: false
    },
    {
      question: 'What are the hosting and domain subscription costs?',
      answer: 'We deploy exclusively on Oracle infrastructure. Hosting costs typically range from $20-50/month depending on your needs. Domain registration is $12-15/year. We can handle all hosting setup and management for you.',
      isOpen: false
    },
    {
      question: 'Can you integrate with our existing services and systems?',
      answer: 'Absolutely! We specialize in connecting websites to existing services including CRM systems, payment gateways, databases, APIs, and third-party platforms. We ensure seamless integration with your current business infrastructure.',
      isOpen: false
    }
  ])

  const toggleFaq = (index) => {
    setFaqs(faqs.map((faq, i) => 
      i === index ? { ...faq, isOpen: !faq.isOpen } : faq
    ))
  }

  return (
    <section className="faq-section" id="faq">
      <div className="container">
        <h2 className="faq-title">FAQ</h2>
        
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className={`faq-item ${faq.isOpen ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(index)}>
                <span>{faq.question}</span>
                <div className="icon">
                  <div className="line horizontal"></div>
                  <div className={`line vertical ${faq.isOpen ? 'rotate' : ''}`}></div>
                </div>
              </button>
              <div className={`faq-answer ${faq.isOpen ? 'show' : ''}`}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ

