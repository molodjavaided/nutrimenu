'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trialDaysLeft } from '@/lib/plans'
import { messagesStore } from '@/components/feedback/MessagesButton'

interface LimitInfo {
  plan: string
  state: 'trial' | 'awaiting_plan' | 'paid' | 'grace' | 'expired'
  trialEndsAt: string | null
  paidUntil: string | null
}

export default function TrialBanner() {
  const [info, setInfo] = useState<LimitInfo | null>(null)

  useEffect(() => {
    fetch('/api/import/limit')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.plan) setInfo(data)
      })
  }, [])

  if (!info) return null

  // Тест-период закончился, админ ещё не назначил тариф
  if (info.state === 'awaiting_plan') {
    return (
      <div
        className="w-full px-4 py-2.5 flex items-center justify-between gap-4 text-sm"
        style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}
      >
        <span style={{ color: '#DC2626' }}>
          Тестовый период завершён. Меню скрыто от гостей — напишите админу, чтобы выбрать тариф.
        </span>
        <button
          onClick={() => messagesStore.open('billing')}
          className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold"
          style={{ background: '#DC2626', color: '#fff' }}
        >
          Написать админу
        </button>
      </div>
    )
  }

  // Платный тариф истёк, идёт grace
  if (info.state === 'grace') {
    return (
      <div
        className="w-full px-4 py-2.5 flex items-center justify-between gap-4 text-sm"
        style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}
      >
        <span style={{ color: '#92400E' }}>
          Срок оплаты истёк. Меню для гостей временно скрыто — продлите подписку.
        </span>
        <button
          onClick={() => messagesStore.open('billing')}
          className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold"
          style={{ background: '#D97706', color: '#fff' }}
        >
          Продлить
        </button>
      </div>
    )
  }

  // В тесте — показываем за ≤7 дней до конца
  if (info.state === 'trial' && info.plan === 'TEST') {
    const endsAt = info.trialEndsAt ? new Date(info.trialEndsAt) : null
    const daysLeft = trialDaysLeft(endsAt)
    if (daysLeft > 7) return null

    return (
      <div
        className="w-full px-4 py-2.5 flex items-center justify-between gap-4 text-sm"
        style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}
      >
        <span style={{ color: '#92400E' }}>
          Тестовый период: осталось <b>{daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}</b>
        </span>
        <Link
          href="/pricing"
          className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold"
          style={{ background: '#D97706', color: '#fff' }}
        >
          Выбрать тариф
        </Link>
      </div>
    )
  }

  return null
}
