import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../../components/layout-components/Header/Header'
import Hero from '../../components/landing-components/Hero/Hero'
import OurBusiness from '../../components/landing-components/OurBusiness/OurBusiness'
import OurServices from '../../components/landing-components/OurServices/OurServices'
import FAQ from '../../components/landing-components/FAQ/FAQ'
import Footer from '../../components/layout-components/Footer/Footer'

const Home = () => {
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [hash])

  return (
    <>
      <Header />
      <Hero />
      <OurBusiness />
      <OurServices />
      <FAQ />
      <Footer />
    </>
  )
}

export default Home



