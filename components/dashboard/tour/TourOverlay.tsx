'use client'

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'

export type Placement = 'auto' | 'top' | 'bottom' | 'screen-bottom'

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

function visibleEl(selector: string | null): HTMLElement | null {
  if (!selector) return null
  // querySelectorAll: mobile/desktop варианты рендерятся оба, берём видимый (ненулевой).
  for (const el of document.querySelectorAll(selector)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 || r.height > 0) return el as HTMLElement
  }
  return null
}

function measure(selector: string | null): Rect | null {
  const el = visibleEl(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
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
    visibleEl(targetSelector)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [targetSelector])

  // Поднимаем реальную цель над затемнением — без выреза фона.
  // (soft-шаги уже поверх модального пикера, их не трогаем.)
  useEffect(() => {
    if (soft || !targetSelector) return
    let el: HTMLElement | null = null
    let prevPos = '', prevZ = ''
    let raf = requestAnimationFrame(function find() {
      el = visibleEl(targetSelector)
      if (!el) { raf = requestAnimationFrame(find); return }
      prevPos = el.style.position
      prevZ = el.style.zIndex
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
      el.style.zIndex = '10002'
    })
    return () => {
      cancelAnimationFrame(raf)
      if (el) { el.style.position = prevPos; el.style.zIndex = prevZ }
    }
  }, [targetSelector, soft])

  const dim = 'rgba(20,16,40,0.55)'
  const hole = rect
    ? { top: rect.top - padding, left: rect.left - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 }
    : null

  // Тултип: под целью если влезает, иначе над. Без цели — по центру.
  const TOOLTIP_W = 320
  let tipStyle: React.CSSProperties
  if (placement === 'screen-bottom') {
    // Прижать к низу экрана — не перекрывать зону выдачи результатов (поиск в пикере).
    tipStyle = {
      bottom: 'calc(env(safe-area-inset-bottom) + 16px)',
      left: '50%', transform: 'translateX(-50%)', width: TOOLTIP_W, maxWidth: '92vw',
    }
  } else if (!hole) {
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

  // Простая схема слоёв (без выреза фона):
  // дим на весь экран (10000) < свечение (10001) < поднятая цель (10002, эффект в effect) < тултип (10003).
  return (
    <div aria-live="polite">
      {/* Полное затемнение экрана — ловит клики вне цели (жёсткий режим) */}
      {!soft && (
        <div
          style={{ position: 'fixed', inset: 0, background: dim, zIndex: 10000, pointerEvents: 'auto' }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.preventDefault()}
        />
      )}

      {/* «Дышащее» лавандовое свечение вокруг цели — поверх затемнения, под самой кнопкой */}
      {rect && (
        <div
          className="tour-breathe"
          style={{ position: 'fixed', top: rect.top + 3, left: rect.left + 3, width: rect.width - 6, height: rect.height - 6, pointerEvents: 'none', zIndex: 10001 }}
        />
      )}

      {/* Тултип — одна плашка, тень прижата вплотную */}
      <div
        style={{
          position: 'fixed', ...tipStyle, zIndex: 10003, pointerEvents: 'auto',
          background: '#FEFEF2', border: '0.5px solid rgba(139,92,246,0.22)', borderRadius: 16,
          boxShadow: '0 8px 24px -6px rgba(44,41,80,0.25)',
        }}
        className="p-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
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
