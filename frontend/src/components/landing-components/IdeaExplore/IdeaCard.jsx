import React from 'react'
import { Button } from '@/components/ui-components'

const truncate = (s, max) => {
  if (typeof s !== 'string') return ''
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function bulletLines(idea) {
  const feats = Array.isArray(idea.keyFeatures)
    ? idea.keyFeatures.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
    : []
  if (feats.length) return feats.slice(0, 4)
  const pages = Array.isArray(idea.suggestedPages)
    ? idea.suggestedPages.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
    : []
  if (pages.length) return pages.slice(0, 4).map((p) => `Page: ${p}`)
  return []
}

/**
 * Compact visual card: title, pitch, bullets, single CTA.
 */
const IdeaCard = ({
  idea,
  onBuild,
  buildLabel = 'BUILD THIS',
  disabled,
  density = 'default',
  index = 0,
}) => {
  if (!idea) return null
  const pd = idea.previewDirection || {}
  const bullets = bulletLines(idea)
  const isHero = density === 'hero'
  const eyebrow = String(index + 1).padStart(2, '0')

  const blurb = idea.summary
    ? truncate(idea.summary, 260)
    : pd.homepageConcept
      ? truncate(pd.homepageConcept, 260)
      : ''

  const heroHook = pd.homepageConcept
    ? truncate(pd.homepageConcept, 140)
    : idea.summary
      ? truncate(idea.summary, 140)
      : ''

  if (isHero) {
    return (
      <article className="flex h-full flex-col border border-primary/15 border-l-4 border-l-primary bg-surface px-4 py-4 shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col">
          <span className="shrink-0 font-button text-[10px] uppercase tracking-[0.18em] text-primary/70">
            Idea {eyebrow}
          </span>

          <h3 className="mt-2 shrink-0 font-heading text-sm font-bold uppercase leading-snug tracking-wide text-primary line-clamp-3 md:text-[15px]">
            {idea.title}
          </h3>

          {heroHook ? (
            <p className="mt-3 shrink-0 font-body text-sm leading-relaxed text-ink-secondary">
              {heroHook}
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          className="mt-4 w-full shrink-0 rounded-none py-2.5 font-button text-[11px] uppercase tracking-[0.12em]"
          onClick={() => onBuild?.(idea)}
          disabled={disabled}
        >
          {buildLabel}
        </Button>
      </article>
    )
  }

  return (
    <article className="flex h-full flex-col border border-primary/15 bg-surface p-4 shadow-sm">
      <h3 className="font-heading text-sm font-bold uppercase leading-snug tracking-wide text-primary line-clamp-2 md:text-base">
        {idea.title}
      </h3>

      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
        {blurb ? (
          <p className="font-body text-xs leading-relaxed text-ink-secondary line-clamp-2">{blurb}</p>
        ) : null}

        {bullets.length > 0 ? (
          <ul className="list-none space-y-1 border-t border-primary/10 pt-2">
            {bullets.map((line, i) => (
              <li key={i} className="flex gap-1.5 text-left">
                <span
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-[1px] bg-primary"
                  aria-hidden
                />
                <span
                  className="min-w-0 font-body text-[10px] leading-snug text-ink line-clamp-2"
                  title={line}
                >
                  {truncate(line, 120)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Button
        type="button"
        variant="primary"
        size="sm"
        className="mt-3 w-full shrink-0 rounded-none py-2.5 font-button text-[11px] uppercase tracking-[0.12em]"
        onClick={() => onBuild?.(idea)}
        disabled={disabled}
      >
        {buildLabel}
      </Button>
    </article>
  )
}

export default IdeaCard
