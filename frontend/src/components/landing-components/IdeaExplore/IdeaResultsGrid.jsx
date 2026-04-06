import React from 'react'
import { Link } from 'react-router-dom'
import IdeaCard from './IdeaCard'

/**
 * @param {object} props
 * @param {boolean} [props.showFullIdeasLink] - "Full ideas page" (e.g. hero embedded)
 * @param {boolean} [props.showMyIdeasLink] - "My ideas" for signed-in clients
 * @param {string} [props.headingText] - override left header (default: count-based)
 */
const IdeaResultsGrid = ({
  ideas,
  onBuild,
  loading,
  buildLabel = 'BUILD THIS',
  showFullIdeasLink = false,
  showMyIdeasLink = false,
  headingText,
  cardDensity = 'default',
}) => {
  if (!ideas?.length && !loading) {
    return null
  }

  const count = ideas?.length || 0
  const isHero = cardDensity === 'hero'
  const leftHeading =
    headingText ||
    (count === 1 ? '1 idea to start your project' : `${count} ideas to start your project`)

  return (
    <div
      className="mt-6 w-full"
      aria-live="polite"
      aria-busy={loading}
    >
      {loading ? (
        <p className="font-body text-sm text-ink-muted">Generating directions for your business…</p>
      ) : (
        <section
          className={
            isHero
              ? 'border border-primary/20 bg-primary/[0.06] px-4 py-4 sm:px-5 sm:py-5'
              : 'border border-primary/20 bg-primary/[0.06] px-4 py-5 sm:px-5 sm:py-6'
          }
        >
          <div className={`flex flex-wrap items-center justify-between gap-3 ${isHero ? 'mb-3' : 'mb-4'}`}>
            <p className="font-button text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              {leftHeading}
            </p>
            {(showFullIdeasLink || showMyIdeasLink) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-button text-[10px] uppercase tracking-wide">
                {showFullIdeasLink && (
                  <Link
                    to="/ideas"
                    className="text-primary underline decoration-primary/50 underline-offset-2 hover:text-ink"
                  >
                    Full ideas page
                  </Link>
                )}
                {showMyIdeasLink && (
                  <Link
                    to="/my-ideas"
                    className="text-primary underline decoration-primary/50 underline-offset-2 hover:text-ink"
                  >
                    My ideas
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className={isHero ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'}>
            {ideas.map((idea, index) => (
              <IdeaCard
                key={idea.key || idea.title}
                idea={idea}
                onBuild={onBuild}
                buildLabel={buildLabel}
                density={cardDensity}
                index={index}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default IdeaResultsGrid
