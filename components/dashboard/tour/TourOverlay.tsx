'use client'

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'

export type Placement = 'auto' | 'top' | 'bottom' | 'screen-bottom'

interface Rect { top: number; left: number; width: number; height: number }

interface Props {
  /** CSS-селектор подсвечиваемой цели. null → центрированная модалка (интро/финал). */
  targetSelector: string | null
  /** Когда этот элемент появляется в DOM — подсветка/дырка переезжают на него (двухфазный шаг). */
  revealSelector?: string | null
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
  /** Мягкий режим: не затемнять и не блокировать клики (поверх уже модального слоя). */
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

function measure(el: HTMLElement | null): Rect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/** Сдвиг визуального вьюпорта (пинч-зум/пан) — чтобы fixed-слои не съезжали от цели. */
function useVisualViewport() {
  const [vv, setVv] = useState({ x: 0, y: 0, w: 0, h: 0 })
  useEffect(() => {
    const v = typeof window !== 'undefined' ? window.visualViewport : null
    if (!v) return
    const sync = () => setVv({ x: v.offsetLeft, y: v.offsetTop, w: v.width, h: v.height })
    sync()
    v.addEventListener('resize', sync)
    v.addEventListener('scroll', sync)
    return () => { v.removeEventListener('resize', sync); v.removeEventListener('scroll', sync) }
  }, [])
  return vv
}

export default function TourOverlay({
  targetSelector, revealSelector, title, body, placement = 'auto', showNext, onNext, onSkip,
  stepIndex, totalSteps, padding = PAD, soft = false,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(() => null)
  const vv = useVisualViewport()

  // Непрерывно ищем актуальную цель и меряем её. Если в DOM появился revealSelector —
  // переключаемся на него (фаза 2 шага: нашли строку нужного ингредиента).
  // Параллельно вешаем ring-класс прямо на живой элемент — он в потоке, не дрейфит.
  useLayoutEffect(() => {
    let raf = 0
    let ringEl: HTMLElement | null = null
    const tick = () => {
      const el = visibleEl(revealSelector ?? null) ?? visibleEl(targetSelector)
      if (el !== ringEl) {
        ringEl?.classList.remove('tour-target')
        if (el) el.classList.add('tour-target')
        ringEl = el
      }
      setRect(prev => {
        const next = measure(el)
        if (!prev && !next) return prev
        if (prev && next && prev.top === next.top && prev.left === next.left
          && prev.width === next.width && prev.height === next.height) return prev
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ringEl?.classList.remove('tour-target')
    }
  }, [targetSelector, revealSelector])

  // Скроллим цель в зону видимости при смене селектора.
  useEffect(() => {
    if (!targetSelector) return
    visibleEl(targetSelector)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [targetSelector])

  const dim = 'rgba(20,16,40,0.55)'
  const hole = rect
    ? { top: rect.top - padding, left: rect.left - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 }
    : null

  // Тултип: под целью если влезает, иначе над. Без цели — по центру.
  const TOOLTIP_W = 320
  let tipStyle: React.CSSProperties
  if (placement === 'screen-bottom') {
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

  // Корень привязан к визуальному вьюпорту: при пинч-зуме его (0,0) совпадает
  // с тем, что видит пользователь, поэтому панели/тултип не съезжают от цели.
  const rootStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0,
    width: vv.w || '100%', height: vv.h || '100%',
    transform: `translate(${vv.x}px, ${vv.y}px)`,
    zIndex: 10000, pointerEvents: 'none',
  }

  const block = { pointerEvents: 'auto' as const, background: dim }
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  const prevent = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div aria-live="polite" style={rootStyle}>
      {/* Затемнение. С дыркой — 4 панели вокруг цели (цель не накрыта → соседи не кликабельны).
          Без дырки — сплошной слой (интро/финал). soft — без затемнения. */}
      {!soft && (hole ? (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(0, hole.top), ...block }} onClick={stop} onMouseDown={prevent} />
          <div style={{ position: 'absolute', top: hole.top + hole.height, left: 0, right: 0, bottom: 0, ...block }} onClick={stop} onMouseDown={prevent} />
          <div style={{ position: 'absolute', top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height, ...block }} onClick={stop} onMouseDown={prevent} />
          <div style={{ position: 'absolute', top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height, ...block }} onClick={stop} onMouseDown={prevent} />
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, ...block }} onClick={stop} onMouseDown={prevent} />
      ))}

      {/* Тултип */}
      <div
        style={{
          position: 'absolute', ...tipStyle, zIndex: 1, pointerEvents: 'auto',
          background: '#FEFEF2', border: '0.5px solid rgba(139,92,246,0.22)', borderRadius: 16,
          boxShadow: '0 8px 24px -6px rgba(44,41,80,0.25)',
        }}
        className="p-4"
        onClick={stop}
      >
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
  )
}
