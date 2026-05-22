'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { tourBus } from '@/lib/tour/bus'
import { CARBONARA_STEPS } from '@/lib/tour/carbonara'
import TourOverlay from './TourOverlay'

const STORAGE_KEY = 'nm-tour-carbonara-step'

/**
 * Движок интерактивного тура «Карбонара». Монтируется в dashboard layout.
 * Тур активен, когда onboardingStep >= 1 и не завершён/не отклонён.
 * Под-шаг переживает переход menu→item/new через sessionStorage.
 */
export default function TourController() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)

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

  const finish = useCallback(() => {
    setActive(false)
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

  if (!active || !step || step.page !== pathname) return null

  const isLast = index === CARBONARA_STEPS.length - 1
  return (
    <TourOverlay
      targetSelector={step.target}
      revealSelector={step.revealTarget ?? null}
      title={step.title}
      body={step.body}
      placement={step.placement}
      showNext={step.showNext}
      onNext={() => (isLast ? finish() : setIndex(i => i + 1))}
      onSkip={finish}
      stepIndex={index}
      totalSteps={CARBONARA_STEPS.length}
      soft={step.soft}
    />
  )
}
