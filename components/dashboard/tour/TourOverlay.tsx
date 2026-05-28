'use client'

import { useEffect, useLayoutEffect, useState } from 'react'

export type TourPlacement = 'auto' | 'top' | 'bottom' | 'screen-bottom'

interface Props {
  targetSelector: string | null
  revealSelector?: string | null
  title?: string
  body: string
  placement?: TourPlacement
  showNext?: boolean
  onNext?: () => void
  onSkip: () => void
  stepIndex: number
  totalSteps: number
  overlayOpacity?: number
  /** Мягкий шаг — не блокировать клики нигде (превью, модалки) */
  soft?: boolean
}

interface Rect { top: number; left: number; width: number; height: number }

function visibleEl(selector: string | null): HTMLElement | null {
  if (!selector) return null
  for (const el of document.querySelectorAll(selector)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 || r.height > 0) return el as HTMLElement
  }
  return null
}

function measure(el: HTMLElement | null): Rect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function useVisualViewport() {
  const [vv, setVv] = useState({ x: 0, y: 0, w: 0, h: 0 })
  useEffect(() => {
    const v = window.visualViewport
    if (!v) return
    const sync = () => setVv({ x: v.offsetLeft, y: v.offsetTop, w: v.width, h: v.height })
    sync()
    v.addEventListener('resize', sync)
    v.addEventListener('scroll', sync)
    return () => { v.removeEventListener('resize', sync); v.removeEventListener('scroll', sync) }
  }, [])
  return vv
}

const TOOLTIP_W = 300

export default function TourOverlay({
  targetSelector, revealSelector, title, body, placement = 'auto',
  showNext, onNext, onSkip, stepIndex, totalSteps, soft = false,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(null)
  const vv = useVisualViewport()

  useLayoutEffect(() => {
    let raf = 0
    let activeEl: HTMLElement | null = null

    const tick = () => {
      const el = visibleEl(revealSelector ?? null) ?? visibleEl(targetSelector)

      if (el !== activeEl) {
        activeEl?.classList.remove('tour-target')
        if (el) {
          el.classList.add('tour-target')
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        activeEl = el
      }

      setRect(prev => {
        const next = measure(el)
        if (!prev && !next) return prev
        if (prev && next
          && prev.top === next.top && prev.left === next.left
          && prev.width === next.width && prev.height === next.height) return prev
        return next
      })

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      activeEl?.classList.remove('tour-target')
    }
  }, [targetSelector, revealSelector])

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400

  let tipStyle: React.CSSProperties
  if (placement === 'screen-bottom') {
    tipStyle = {
      bottom: 'calc(env(safe-area-inset-bottom) + 16px)',
      left: '50%', transform: 'translateX(-50%)',
      width: TOOLTIP_W, maxWidth: '92vw',
    }
  } else if (!rect) {
    tipStyle = {
      top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      width: TOOLTIP_W, maxWidth: '90vw',
    }
  } else {
    const below = rect.top + rect.height
    const wantAbove = placement === 'top' || (placement !== 'bottom' && below > vh * 0.6)
    const left = Math.max(12, Math.min(rect.left, vw - TOOLTIP_W - 12))
    tipStyle = wantAbove
      ? { bottom: vh - rect.top + 12, left, width: TOOLTIP_W, maxWidth: '90vw' }
      : { top: rect.top + rect.height + 12, left, width: TOOLTIP_W, maxWidth: '90vw' }
  }

  const vpStyle = {
    transform: `translate(${vv.x}px, ${vv.y}px)`,
    width: vv.w || '100%',
    height: vv.h || '100%',
  }

  const hole = rect
    ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    : null

  const stop = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault() }

  const panel: React.CSSProperties = { position: 'absolute', pointerEvents: 'auto' }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, ...vpStyle, zIndex: 9990, pointerEvents: 'none' }}>
      {/* 4 прозрачных панели вокруг кнопки — кнопка в дырке и кликабельна без z-index */}
      {!soft && hole ? (
        <>
          <div style={{ ...panel, top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} onMouseDown={stop} onClick={stop} />
          <div style={{ ...panel, top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} onMouseDown={stop} onClick={stop} />
          <div style={{ ...panel, top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }} onMouseDown={stop} onClick={stop} />
          <div style={{ ...panel, top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} onMouseDown={stop} onClick={stop} />
        </>
      ) : !soft ? (
        <div style={{ ...panel, inset: 0, position: 'absolute' }} onMouseDown={stop} onClick={stop} />
      ) : null}

      {/* Тултип */}
      <div
        onClick={e => e.stopPropagation()}
        onPointerDownCapture={e => e.stopPropagation()}
        onMouseDownCapture={e => e.stopPropagation()}
        onTouchStartCapture={e => e.stopPropagation()}
        style={{
          position: 'absolute', ...tipStyle,
          background: '#FEFEF2',
          border: '0.5px solid rgba(139,92,246,0.22)',
          borderRadius: 16,
          boxShadow: '0 8px 32px -6px rgba(44,41,80,0.3)',
          padding: 16,
          pointerEvents: 'auto',
          zIndex: 9996,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#8B5CF6' }}>
            Шаг {stepIndex + 1} из {totalSteps}
          </span>
          <button
            type="button"
            onClick={onSkip}
            style={{
              fontSize: 11, color: 'var(--color-text-muted)',
              background: 'rgba(139,92,246,0.06)',
              border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
            }}
          >
            Пропустить
          </button>
        </div>

        {title && (
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            {title}
          </p>
        )}

        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-secondary)', margin: 0 }}>
          {body}
        </p>

        {showNext && (
          <button
            type="button"
            onClick={onNext}
            style={{
              marginTop: 14, width: '100%', padding: '9px 16px',
              background: '#8B5CF6', color: '#fff', border: 'none',
              borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
            }}
          >
            Дальше
          </button>
        )}
      </div>
    </div>
  )
}
