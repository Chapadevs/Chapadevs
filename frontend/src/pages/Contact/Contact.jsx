import React from 'react'
import Header from '../../components/Header/Header'
import InquiryForm from '../../components/InquiryForm/InquiryForm'
import Footer from '../../components/Footer/Footer'
import './Contact.css'

const Contact = () => {
  return (
    <>
      <Header />
      <main className="contact-page">
        <InquiryForm />
      </main>
      <Footer />
    </>
  )
}

export default Contact
