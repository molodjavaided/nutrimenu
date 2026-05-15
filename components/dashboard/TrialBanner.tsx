'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trialDaysLeft } from '@/lib/plans'

interface LimitInfo {
  plan: string
  trialActive: boolean
  trialEndsAt: string | null
}

export default function TrialBanner() {
  const [info, setInfo] = useState<LimitInfo | null>(null)

  useEffect(() => {
    fetch('/api/import/limit')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.plan) setInfo(data)
      })
  }, [])

  if (!info || info.plan !== 'START') return null

  const endsAt = info.trialEndsAt ? new Date(info.trialEndsAt) : null
  const active = info.trialActive
  const daysLeft = trialDaysLeft(endsAt)

  if (!active) {
    return (
      <div
        className="w-full px-4 py-2.5 flex items-center justify-between gap-4 text-sm"
        style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}
      >
        <span style={{ color: '#DC2626' }}>
          Пробный период завершён — часть функций заблокирована.
        </span>
        <Link
          href="/pricing"
          className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold"
          style={{ background: '#DC2626', color: '#fff' }}
        >
          Выбрать тариф
        </Link>
      </div>
    )
  }

  if (daysLeft > 7) return null

  return (
    <div
      className="w-full px-4 py-2.5 flex items-center justify-between gap-4 text-sm"
      style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}
    >
      <span style={{ color: '#92400E' }}>
        Пробный период: осталось <b>{daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}</b> (тариф Старт)
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
