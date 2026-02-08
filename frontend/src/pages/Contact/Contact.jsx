import React from 'react'
import Header from '../../components/layout-components/Header/Header'
import InquiryForm from '../../components/InquiryForm/InquiryForm'
import Footer from '../../components/layout-components/Footer/Footer'
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
