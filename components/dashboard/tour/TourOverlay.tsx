'use client'

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'

export type Placement = 'auto' | 'top' | 'bottom'

interface Rect { top: number; left: number; width: number; height: number }

interface Props {
  /** CSS-селектор подсвечиваемой цели. null → центрированная модалка (интро/финал). */
  targetSelector: string | null
  title?: string
  body: ReactNode
  placement?: Placement
  /** Показать кнопку «Дальше» (для информационных шагов без события-перехода). */
  showNext?: boolean
  onNext?: () => void
  onSkip: () => void
  stepIndex: number
  totalSteps: number
  /** Доп. отступ окна прожектора вокруг цели, px. */
  padding?: number
  /** Мягкий режим: не блокировать клики (для шагов поверх уже модального пикера). */
  soft?: boolean
}

const PAD = 8

function measure(selector: string | null): Rect | null {
  if (!selector) return null
  // querySelectorAll: mobile/desktop варианты рендерятся оба, берём видимый (ненулевой).
  const els = document.querySelectorAll(selector)
  for (const el of els) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 || r.height > 0) return { top: r.top, left: r.left, width: r.width, height: r.height }
  }
  return null
}

export default function TourOverlay({
  targetSelector, title, body, placement = 'auto', showNext, onNext, onSkip,
  stepIndex, totalSteps, padding = PAD, soft = false,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(() => null)

  // Непрерывно меряем цель (она может появляться/анимироваться/скроллиться).
  useLayoutEffect(() => {
    let raf = 0
    const tick = () => {
      setRect(prev => {
        const next = measure(targetSelector)
        if (!prev && !next) return prev
        if (prev && next && prev.top === next.top && prev.left === next.left
          && prev.width === next.width && prev.height === next.height) return prev
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [targetSelector])

  // Скроллим цель в зону видимости при смене селектора.
  useEffect(() => {
    if (!targetSelector) return
    const el = document.querySelector(targetSelector)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [targetSelector])

  const dim = 'rgba(20,16,40,0.55)'
  const hole = rect
    ? { top: rect.top - padding, left: rect.left - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 }
    : null

  // Тултип: под целью если влезает, иначе над. Без цели — по центру.
  const TOOLTIP_W = 320
  let tipStyle: React.CSSProperties
  if (!hole) {
    tipStyle = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TOOLTIP_W, maxWidth: '90vw' }
  } else {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const below = hole.top + hole.height
    const wantTop = placement === 'top' || (placement === 'auto' && below > vh * 0.6)
    const left = Math.max(12, Math.min(hole.left, (typeof window !== 'undefined' ? window.innerWidth : 360) - TOOLTIP_W - 12))
    tipStyle = wantTop
      ? { bottom: vh - hole.top + 12, left, width: TOOLTIP_W, maxWidth: '90vw' }
      : { top: below + 12, left, width: TOOLTIP_W, maxWidth: '90vw' }
  }

  // Затемняющие панели вокруг окна — ловят клики (жёсткая блокировка),
  // само окно цели остаётся кликабельным.
  const panel = (style: React.CSSProperties) => (
    <div
      style={{ position: 'fixed', background: dim, ...style }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.preventDefault()}
    />
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: soft ? 'none' : undefined }} aria-live="polite">
      {hole ? (
        <>
          {/* Затемняющие панели только в жёстком режиме */}
          {!soft && <>
            {panel({ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) })}
            {panel({ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height })}
            {panel({ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height })}
            {panel({ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 })}
          </>}

          {/* Пульсирующее кольцо вокруг цели */}
          <div style={{ position: 'fixed', top: hole.top, left: hole.left, width: hole.width, height: hole.height, pointerEvents: 'none' }}>
            <span className="absolute inset-0 rounded-xl animate-ping" style={{ border: '2px solid rgba(176,166,223,0.9)' }} />
            <span className="absolute inset-0 rounded-xl" style={{ boxShadow: '0 0 0 2px rgba(139,92,246,0.9), 0 0 22px 4px rgba(139,92,246,0.45)' }} />
          </div>
        </>
      ) : (
        !soft && panel({ inset: 0 })
      )}

      {/* Тултип */}
      <div
        style={{ position: 'fixed', ...tipStyle, zIndex: 101, pointerEvents: 'auto' }}
        className="rounded-2xl p-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div style={{ background: '#FEFEF2', border: '0.5px solid rgba(139,92,246,0.22)', borderRadius: 16 }} className="p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-medium" style={{ color: '#8B5CF6' }}>
              Шаг {stepIndex + 1} из {totalSteps}
            </span>
            <button
              type="button"
              onClick={onSkip}
              className="text-[11px] px-2 py-1 rounded-lg transition-colors active:scale-95"
              style={{ color: 'var(--color-text-muted)', background: 'rgba(139,92,246,0.06)' }}
            >
              Пропустить
            </button>
          </div>
          {title && <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{title}</p>}
          <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{body}</div>
          {showNext && (
            <button
              type="button"
              onClick={onNext}
              className="mt-3 w-full px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
              style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}
            >
              Дальше
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
