import React from 'react'
import Header from '../../components/layout-components/Header/Header'
import Footer from '../../components/layout-components/Footer/Footer'
import IdeaExplorePanel from '../../components/landing-components/IdeaExplore/IdeaExplorePanel'
import { Container, PageTitle } from '@/components/ui-components'

const PublicIdeasPage = () => {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] border-t border-border bg-surface py-12 md:py-16">
        <Container className="max-w-[1200px]">
          <PageTitle className="mb-2">Website ideas</PageTitle>
          <p className="mb-10 max-w-3xl border-l-4 border-primary py-2 pl-5 font-body text-lg text-ink-secondary">
            For operators who already have a business in motion and need to evolve—not start from zero. Say what’s going wrong (or vague) in your own words; we reply with a few{' '}
            <strong className="font-semibold text-ink">bounded next steps</strong>—proportionate to your situation, not a huge platform. You pick one; we turn it into a real project.
          </p>
          <IdeaExplorePanel variant="page" className="max-w-4xl" />
        </Container>
      </main>
      <Footer />
    </>
  )
}

export default PublicIdeasPage
