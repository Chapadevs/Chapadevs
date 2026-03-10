import React, { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

const CURSOR_OFFSET = 16

const HoverGuidance = ({
  content,
  openDelay = 50,
  closeDelay = 50,
  children,
  className = '',
  ...rest
}) => {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const openTimeoutRef = useRef(null)
  const closeTimeoutRef = useRef(null)

  const handlePointerEnter = useCallback((e) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setPosition({ x: e.clientX, y: e.clientY })
    openTimeoutRef.current = setTimeout(() => setOpen(true), openDelay)
  }, [openDelay])

  const handlePointerMove = useCallback((e) => {
    setPosition({ x: e.clientX, y: e.clientY })
  }, [])

  const handlePointerLeave = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current)
      openTimeoutRef.current = null
    }
    closeTimeoutRef.current = setTimeout(() => setOpen(false), closeDelay)
  }, [closeDelay])

  if (!content) return children

  const trigger = (
    <span
      {...rest}
      className="inline-block w-fit max-w-full"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </span>
  )

  const contentEl = open && createPortal(
    <div
      className={`z-50 w-64 rounded-none border border-border bg-surface p-4 text-ink shadow-md outline-none font-body max-w-xs animate-in fade-in-0 zoom-in-95 ${className}`.trim()}
      style={{
        position: 'fixed',
        left: Math.min(position.x + CURSOR_OFFSET, window.innerWidth - 280),
        top: Math.min(position.y + CURSOR_OFFSET, window.innerHeight - 200),
      }}
      onPointerEnter={() => {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current)
          closeTimeoutRef.current = null
        }
      }}
      onPointerLeave={() => {
        closeTimeoutRef.current = setTimeout(() => setOpen(false), closeDelay)
      }}
    >
      {typeof content === 'string' ? (
        <p className="text-sm font-body text-ink">{content}</p>
      ) : (
        content
      )}
    </div>,
    document.body
  )

  return (
    <>
      {trigger}
      {contentEl}
    </>
  )
}

export default HoverGuidance
