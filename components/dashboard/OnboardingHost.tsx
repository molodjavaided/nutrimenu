'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileSheet from '@/components/ui/MobileSheet'

interface OnboardingState {
  step: number
  totalSteps: number
  completedAt: string | null
  dismissedAt: string | null
  isCompleted: boolean
  isDismissed: boolean
}

/**
 * Хост туториала. Сейчас рендерит только welcome modal (шаг 0).
 * Следующие главы (1..7) добавляются по мере проработки страниц — см. project_onboarding_redesign.md.
 */
export default function OnboardingHost() {
  const router = useRouter()
  const [state, setState] = useState<OnboardingState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = () => {
      fetch('/api/user/onboarding')
        .then(r => r.ok ? r.json() : null)
        .then(setState)
        .catch(() => {})
    }
    load()
    // Рестарт обучения из настроек — перечитать состояние без перезагрузки страницы.
    window.addEventListener('nm-onboarding-restart', load)
    return () => window.removeEventListener('nm-onboarding-restart', load)
  }, [])

  if (!state) return null
  // Сейчас обрабатываем только welcome (шаг 0). Главы 1..7 — UI пока не реализован, скрываем.
  const showWelcome = state.step === 0 && !state.isDismissed && !state.isCompleted
  if (!showWelcome) return null

  async function postAction(action: 'next' | 'dismiss') {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        setState(data)
        if (action === 'next') {
          window.dispatchEvent(new Event('nm-tour-start'))
          router.push('/dashboard/menu')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <MobileSheet
      open
      onClose={() => postAction('dismiss')}
      title="Добро пожаловать в Plate"
      zIndex={90}
      desktopWidth="md"
      footer={
        <div className="px-5 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => postAction('dismiss')}
            disabled={busy}
            className="px-3 py-2 rounded-xl text-sm"
            style={{ color: 'var(--color-text-muted)', background: 'transparent' }}
          >
            Не сейчас
          </button>
          <button
            onClick={() => postAction('next')}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
            style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}
          >
            Начать обучение
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      }
    >
      <div className="px-5 py-6 sm:px-7 sm:py-8 space-y-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(139,92,246,0.10)', color: '#7C3AED' }}
          aria-hidden
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8" />
            <path d="M11 16h10M16 11v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Соберём вместе первое блюдо — классическую карбонару.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Я проведу за руку: подсвечу каждый шаг, а вы будете нажимать. Покажу, как добавить ингредиенты
            из справочника и как Plate сам считает КБЖУ и выход после обработки.
          </p>
        </div>
        <div className="rounded-2xl p-3 sm:p-4" style={{ background: 'rgba(139,92,246,0.06)' }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#8B5CF6' }}>
            Что будем делать
          </p>
          <ol className="space-y-1.5 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <li className="flex gap-2"><span style={{ color: '#B0A6DF' }}>1.</span> Создадим новое блюдо</li>
            <li className="flex gap-2"><span style={{ color: '#B0A6DF' }}>2.</span> Добавим пасту, грудинку и желток</li>
            <li className="flex gap-2"><span style={{ color: '#B0A6DF' }}>3.</span> Зададим обработку — увидим автоматический пересчёт</li>
            <li className="flex gap-2"><span style={{ color: '#B0A6DF' }}>4.</span> Посмотрим меню глазами гостя</li>
          </ol>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Можно пропустить и вернуться к обучению через настройки.
        </p>
      </div>
    </MobileSheet>
  )
}
