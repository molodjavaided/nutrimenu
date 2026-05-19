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
    fetch('/api/user/onboarding')
      .then(r => r.ok ? r.json() : null)
      .then(setState)
      .catch(() => {})
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
        if (action === 'next') router.push('/dashboard/settings')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <MobileSheet
      open
      onClose={() => postAction('dismiss')}
      title="Добро пожаловать в NutriMenu"
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
        <div className="text-5xl">🍽️</div>
        <div className="space-y-2">
          <p className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
            За 5 минут соберём ваше первое цифровое меню с КБЖУ.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Проведём через настройки заведения, добавим категорию и первое блюдо, сгенерируем QR-код для гостей.
            На каждом шаге подскажу что делать и зачем.
          </p>
        </div>
        <div className="rounded-2xl p-3 sm:p-4" style={{ background: 'rgba(139,92,246,0.06)' }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#8B5CF6' }}>
            Что будем делать
          </p>
          <ol className="space-y-1.5 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <li className="flex gap-2"><span style={{ color: '#B0A6DF' }}>1.</span> Заполним данные заведения</li>
            <li className="flex gap-2"><span style={{ color: '#B0A6DF' }}>2.</span> Создадим категорию меню</li>
            <li className="flex gap-2"><span style={{ color: '#B0A6DF' }}>3.</span> Добавим первое блюдо с КБЖУ</li>
            <li className="flex gap-2"><span style={{ color: '#B0A6DF' }}>4.</span> Получим QR для столов</li>
          </ol>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Можно пропустить и вернуться к обучению через настройки.
        </p>
      </div>
    </MobileSheet>
  )
}
