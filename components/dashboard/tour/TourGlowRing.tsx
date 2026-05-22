'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  el: HTMLElement | null
  borderRadius?: number
}

/**
 * Portal-div above driver.js overlay (z-index 1_000_000_001).
 * Positions itself over the highlighted element via rAF + visualViewport correction
 * so it doesn't drift on mobile pinch-zoom.
 */
export default function TourGlowRing({ el, borderRadius = 12 }: Props) {
  const ringRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const ring = ringRef.current
    if (!ring || !el) return

    let raf = 0
    const PAD = 3

    const update = () => {
      const rect = el.getBoundingClientRect()
      const vv = window.visualViewport
      const scale = vv?.scale ?? 1
      const ox = vv?.offsetLeft ?? 0
      const oy = vv?.offsetTop ?? 0

      ring.style.left   = `${ox + rect.left  / scale - PAD}px`
      ring.style.top    = `${oy + rect.top   / scale - PAD}px`
      ring.style.width  = `${rect.width  / scale + PAD * 2}px`
      ring.style.height = `${rect.height / scale + PAD * 2}px`
      ring.style.opacity = '1'
      raf = requestAnimationFrame(update)
    }
    update()

    return () => {
      cancelAnimationFrame(raf)
      if (ring) ring.style.opacity = '0'
    }
  }, [el])

  if (typeof document === 'undefined' || !el) return null

  return createPortal(
    <div
      ref={ringRef}
      style={{
        position: 'fixed',
        borderRadius: borderRadius + 3,
        zIndex: 1_000_000_001,
        pointerEvents: 'none',
        opacity: 0,
        animation: 'tour-breathe 2s ease-in-out infinite',
      }}
    />,
    document.body,
  )
}
