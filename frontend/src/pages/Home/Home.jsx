import React from 'react'
import Header from '../../components/Header/Header'
import Hero from '../../components/Hero/Hero'
import OurBusiness from '../../components/OurBusiness/OurBusiness'
import OurServices from '../../components/OurServices/OurServices'
import Team from '../../components/Team/Team'
import AI from '../../components/AI/AI'
import InquiryForm from '../../components/InquiryForm/InquiryForm'
import FAQ from '../../components/FAQ/FAQ'
import Footer from '../../components/Footer/Footer'

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



