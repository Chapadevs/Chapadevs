import React, { useState, useRef, useEffect } from 'react'
import { Button, SecondaryButton, Textarea, Container } from '@/components/ui-components'
import heroBackMp4 from '../../../../Hero-Back.mp4'
import './Hero.css'

/** Seconds: fade out before loop end and fade in after restart so the seek is invisible */
const LOOP_FADE_OUT_SEC = 1.2
const LOOP_FADE_IN_SEC = 0.65

const Hero = () => {
  const videoRef = useRef(null)
  const [generateFormData, setGenerateFormData] = useState({
    prompt: '',
  })
  const handleChange = (field, value) => {
    setGenerateFormData({ ...generateFormData, [field]: value })
  }

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
        <h1 className="title title--hero mb-10 max-w-3xl font-heading text-3xl font-bold leading-[1.15] tracking-wide text-ink md:mb-12 md:text-4xl lg:mb-14 lg:text-5xl xl:text-[3.25rem]">
          <span className="block normal-case">Your idea is messy.</span>
          <span className="mt-2 block font-body text-2xl font-normal italic text-primary md:mt-3 md:text-3xl lg:text-4xl">
            That's exactly
          </span>
          <span className="mt-1 block normal-case md:mt-2">where we start.</span>
        </h1>

        <p className="mt-4 mb-10 max-w-2xl border-l-4 border-primary py-2 pl-7 pr-2 font-body text-base leading-[1.65] text-ink-secondary md:mt-6 md:mb-12 md:pl-9 md:py-3 md:text-lg md:leading-relaxed lg:mt-8 lg:pl-10">
          Messy ideas and crossed wires waste time and money. Chapadevs is the translation layer between what
          you mean and what gets built: describe your project in plain language, get a live preview your
          developer can code from, and follow everything in one shared workspace.
        </p>

        <div className="mx-auto w-full max-w-3xl border-2 border-border bg-surface shadow-lg shadow-ink/5">
          <div
            className="flex items-center gap-2 border-b border-border bg-ink px-4 py-2.5"
            aria-hidden
          >
            <span className="size-2 shrink-0 bg-white/35" />
            <span className="size-2 shrink-0 bg-white/25" />
            <span className="size-2 shrink-0 bg-white/20" />
          </div>
          <div className="bg-surface-gray p-4 md:p-6">
            <Textarea
              id="preview-prompt"
              label="Project description"
              labelClassName="text-xs tracking-[0.12em] md:text-[0.8125rem]"
              value={generateFormData.prompt}
              onChange={(e) => handleChange('prompt', e.target.value)}
              placeholder="Describe the app, site, or workflow you want — we’ll turn it into a visual preview."
              required
              autoExpand
              minRows={5}
              maxHeight="200px"
            >
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <span className="hidden text-[10px] font-medium uppercase tracking-wider text-ink-muted/60 sm:inline-block">
                  {generateFormData.prompt?.length || 0} characters
                </span>

                <div className="flex items-center gap-1.5">
                  <SecondaryButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-none font-normal lowercase text-ink-muted hover:text-ink"
                    onClick={() => setGenerateFormData({ prompt: '' })}
                  >
                    cancel
                  </SecondaryButton>
                  <Button type="submit" size="sm" className="rounded-none shadow-sm" to="/login">
                    Generate
                  </Button>
                </div>
              </div>
            </Textarea>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default Hero
