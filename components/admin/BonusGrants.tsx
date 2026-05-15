'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, adminKeys } from '@/lib/admin-api'
import { PLANS } from '@/lib/plans'
import { Check, Pencil } from 'lucide-react'

type PlanId = 'START' | 'STANDARD' | 'CUSTOM'

interface Props {
  venueId: string
  plan: PlanId
  bonusItems: number
  bonusAiImports: number
  bonusTtkExports: number
}

function planValue(plan: PlanId, key: 'maxItems' | 'aiImportPerMonth' | 'ttkExportPerMonth'): string {
  const v = PLANS[plan][key]
  if (v == null) return '0'
  if (!Number.isFinite(v)) return '∞'
  return String(v)
}

function planNum(plan: PlanId, key: 'maxItems' | 'aiImportPerMonth' | 'ttkExportPerMonth'): number {
  const v = PLANS[plan][key]
  if (v == null) return 0
  if (!Number.isFinite(v)) return Infinity
  return v as number
}

function fmtTotal(planN: number, bonus: number): string {
  if (!Number.isFinite(planN)) return '∞'
  return String(planN + bonus)
}

interface RowProps {
  label: string
  plan: PlanId
  planKey: 'maxItems' | 'aiImportPerMonth' | 'ttkExportPerMonth'
  bonus: number
  onApply: (next: number) => void
  pending: boolean
}

function GrantRow({ label, plan, planKey, bonus, onApply, pending }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(bonus))
  const planN = planNum(plan, planKey)

  function commit() {
    const n = Math.max(0, parseInt(draft, 10) || 0)
    onApply(n)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap py-2">
      <div className="flex-1 min-w-[140px]">
        <p className="text-sm font-medium" style={{ color: '#2C2950' }}>{label}</p>
        <p className="text-xs" style={{ color: '#9D99B8' }}>
          План: {planValue(plan, planKey)} · бонус: +{bonus} · итого: <span className="font-semibold" style={{ color: '#2C2950' }}>{fmtTotal(planN, bonus)}</span>
        </p>
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit() }}
            autoFocus
            className="w-20 px-2 py-1 rounded-lg text-sm outline-none text-right"
            style={{ background: 'rgba(255,255,255,0.85)', color: '#2C2950', border: '0.5px solid rgba(176,166,223,0.4)' }}
          />
          <button
            onClick={commit}
            disabled={pending}
            className="px-2 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: '#15803D', color: '#fff' }}
          >
            <Check size={12} />
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5 flex-wrap">
          {[10, 50, 100].map(n => (
            <button
              key={n}
              onClick={() => onApply(bonus + n)}
              disabled={pending}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50 active:scale-95"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
            >+{n}</button>
          ))}
          <button
            onClick={() => { setDraft(String(bonus)); setEditing(true) }}
            disabled={pending}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50 active:scale-95"
            style={{ background: 'rgba(176,166,223,0.3)', color: '#2C2950' }}
            title="Указать значение"
          ><Pencil size={11} /></button>
          {bonus > 0 && (
            <button
              onClick={() => onApply(0)}
              disabled={pending}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50 active:scale-95"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
            >Сброс</button>
          )}
        </div>
      )}
    </div>
  )
}

export function BonusGrants({ venueId, plan, bonusItems, bonusAiImports, bonusTtkExports }: Props) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (patch: { bonusItems?: number; bonusAiImports?: number; bonusTtkExports?: number }) =>
      adminApi.updatePlan(venueId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.venue(venueId) }),
  })

  return (
    <div className="rounded-2xl p-5 space-y-1" style={{ background: '#EAE7F8' }}>
      <p className="text-xs font-semibold mb-2" style={{ color: '#9D99B8' }}>БОНУСНЫЕ ЛИМИТЫ (СВЕРХ ПЛАНА)</p>
      <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
        <GrantRow
          label="Слотов под блюда"
          plan={plan}
          planKey="maxItems"
          bonus={bonusItems}
          onApply={v => mutation.mutate({ bonusItems: v })}
          pending={mutation.isPending}
        />
        <GrantRow
          label="AI-импортов в месяц"
          plan={plan}
          planKey="aiImportPerMonth"
          bonus={bonusAiImports}
          onApply={v => mutation.mutate({ bonusAiImports: v })}
          pending={mutation.isPending}
        />
        <GrantRow
          label="ТТК-экспортов в месяц"
          plan={plan}
          planKey="ttkExportPerMonth"
          bonus={bonusTtkExports}
          onApply={v => mutation.mutate({ bonusTtkExports: v })}
          pending={mutation.isPending}
        />
      </div>
      <p className="text-xs mt-2" style={{ color: '#B0A6DF' }}>
        Бонусы прибавляются к лимиту тарифа и сохраняются при смене плана.
      </p>
    </div>
  )
}
