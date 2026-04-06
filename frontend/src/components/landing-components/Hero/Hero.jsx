import React, { useRef, useEffect } from 'react'
import { Container } from '@/components/ui-components'
import IdeaExplorePanel from '@/components/landing-components/IdeaExplore/IdeaExplorePanel'
import heroBackMp4 from '../../../../Hero-Back.mp4'
import './Hero.css'

/** Seconds: fade out before loop end and fade in after restart so the seek is invisible */
const LOOP_FADE_OUT_SEC = 1.2
const LOOP_FADE_IN_SEC = 0.65
const HERO_TITLE_LINES_REST = [
  { key: 'mid', text: "That's exactly where we", className: 'hero-title-wave__line mt-1.5 block normal-case font-normal italic md:mt-2' },
  { key: 'end', text: 'start.', className: 'hero-title-wave__line mt-1 block normal-case md:mt-1.5' },
]

const renderLeadTitleLine = () => (
  <span className="hero-title-wave__line hero-title-wave__line--lead block normal-case">
    <span className="hero-title-wave__neon font-heading text-[1.02em] font-bold uppercase tracking-[0.08em] md:text-[1.06em] lg:text-[1.05em] xl:text-[1.04em]">
      Your idea
    </span>
    <span className="hero-title-wave__lead-rest"> is messy.</span>
  </span>
)

const renderHeroTitleLines = () => (
  <>
    {renderLeadTitleLine()}
    {HERO_TITLE_LINES_REST.map(({ key, text, className }) => (
      <span key={key} className={className}>
        {text}
      </span>
    ))}
  </>
)

const Hero = () => {
  const videoRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const video = videoRef.current
    if (!video) return

    let rafId = 0
    const tick = () => {
      rafId = requestAnimationFrame(tick)
      if (video.paused) return

      const dur = video.duration
      if (!Number.isFinite(dur) || dur <= 0) {
        video.style.opacity = '1'
        return
      }

      const t = video.currentTime
      let fadeIn = LOOP_FADE_IN_SEC
      let fadeOut = LOOP_FADE_OUT_SEC
      if (dur < fadeIn + fadeOut) {
        const half = dur / 2
        fadeIn = half
        fadeOut = half
      }

      let opacity = 1
      if (t < fadeIn) {
        opacity = Math.min(1, t / fadeIn)
      } else if (t > dur - fadeOut) {
        opacity = Math.max(0, (dur - t) / fadeOut)
      }

      video.style.opacity = String(opacity)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      if (video) video.style.opacity = ''
    }
  }, [])

  return (
    <section
      className="hero-section relative overflow-hidden border-t-4 border-primary"
      id="hero"
    >
      <div className="hero-video-bg pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="hero-video-mask">
          <video
            ref={videoRef}
            className="hero-loop-video absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover saturate-[1.12] contrast-[1.04]"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src={heroBackMp4} type="video/mp4" />
          </video>
        </div>
        <div className="hero-video-scrim" aria-hidden />
      </div>

      <Container className="hero-content relative z-10 !px-4 sm:!px-8 w-full max-w-content text-left">
        <div className="flex flex-col gap-6 pt-2 md:gap-8 md:pt-3 lg:gap-10 lg:pt-4 xl:gap-12 xl:pt-5">
          <div className="mx-auto w-full min-w-0 max-w-4xl">
            <div className="relative overflow-hidden rounded-t-xl border-t border-border bg-white/70 p-px shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
              <div
                className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(16,185,129,0.00)_0deg,rgba(16,185,129,0.72)_42deg,rgba(110,231,183,0.18)_95deg,rgba(16,185,129,0.00)_165deg,rgba(5,150,105,0.62)_248deg,rgba(16,185,129,0.00)_320deg,rgba(16,185,129,0.72)_360deg)] animate-[spin_10s_linear_infinite]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -inset-10 opacity-55 blur-2xl bg-[conic-gradient(from_0deg_at_50%_50%,rgba(16,185,129,0.00)_0deg,rgba(52,211,153,0.42)_60deg,rgba(16,185,129,0.00)_150deg,rgba(5,150,105,0.36)_230deg,rgba(16,185,129,0.00)_320deg,rgba(52,211,153,0.42)_360deg)] animate-[spin_16s_linear_infinite_reverse]"
                aria-hidden
              />
              <div className="relative bg-surface">
                <div className="border-b border-border px-5 py-6 sm:px-7 sm:py-7 md:px-8 md:py-8">
                  <h1
                    className="title title--hero hero-title-wave w-fit max-w-full border-l-4 border-l-primary pl-4 text-left font-body text-3xl font-bold leading-[1.15] tracking-normal text-ink sm:pl-5 md:pl-6 md:text-4xl lg:text-5xl xl:text-[3.25rem]"
                    aria-label="Your idea is messy. That's exactly where we start."
                  >
                    <span className="hero-title-wave__visual" aria-hidden="true">
                      <span className="hero-title-wave__layer hero-title-wave__layer--brand">{renderHeroTitleLines()}</span>
                      <span className="hero-title-wave__layer hero-title-wave__layer--ink">{renderHeroTitleLines()}</span>
                    </span>
                  </h1>
                </div>
                <div className="relative px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-4">
                  <IdeaExplorePanel variant="embedded" />
                </div>
              </div>
            </div>
            <p className="mx-auto mt-8 px-4 py-3 text-center font-body text-base leading-[1.7] text-ink-secondary md:mt-10 md:px-6 md:py-4 md:text-lg md:leading-relaxed">
              For people who <strong className="font-semibold text-ink">already run something</strong>—a site, bookings, a small team—but feel stuck improving it
              (too big a rebuild, or too vague to start). Describe the struggle in plain language. You get a few{' '}
              <strong className="font-semibold text-ink">bounded next steps</strong>, not a fantasy product or a generic first website pitch.
              Pick one—we build it with you.
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default Hero
