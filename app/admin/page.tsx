'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type VenueStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface Venue {
  id: string
  name: string
  slug: string
  status: VenueStatus
  allowAdminEdit: boolean
  createdAt: string
  owner: { email: string }
}

interface Stats {
  total: number
  newThisWeek: number
  byStatus: Record<string, number>
}

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
const STATUS_BG: Record<VenueStatus, string> = {
  PENDING: 'rgba(180,83,9,0.1)',
  APPROVED: 'rgba(21,128,61,0.1)',
  REJECTED: 'rgba(220,38,38,0.1)',
}

export default function AdminPage() {
  const router = useRouter()
  const [venues, setVenues] = useState<Venue[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [entering, setEntering] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Venue | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VenueStatus | 'ALL'>('ALL')

  useEffect(() => {
    fetch('/api/admin/venues')
      .then(r => r.json())
      .then(data => {
        setVenues(data.venues ?? data)
        setStats(data.stats ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return venues.filter(v => {
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false
      if (q && !v.name.toLowerCase().includes(q) && !v.owner.email.toLowerCase().includes(q) && !v.slug.includes(q)) return false
      return true
    })
  }, [venues, search, statusFilter])

  async function setStatus(id: string, status: VenueStatus) {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/venues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) setVenues(prev => prev.map(v => v.id === id ? { ...v, status } : v))
    } finally {
      setUpdating(null)
    }
  }

  async function enterVenue(id: string) {
    setEntering(id)
    try {
      const res = await fetch(`/api/admin/venues/${id}/impersonate`, { method: 'POST' })
      if (res.ok) router.push('/dashboard')
    } finally {
      setEntering(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/venues/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setVenues(prev => prev.filter(v => v.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <>
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
            style={{ background: '#FEFEF2' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold mb-1" style={{ color: '#2C2950' }}>Удалить заведение?</h3>
            <p className="text-sm mb-1" style={{ color: '#6B6490' }}>
              <span className="font-medium" style={{ color: '#2C2950' }}>{deleteTarget.name}</span>
            </p>
            <p className="text-xs mb-5" style={{ color: '#9D99B8' }}>
              Владелец {deleteTarget.owner.email} и все данные меню будут удалены безвозвратно.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: '#EAE7F8', color: '#6B6490' }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                style={{ background: '#DC2626', color: '#fff' }}
              >
                {deleting ? '…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: '#2C2950' }}>Заведения</h1>
      </div>

      {/* Stats */}
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

      {/* Search + Filter */}
      <div className="flex gap-2 mb-4 flex-col sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="14" height="14" viewBox="0 0 16 16" fill="none"
            style={{ color: '#9D99B8' }}
          >
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию, email, slug..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: '#EAE7F8', color: '#2C2950' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as VenueStatus | 'ALL')}
          className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
          style={{ background: '#EAE7F8', color: '#2C2950' }}
        >
          <option value="ALL">Все статусы</option>
          <option value="PENDING">На проверке</option>
          <option value="APPROVED">Одобрено</option>
          <option value="REJECTED">Отклонено</option>
        </select>
      </div>

      {/* Venue list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: '#9D99B8' }}>
          {search || statusFilter !== 'ALL' ? 'Ничего не найдено' : 'Нет заведений'}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(venue => (
            <div
              key={venue.id}
              className="rounded-2xl px-4 py-3.5 flex items-center gap-3 flex-wrap"
              style={{ background: '#EAE7F8' }}
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: '#2C2950' }}>{venue.name}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: '#9D99B8' }}>
                  {venue.owner.email} · /{venue.slug}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#B0A6DF' }}>
                  {new Date(venue.createdAt).toLocaleDateString('ru-RU')}
                </p>
              </div>

              {/* Status selector */}
              <select
                value={venue.status}
                disabled={updating === venue.id}
                onChange={e => setStatus(venue.id, e.target.value as VenueStatus)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium outline-none cursor-pointer disabled:opacity-50 transition-all shrink-0"
                style={{
                  color: STATUS_COLOR[venue.status],
                  background: STATUS_BG[venue.status],
                  border: `1px solid ${STATUS_COLOR[venue.status]}30`,
                }}
              >
                <option value="PENDING">На проверке</option>
                <option value="APPROVED">Одобрено</option>
                <option value="REJECTED">Отклонено</option>
              </select>

              {/* Actions */}
              <div className="flex gap-2 shrink-0 flex-wrap">
                <Link
                  href={`/admin/venues/${venue.id}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}
                >
                  Открыть
                </Link>
                {venue.allowAdminEdit && (
                  <button
                    onClick={() => enterVenue(venue.id)}
                    disabled={entering === venue.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1"
                    style={{ background: 'rgba(176,166,223,0.3)', color: '#2C2950' }}
                  >
                    {entering === venue.id ? '…' : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                          <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M10 2h4m0 0v4m0-4L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Войти
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setDeleteTarget(venue)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                  style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
