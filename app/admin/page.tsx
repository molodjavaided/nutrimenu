'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminApi,
  adminKeys,
  AdminVenue,
  VenueStatus,
  getSubscriptionState,
  daysUntil,
} from '@/lib/admin-api'
import { VenueCard } from '@/components/admin/VenueCard'
import { BarcodeCachePanel } from '@/components/admin/BarcodeCachePanel'

type QuickFilter = 'pending' | 'trial_ending' | 'awaiting_plan' | 'grace' | 'expired' | null
type SortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'status'

const PAGE_SIZE = 20

export default function AdminPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: adminKeys.venues,
    queryFn: adminApi.fetchVenues,
  })
  const venues = data?.venues ?? []
  const stats = data?.stats

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VenueStatus | 'ALL'>('ALL')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null)
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const now = Date.now()
    return venues.filter(v => {
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false
      if (quickFilter) {
        const state = getSubscriptionState(v.owner.plan, v.owner.trialEndsAt, v.owner.paidUntil, now)
        if (quickFilter === 'pending' && v.status !== 'PENDING') return false
        if (quickFilter === 'trial_ending') {
          if (state !== 'trial') return false
          const d = daysUntil(v.owner.trialEndsAt, now)
          if (d == null || d > 3) return false
        }
        if (quickFilter === 'awaiting_plan' && state !== 'awaiting_plan') return false
        if (quickFilter === 'grace' && state !== 'grace') return false
        if (quickFilter === 'expired' && state !== 'expired') return false
      }
      if (q) {
        const hay = `${v.name} ${v.owner.email} ${v.slug} ${v.city ?? ''} ${v.country ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [venues, search, statusFilter, quickFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sort) {
      case 'date_asc':
        return arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case 'name_asc':
        return arr.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      case 'status':
        return arr.sort((a, b) => a.status.localeCompare(b.status))
      case 'date_desc':
      default:
        return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  }, [filtered, sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Counters for quick-filter chips
  const counts = useMemo(() => {
    const now = Date.now()
    let pending = 0, trialEnding = 0, awaitingPlan = 0, grace = 0, expired = 0
    for (const v of venues) {
      if (v.status === 'PENDING') pending++
      const state = getSubscriptionState(v.owner.plan, v.owner.trialEndsAt, v.owner.paidUntil, now)
      if (state === 'trial') {
        const d = daysUntil(v.owner.trialEndsAt, now)
        if (d != null && d <= 3) trialEnding++
      }
      if (state === 'awaiting_plan') awaitingPlan++
      if (state === 'grace') grace++
      if (state === 'expired') expired++
    }
    return { pending, trialEnding, awaitingPlan, grace, expired }
  }, [venues])

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) => adminApi.bulkApprove(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.venues })
      setSelected(new Set())
    },
  })

  const selectedPendingIds = useMemo(() => {
    const ids: string[] = []
    for (const v of venues) {
      if (selected.has(v.id) && v.status === 'PENDING') ids.push(v.id)
    }
    return ids
  }, [selected, venues])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function resetFilter(next: QuickFilter) {
    setQuickFilter(next)
    setPage(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: '#2C2950' }}>Заведения</h1>
      </div>

      <BarcodeCachePanel />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Всего', value: stats.total, color: '#2C2950', bg: '#EAE7F8' },
            { label: 'На проверке', value: stats.byStatus['PENDING'] ?? 0, color: '#B45309', bg: 'rgba(180,83,9,0.08)' },
            { label: 'Одобрено', value: stats.byStatus['APPROVED'] ?? 0, color: '#15803D', bg: 'rgba(21,128,61,0.08)' },
            { label: 'За неделю', value: stats.newThisWeek, color: '#7C3AED', bg: 'rgba(139,92,246,0.1)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="rounded-xl px-4 py-3" style={{ background: bg }}>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9D99B8' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { key: 'pending' as const, label: 'На проверке', count: counts.pending, color: '#B45309' },
          { key: 'trial_ending' as const, label: 'Тест ≤3д', count: counts.trialEnding, color: '#7C3AED' },
          { key: 'awaiting_plan' as const, label: 'Ждёт тариф', count: counts.awaitingPlan, color: '#DC2626' },
          { key: 'grace' as const, label: 'Grace', count: counts.grace, color: '#B45309' },
          { key: 'expired' as const, label: 'Просрочено', count: counts.expired, color: '#9D99B8' },
        ].map(f => {
          const active = quickFilter === f.key
          return (
            <button
              key={f.key}
              onClick={() => resetFilter(active ? null : f.key)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
              style={{
                background: active ? f.color : `${f.color}14`,
                color: active ? '#fff' : f.color,
              }}
            >
              {f.label}
              <span className="ml-1.5 opacity-70">{f.count}</span>
            </button>
          )
        })}
        {quickFilter && (
          <button
            onClick={() => resetFilter(null)}
            className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{ color: '#9D99B8', background: 'transparent' }}
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Search + sort + status filter */}
      <div className="flex gap-2 mb-4 flex-col sm:flex-row">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#9D99B8' }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Название, email, город..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: '#EAE7F8', color: '#2C2950' }}
          />
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
          style={{ background: '#EAE7F8', color: '#2C2950' }}
        >
          <option value="date_desc">Сначала новые</option>
          <option value="date_asc">Сначала старые</option>
          <option value="name_asc">По названию</option>
          <option value="status">По статусу</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as VenueStatus | 'ALL'); setPage(1) }}
          className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
          style={{ background: '#EAE7F8', color: '#2C2950' }}
        >
          <option value="ALL">Все статусы</option>
          <option value="PENDING">На проверке</option>
          <option value="APPROVED">Одобрено</option>
          <option value="REJECTED">Отклонено</option>
        </select>
      </div>

      {/* Bulk approve bar */}
      {selectedPendingIds.length > 0 && (
        <div
          className="rounded-xl px-4 py-2.5 mb-4 flex items-center gap-3"
          style={{ background: 'rgba(21,128,61,0.1)', border: '1px solid rgba(21,128,61,0.3)' }}
        >
          <span className="text-sm font-medium" style={{ color: '#15803D' }}>
            Выбрано на проверке: {selectedPendingIds.length}
          </span>
          <button
            onClick={() => bulkApproveMutation.mutate(selectedPendingIds)}
            disabled={bulkApproveMutation.isPending}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
            style={{ background: '#15803D', color: '#fff' }}
          >
            {bulkApproveMutation.isPending ? '…' : `Одобрить все (${selectedPendingIds.length})`}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: '#15803D' }}
          >
            Снять выделение
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: '#9D99B8' }}>
          {search || statusFilter !== 'ALL' || quickFilter ? 'Ничего не найдено' : 'Нет заведений'}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {pageItems.map((venue: AdminVenue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                selected={selected.has(venue.id)}
                onToggleSelect={() => toggleSelect(venue.id)}
                showCheckbox={venue.status === 'PENDING'}
              />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                style={{ background: '#EAE7F8', color: '#2C2950' }}
              >
                ←
              </button>
              <span className="text-xs" style={{ color: '#6B6490' }}>
                {safePage} из {pageCount} · всего {sorted.length}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={safePage === pageCount}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                style={{ background: '#EAE7F8', color: '#2C2950' }}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
