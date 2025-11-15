import React from 'react'
import Header from '../components/Header'
import Hero from '../components/Hero'
import OurBusiness from '../components/OurBusiness'
import OurServices from '../components/OurServices'
import Team from '../components/Team'
import AI from '../components/AI'
import InquiryForm from '../components/InquiryForm'
import FAQ from '../components/FAQ'
import Footer from '../components/Footer'

const Home = () => {
  return (
    <>
      <Header />
      <Hero />
      <OurBusiness />
      <OurServices />
      <Team />
      <AI />
      <InquiryForm />
      <FAQ />
      <Footer />
    </>
  )
}

export default Home

