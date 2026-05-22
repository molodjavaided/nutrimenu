'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { tourBus } from '@/lib/tour/bus'
import { CARBONARA_STEPS } from '@/lib/tour/carbonara'
import type { Driver, Side } from '@/lib/tour/driver-instance'

const STORAGE_KEY = 'nm-tour-carbonara-step'

/** Видимый (ненулевой) элемент по селектору — mobile/desktop варианты рендерятся оба. */
function visibleEl(selector: string | null): HTMLElement | null {
  if (!selector) return null
  for (const el of document.querySelectorAll(selector)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 || r.height > 0) return el as HTMLElement
  }
  return null
}

function sideFor(placement?: string): Side | undefined {
  if (placement === 'top') return 'top'
  if (placement === 'bottom') return 'bottom'
  return undefined // auto / screen-bottom — пусть driver выберет сам
}

/**
 * Движок интерактивного тура «Карбонара». Спотлайт/поповер рисует driver.js
 * (ленивый chunk, грузится при старте). Логика шагов — здесь: переходы по
 * событиям tourBus и навигации, двухфазный reveal (input → строка результата).
 */
export default function TourController() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)
  const driverRef = useRef<Driver | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/user/onboarding')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.isCompleted || data.isDismissed) return
        if (data.step >= 1) {
          const saved = Number(sessionStorage.getItem(STORAGE_KEY) ?? '0')
          setIndex(Number.isFinite(saved) && saved >= 0 ? saved : 0)
          setActive(true)
        }
      })
      .catch(() => {})
  }, [])

  // Старт из welcome-модалки (OnboardingHost) без перемонтирования.
  useEffect(() => {
    const onStart = () => { setIndex(0); sessionStorage.setItem(STORAGE_KEY, '0'); setActive(true) }
    window.addEventListener('nm-tour-start', onStart)
    return () => window.removeEventListener('nm-tour-start', onStart)
  }, [])

  useEffect(() => {
    if (active) sessionStorage.setItem(STORAGE_KEY, String(index))
  }, [active, index])

  // Ленивая загрузка driver.js при первом старте тура.
  useEffect(() => {
    if (!active || driverRef.current) return
    let cancelled = false
    import('@/lib/tour/driver-instance').then(mod => {
      if (cancelled) return
      driverRef.current = mod.createTourDriver()
      setReady(true)
    })
    return () => { cancelled = true }
  }, [active])

  // Полный демонтаж при размонтировании.
  useEffect(() => () => { driverRef.current?.destroy(); driverRef.current = null }, [])

  const finish = useCallback(() => {
    setActive(false)
    driverRef.current?.destroy()
    driverRef.current = null
    setReady(false)
    sessionStorage.removeItem(STORAGE_KEY)
    fetch('/api/user/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    }).catch(() => {})
  }, [])

  const done = active && index >= CARBONARA_STEPS.length
  useEffect(() => { if (done) finish() }, [done, finish])

  const step = active && index < CARBONARA_STEPS.length ? CARBONARA_STEPS[index] : null

  // Переход по событию реального действия.
  useEffect(() => {
    if (!step?.advanceOn) return
    const { event, match } = step.advanceOn
    return tourBus.on(event, p => {
      if (match && !match(p)) return
      setIndex(i => i + 1)
    })
  }, [step])

  // Переход по навигации: если следующий шаг ждёт текущую страницу.
  useEffect(() => {
    if (!active || !step || step.page === pathname) return
    const fwd = CARBONARA_STEPS.findIndex((s, i) => i > index && s.page === pathname)
    if (fwd >= 0) setIndex(fwd)
  }, [pathname, active, step, index])

  // Рисуем/обновляем спотлайт. Re-highlight при появлении/смене целевого элемента
  // (двухфазный reveal, монтирование). driver сам репозиционируется на скролл/resize.
  useEffect(() => {
    const d = driverRef.current
    if (!ready || !d || !step || step.page !== pathname) return

    const isLast = index === CARBONARA_STEPS.length - 1
    const total = CARBONARA_STEPS.length
    const showNext = !!step.showNext

    let raf = 0
    let lastEl: Element | null | undefined
    let first = true
    let lastRevealEl: HTMLElement | null = null

    const clearReveal = () => {
      lastRevealEl?.classList.remove('tour-reveal-active')
      lastRevealEl = null
    }

    const highlight = (el: HTMLElement | null) => {
      // Picker steps: overlay transparent so whole modal is visible;
      // glow is added via CSS class directly on the result row.
      const isRevealPhase = !!step.revealTarget && !!el?.dataset.tour?.startsWith('picker-result-')

      // Picker steps (revealTarget exists): transparent overlay so modal is fully visible
      d.setConfig({ overlayOpacity: step.revealTarget ? 0 : 0.55 })

      if (isRevealPhase) {
        if (el !== lastRevealEl) {
          clearReveal()
          el!.classList.add('tour-reveal-active')
          lastRevealEl = el
        }
      } else {
        clearReveal()
      }

      const description =
        `<span class="plate-tour-step">Шаг ${index + 1} из ${total}</span>` +
        `<span class="plate-tour-body">${step.body}</span>`
      d.highlight({
        element: isRevealPhase ? undefined : (el ?? undefined),
        disableActiveInteraction: false,
        popover: {
          title: step.title,
          description,
          side: sideFor(step.placement),
          showButtons: showNext ? ['next', 'close'] : ['close'],
          nextBtnText: isLast ? 'Готово' : 'Дальше',
          onNextClick: () => (isLast ? finish() : setIndex(i => i + 1)),
          onCloseClick: () => finish(),
        },
      })
    }

    const loop = () => {
      const revealEl = visibleEl(step.revealTarget ?? null)
      const el = revealEl ?? visibleEl(step.target)
      if (first || el !== lastEl) { first = false; lastEl = el; highlight(el) }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(raf); clearReveal() }
  }, [ready, step, index, pathname, finish])

  return null
}
