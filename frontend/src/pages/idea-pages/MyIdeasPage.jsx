import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/layout-components/Header/Header'
import Footer from '../../components/layout-components/Footer/Footer'
import { ideaAPI } from '@/services/ideaApi'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageTitle,
  Container,
} from '@/components/ui-components'
import IdeaResultsGrid from '../../components/landing-components/IdeaExplore/IdeaResultsGrid'
import { useAuth } from '@/context/AuthContext'
import { isClient } from '@/utils/roles'

const MyIdeasPage = () => {
  const { ideaSetId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await ideaAPI.listMine()
      setList(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load ideas')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id) => {
    setLoading(true)
    setError('')
    try {
      const data = await ideaAPI.getById(id)
      setDetail(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load this set')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isClient(user)) {
      setLoading(false)
      return
    }
    if (ideaSetId) {
      loadDetail(ideaSetId)
    } else {
      setDetail(null)
      loadList()
    }
  }, [ideaSetId, user, loadList, loadDetail])

  const handleBuild = useCallback(
    (idea) => {
      if (!detail) return
      const payload = {
        idea,
        sourcePrompt: detail.sourcePrompt || '',
        ideaSetId: detail.id,
      }
      navigate('/projects/create', { state: { fromIdea: payload } })
    },
    [detail, navigate],
  )

  if (user && !isClient(user)) {
    return (
      <>
        <Header />
        <main className="border-t border-border bg-surface py-16">
          <Container>
            <Alert variant="info">
              Saved website ideas are available for client accounts.{' '}
              <Link to="/contact" className="underline">
                Contact us
              </Link>{' '}
              or switch to a client profile.
            </Alert>
          </Container>
        </main>
        <Footer />
      </>
    )
  }

  if (ideaSetId && loading && !detail) {
    return (
      <>
        <Header />
        <main className="border-t border-border bg-surface py-12">
          <Container>
            <p className="font-body text-ink-muted">Loading your ideas…</p>
          </Container>
        </main>
        <Footer />
      </>
    )
  }

  if (ideaSetId && detail) {
    return (
      <>
        <Header />
        <main className="border-t border-border bg-surface py-12">
          <Container className="max-w-[1200px]">
            <Button variant="ghost" size="sm" className="mb-6 rounded-none font-button uppercase" to="/my-ideas">
              Back to my ideas
            </Button>
            <PageTitle className="mb-2">Your idea set</PageTitle>
            <p className="mb-8 max-w-3xl border-l-4 border-primary py-2 pl-5 font-body text-ink-secondary">
              {detail.sourcePrompt}
            </p>
            {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}
            <IdeaResultsGrid
              ideas={detail.ideas || []}
              loading={loading}
              onBuild={handleBuild}
              buildLabel="BUILD THIS"
              headingText="Choose a direction"
            />
          </Container>
        </main>
        <Footer />
      </>
    )
  }

  if (ideaSetId && !detail && !loading && error) {
    return (
      <>
        <Header />
        <main className="border-t border-border bg-surface py-12">
          <Container>
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" className="mt-4 rounded-none" to="/my-ideas">
              Back
            </Button>
          </Container>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="border-t border-border bg-surface py-12">
        <Container className="max-w-[1200px]">
          <PageTitle className="mb-2">My website ideas</PageTitle>
          <p className="mb-8 max-w-2xl font-body text-ink-secondary">
            Sets you generated while signed in. Open one to turn a direction into a project.
          </p>
          {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}
          {loading ? (
            <p className="font-body text-sm text-ink-muted">Loading…</p>
          ) : list.length === 0 ? (
            <div className="border-2 border-border bg-surface-gray p-8 font-body text-ink-secondary">
              <p className="mb-4">No saved sets yet.</p>
              <Button variant="primary" className="rounded-none font-button uppercase" to="/ideas">
                Generate ideas
              </Button>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {list.map((item) => (
                <li key={item.id}>
                  <Card className="h-full border-2 border-border rounded-none shadow-sm">
                    <CardHeader>
                      <CardTitle className="font-heading text-sm uppercase tracking-wide text-ink">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 font-body text-ink-secondary">
                        {item.sourcePrompt}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="mb-3 text-xs text-ink-muted">
                        {(item.previewTitles || []).join(' · ') || `${item.ideaCount || 0} directions`}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-none font-button uppercase"
                        to={`/my-ideas/${item.id}`}
                      >
                        View ideas
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </main>
      <Footer />
    </>
  )
}

export default MyIdeasPage
