'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  PENDING: 'rgba(180,83,9,0.08)',
  APPROVED: 'rgba(21,128,61,0.08)',
  REJECTED: 'rgba(220,38,38,0.08)',
}

export default function AdminPage() {
  const router = useRouter()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [entering, setEntering] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function enterVenue(id: string) {
    setEntering(id)
    try {
      const res = await fetch(`/api/admin/venues/${id}/impersonate`, { method: 'POST' })
      if (res.ok) router.push('/dashboard')
    } finally {
      setEntering(null)
    }
  }

  useEffect(() => {
    fetch('/api/admin/venues')
      .then(r => r.json())
      .then(setVenues)
      .finally(() => setLoading(false))
  }, [])

  async function deleteVenue(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/venues/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setVenues(prev => prev.filter(v => v.id !== id))
        setDeleteConfirm(null)
      }
    } finally {
      setDeleting(null)
    }
  }

  async function setStatus(id: string, status: VenueStatus) {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/venues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setVenues(prev => prev.map(v => v.id === id ? { ...v, status } : v))
      }
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return <p className="text-sm" style={{ color: '#7a748f' }}>Загрузка…</p>
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#2C2950' }}>Заведения</h1>
        <span className="text-sm" style={{ color: '#7a748f' }}>{venues.length} всего</span>
      </div>

      {venues.length === 0 ? (
        <p className="text-sm" style={{ color: '#7a748f' }}>Нет заведений</p>
      ) : (
        <div className="flex flex-col gap-3">
          {venues.map(venue => (
            <div
              key={venue.id}
              className="rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{ background: '#EAE7F8' }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: '#2C2950' }}>
                  {venue.name}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: '#7a748f' }}>
                  {venue.owner.email} · /{venue.slug}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#7a748f' }}>
                  {new Date(venue.createdAt).toLocaleDateString('ru-RU')}
                </p>
              </div>

              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                style={{ color: STATUS_COLOR[venue.status], background: STATUS_BG[venue.status] }}
              >
                {STATUS_LABEL[venue.status]}
              </span>

              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                {deleteConfirm === venue.id ? (
                  <>
                    <button
                      onClick={() => deleteVenue(venue.id)}
                      disabled={deleting === venue.id}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 transition-all active:scale-95"
                      style={{ background: '#DC2626', color: '#fff' }}
                    >
                      {deleting === venue.id ? '…' : 'Подтвердить'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                      style={{ background: '#EAE7F8', color: '#2C2950' }}
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(venue.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                    style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}
                  >
                    Удалить
                  </button>
                )}
                {venue.allowAdminEdit && (
                  <button
                    onClick={() => enterVenue(venue.id)}
                    disabled={entering === venue.id}
                    title="Войти в дашборд этого заведения"
                    className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
                  >
                    {entering === venue.id ? '…' : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M10 2h4m0 0v4m0-4L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Войти в меню
                      </>
                    )}
                  </button>
                )}
                {venue.status !== 'APPROVED' && (
                  <button
                    onClick={() => setStatus(venue.id, 'APPROVED')}
                    disabled={updating === venue.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 transition-all active:scale-95"
                    style={{ background: '#15803D', color: '#fff' }}
                  >
                    Одобрить
                  </button>
                )}
                {venue.status !== 'REJECTED' && (
                  <button
                    onClick={() => setStatus(venue.id, 'REJECTED')}
                    disabled={updating === venue.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 transition-all active:scale-95"
                    style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}
                  >
                    Отклонить
                  </button>
                )}
                {venue.status !== 'PENDING' && (
                  <button
                    onClick={() => setStatus(venue.id, 'PENDING')}
                    disabled={updating === venue.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 transition-all active:scale-95"
                    style={{ background: 'rgba(180,83,9,0.1)', color: '#B45309' }}
                  >
                    На проверку
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
