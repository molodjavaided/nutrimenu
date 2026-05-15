'use client'

import { useState } from 'react'
import { PlanId } from '@/lib/admin-api'

const PLAN_LABEL: Record<PlanId, string> = {
  TEST: 'Тест',
  START: 'Старт',
  STANDARD: 'Стандарт',
  CUSTOM: 'Индивидуальный',
}

interface Props {
  newPlan: PlanId
  onCancel: () => void
  onConfirm: (extendPaidDays: number | null) => void
  pending: boolean
}

const OPTIONS: { label: string; days: number | null }[] = [
  { label: '+1 месяц', days: 30 },
  { label: '+3 месяца', days: 90 },
  { label: '+6 месяцев', days: 180 },
  { label: '+1 год', days: 365 },
  { label: 'Без продления', days: null },
]

export function PlanSwitchModal({ newPlan, onCancel, onConfirm, pending }: Props) {
  const [days, setDays] = useState<number | null>(30)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={() => !pending && onCancel()}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
        style={{ background: '#FEFEF2' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-1" style={{ color: '#2C2950' }}>
          Назначить тариф «{PLAN_LABEL[newPlan]}»
        </h3>
        <p className="text-xs mb-4" style={{ color: '#9D99B8' }}>
          Чтобы заведение работало, нужно продлить оплату. Выберите срок:
        </p>

        <div className="flex flex-col gap-1.5 mb-5">
          {OPTIONS.map(opt => {
            const active = days === opt.days
            return (
              <button
                key={String(opt.days)}
                onClick={() => setDays(opt.days)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: active ? 'rgba(139,92,246,0.15)' : '#EAE7F8',
                  color: active ? '#7C3AED' : '#2C2950',
                  border: `1px solid ${active ? '#7C3AED' : 'transparent'}`,
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span>{opt.label}</span>
                {active && <span>✓</span>}
              </button>
            )
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#EAE7F8', color: '#6B6490' }}
          >Отмена</button>
          <button
            onClick={() => onConfirm(days)}
            disabled={pending}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: '#2C2950', color: '#FEFEF2' }}
          >
            {pending ? '…' : 'Применить'}
          </button>
        </div>
      </div>
    </div>
  )
}
