'use client'

import Link from 'next/link'
import { AdminVenue, SubscriptionState, VenueStatus, daysUntil, getSubscriptionState } from '@/lib/admin-api'

const STATUS_LABEL: Record<VenueStatus, string> = {
  PENDING: 'На проверке',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
}
const STATUS_COLOR: Record<VenueStatus, string> = {
  PENDING: '#B45309',
  APPROVED: '#15803D',
  REJECTED: '#DC2626',
}

const SUB_COLOR: Record<SubscriptionState, string> = {
  trial: '#7C3AED',
  paid: '#15803D',
  grace: '#B45309',
  expired: '#DC2626',
}

function subscriptionLabel(state: SubscriptionState, trialEndsAt: string | null, paidUntil: string | null): string {
  if (state === 'paid') {
    const d = daysUntil(paidUntil)
    return d != null && d <= 14 ? `Оплачено ${d}д` : 'Оплачено'
  }
  if (state === 'trial') {
    const d = daysUntil(trialEndsAt)
    return d != null ? `Триал ${d}д` : 'Триал'
  }
  if (state === 'grace') return 'Grace'
  return 'Просрочка'
}

interface Props {
  venue: AdminVenue
  selected: boolean
  onToggleSelect: () => void
  showCheckbox: boolean
}

export function VenueCard({ venue, selected, onToggleSelect, showCheckbox }: Props) {
  const state = getSubscriptionState(venue.owner.trialEndsAt, venue.owner.paidUntil)
  const location = [venue.city, venue.country].filter(Boolean).join(', ') || '—'

  return (
    <div
      className="rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all"
      style={{ background: selected ? 'rgba(139,92,246,0.12)' : '#EAE7F8' }}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-4 h-4 shrink-0 cursor-pointer accent-violet-600"
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: '#2C2950' }}>{venue.name}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: '#9D99B8' }}>{location}</p>
        <p className="text-xs mt-0.5" style={{ color: '#B0A6DF' }}>
          {new Date(venue.createdAt).toLocaleDateString('ru-RU')}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ color: STATUS_COLOR[venue.status], background: `${STATUS_COLOR[venue.status]}1a` }}
        >
          {STATUS_LABEL[venue.status]}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ color: SUB_COLOR[state], background: `${SUB_COLOR[state]}1a` }}
        >
          {subscriptionLabel(state, venue.owner.trialEndsAt, venue.owner.paidUntil)}
        </span>
      </div>

      <Link
        href={`/admin/venues/${venue.id}`}
        className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 shrink-0"
        style={{ background: 'rgba(139,92,246,0.15)', color: '#7C3AED' }}
      >
        Открыть
      </Link>
    </div>
  )
}
