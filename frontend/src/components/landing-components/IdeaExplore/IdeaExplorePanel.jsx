import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp, Loader2 } from 'lucide-react'
import {
  Button,
  SecondaryButton,
  Textarea,
  Alert,
} from '@/components/ui-components'
import { useAuth } from '@/context/AuthContext'
import { ideaAPI } from '@/services/ideaApi'
import { isClient } from '@/utils/roles'
import {
  clearPublicIdeasSession,
  readPublicIdeasSession,
  writeCreateProjectIdeaSession,
  writePublicIdeasSession,
} from '@/utils/ideaSession'
import IdeaResultsGrid from './IdeaResultsGrid'

/**
 * Prompt + generate website ideas + optional results grid.
 * @param {'embedded' | 'page'} variant - embedded = hero-style chrome; page = full section
 */
const IdeaExplorePanel = ({
  variant = 'page',
  className = '',
  introText,
}) => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [ideas, setIdeas] = useState([])
  const [ideaSetId, setIdeaSetId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const restoredPublicIdeas = useRef(false)

  useEffect(() => {
    if (restoredPublicIdeas.current || prompt.trim() || ideas.length > 0) return

    const pendingIdeas = readPublicIdeasSession()
    if (!pendingIdeas) return

    setPrompt(typeof pendingIdeas.sourcePrompt === 'string' ? pendingIdeas.sourcePrompt : '')
    setIdeas(Array.isArray(pendingIdeas.ideas) ? pendingIdeas.ideas : [])
    restoredPublicIdeas.current = true

    if (isAuthenticated) {
      clearPublicIdeasSession()
    }
  }, [ideas.length, isAuthenticated, prompt])

  const handleGenerate = async (e) => {
    e?.preventDefault?.()
    const trimmed = prompt.trim()
    if (!trimmed) {
      setError('Add a short description of your business or what you want online.')
      return
    }
    setError('')
    setLoading(true)
    setIdeas([])
    setIdeaSetId(null)
    try {
      const data = await ideaAPI.generate(trimmed)
      const nextIdeas = Array.isArray(data.ideas) ? data.ideas : []
      setIdeas(nextIdeas)
      if (data.ideaSetId) setIdeaSetId(data.ideaSetId)

      if (isAuthenticated) {
        clearPublicIdeasSession()
      } else {
        writePublicIdeasSession({
          sourcePrompt: trimmed,
          ideas: nextIdeas,
        })
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Could not generate ideas. Try again shortly.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleBuild = useCallback(
    (idea) => {
      const source = prompt.trim()
      const payload = { idea, sourcePrompt: source, ideaSetId }

      if (isAuthenticated && isClient(user)) {
        writeCreateProjectIdeaSession(payload)
        navigate('/projects/create', { state: { fromIdea: payload } })
        return
      }

      if (isAuthenticated && !isClient(user)) {
        navigate('/contact')
        return
      }

      writeCreateProjectIdeaSession(payload)
      navigate('/register')
    },
    [isAuthenticated, user, prompt, ideaSetId, navigate],
  )

  const isEmbedded = variant === 'embedded'
  const embeddedPromptLabel =
    'What do you want to improve in something you already run?'
  const embeddedPlaceholder =
    'Briefly note what is working, what slows you down, and the outcome you want. No need for a perfect write-up—rough bullets are fine.'
  const pagePlaceholder =
    "Example: we install fiber—site works but quotes are chaos; or our shop runs on Square but the site doesn't match how we actually sell."

  return (
    <div className={className}>
      {introText && !isEmbedded ? (
        <p className="mb-4 max-w-3xl font-body text-base text-ink-secondary">{introText}</p>
      ) : null}

      {error ? (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <Textarea
        id="idea-explore-prompt"
        label={isEmbedded ? undefined : 'What are you trying to improve? (already running — what is stuck?)'}
        aria-label={isEmbedded ? embeddedPromptLabel : 'What are you trying to improve? (already running — what is stuck?)'}
        labelClassName={isEmbedded ? '!text-[10px] md:!text-[11px] tracking-[0.1em]' : undefined}
        wrapperClassName={isEmbedded ? 'gap-0' : 'gap-2'}
        containerClassName={
          isEmbedded
            ? 'overflow-hidden border border-border/35 bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_18px_rgba(15,23,42,0.04)] focus-within:border-primary/45 focus-within:ring-primary/10'
            : undefined
        }
        childrenClassName={
          isEmbedded
            ? 'border-t border-border/35 bg-surface px-0 pb-0 pt-2 sm:pt-2.5'
            : undefined
        }
        className={
          isEmbedded
            ? 'min-h-[108px] px-2.5 pb-2 pt-0.5 text-left text-sm leading-relaxed text-ink/90 placeholder:text-ink-muted/55 sm:px-3'
            : 'min-h-[120px] px-4 py-3 text-base'
        }
        previewSlot={
          isEmbedded ? (
            <div className="px-2.5 pb-1 pt-0.5 text-left text-ink-muted sm:px-3">
              <span className="font-body text-xs tracking-[0.01em] text-ink-muted/90 sm:text-[13px]">
                {embeddedPromptLabel}
              </span>
            </div>
          ) : undefined
        }
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={isEmbedded ? embeddedPlaceholder : pagePlaceholder}
        required
        autoExpand={isEmbedded}
        minRows={isEmbedded ? 3 : 5}
        maxHeight={isEmbedded ? '172px' : '240px'}
      >
        <div
          className={
            isEmbedded
              ? 'flex w-full flex-wrap items-center justify-between gap-2 px-1.5 py-1'
              : 'flex w-full flex-wrap items-center justify-between gap-2 px-2 py-1.5'
          }
        >
          <span className="text-[9px] font-medium uppercase tracking-wider text-ink-muted/60">
            {prompt?.length || 0} chars
          </span>
          <div className="flex items-center gap-1">
            <SecondaryButton
              type="button"
              variant="ghost"
              size="xs"
              className="rounded-none font-normal lowercase text-ink-muted hover:text-ink"
              onClick={() => {
                setPrompt('')
                setIdeas([])
                setIdeaSetId(null)
                setError('')
                clearPublicIdeasSession()
              }}
            >
              clear
            </SecondaryButton>
            <Button
              type="button"
              size="xs"
              aria-label={loading ? 'Generating ideas' : 'Generate website ideas'}
              className={
                isEmbedded
                  ? 'rounded-none shadow-sm !min-h-8 !min-w-8 !p-0 !px-0 hover:!translate-y-0'
                  : 'rounded-none font-button uppercase tracking-wide shadow-sm'
              }
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
            >
              {isEmbedded ? (
                loading ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <ArrowUp className="size-4 shrink-0" aria-hidden strokeWidth={2.25} />
                )
              ) : loading ? (
                '…'
              ) : (
                'Get website ideas'
              )}
            </Button>
          </div>
        </div>
      </Textarea>

      <div className={isEmbedded ? 'text-left' : undefined}>
        <IdeaResultsGrid
          ideas={ideas}
          loading={loading}
          onBuild={handleBuild}
          buildLabel={isAuthenticated && !isClient(user) ? 'CONTACT US' : 'BUILD THIS'}
          showFullIdeasLink={variant === 'embedded'}
          showMyIdeasLink={isAuthenticated && isClient(user)}
          cardDensity={isEmbedded ? 'hero' : 'default'}
        />
      </div>
    </div>
  )
}

export default IdeaExplorePanel
