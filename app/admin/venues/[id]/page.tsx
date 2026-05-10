'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react'

type VenueStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface MenuItem {
  id: string
  name: string
  description: string | null
  photo: string | null
  price: number | null
  weight: number
  weightUnit: string
  calories: number
  protein: number
  fat: number
  carbs: number
  isAvailable: boolean
}

interface Category {
  id: string
  name: string
  items: MenuItem[]
}

interface VenueDetail {
  id: string
  name: string
  slug: string
  address: string | null
  description: string | null
  status: VenueStatus
  createdAt: string
  owner: {
    email: string
    emailVerified: boolean
    ttkImportCount: number
    createdAt: string
  }
  categories: Category[]
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

export default function AdminVenueMenuPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [venue, setVenue] = useState<VenueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/venues/${id}/menu`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setVenue(data); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (venue) {
      // Expand all categories by default
      setExpanded(new Set(venue.categories.map(c => c.id)))
    }
  }, [venue])

  async function setStatus(status: VenueStatus) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/venues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) setVenue(prev => prev ? { ...prev, status } : prev)
    } finally {
      setUpdating(false)
      setShowRejectInput(false)
    }
  }

  function toggleCategory(catId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const totalItems = venue?.categories.reduce((s, c) => s + c.items.length, 0) ?? 0
  const unavailableItems = venue?.categories.reduce((s, c) => s + c.items.filter(i => !i.isAvailable).length, 0) ?? 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!venue) {
    return <p className="text-sm" style={{ color: '#7a748f' }}>Заведение не найдено</p>
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/admin')}
        className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
        style={{ color: '#7a748f' }}
      >
        <ArrowLeft size={15} />
        Все заведения
      </button>

      {/* Venue header */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: '#EAE7F8' }}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{venue.name}</h1>
              <span
                className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                style={{ color: STATUS_COLOR[venue.status], background: STATUS_BG[venue.status] }}
              >
                {STATUS_LABEL[venue.status]}
              </span>
            </div>
            <p className="text-sm mt-0.5" style={{ color: '#7a748f' }}>/{venue.slug}</p>
            {venue.address && <p className="text-xs mt-1" style={{ color: '#7a748f' }}>{venue.address}</p>}
            {venue.description && <p className="text-xs mt-1 italic" style={{ color: '#9a94af' }}>{venue.description}</p>}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <a
              href={`/menu/${venue.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
              style={{ background: 'rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
            >
              <Eye size={13} />
              Открыть меню
            </a>
            {venue.status !== 'APPROVED' && (
              <button
                onClick={() => setStatus('APPROVED')}
                disabled={updating}
                className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 transition-all active:scale-95"
                style={{ background: '#15803D', color: '#fff' }}
              >
                Одобрить
              </button>
            )}
            {venue.status !== 'REJECTED' && !showRejectInput && (
              <button
                onClick={() => setShowRejectInput(true)}
                disabled={updating}
                className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 transition-all active:scale-95"
                style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}
              >
                Отклонить
              </button>
            )}
            {showRejectInput && (
              <div className="flex gap-2 w-full mt-1">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Причина отклонения (опционально)"
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs outline-none"
                  style={{ background: '#fff', border: '0.5px solid rgba(220,38,38,0.3)', color: 'var(--color-text-primary)' }}
                  onKeyDown={e => e.key === 'Enter' && setStatus('REJECTED')}
                  autoFocus
                />
                <button
                  onClick={() => setStatus('REJECTED')}
                  disabled={updating}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50"
                  style={{ background: '#DC2626', color: '#fff' }}
                >
                  {updating ? '…' : 'Отклонить'}
                </button>
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="px-3 py-1.5 rounded-xl text-xs"
                  style={{ background: '#EAE7F8', color: '#7a748f' }}
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Owner info */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3"
          style={{ borderTop: '0.5px solid rgba(176,166,223,0.4)' }}
        >
          {[
            { label: 'Владелец', value: venue.owner.email },
            { label: 'Email', value: venue.owner.emailVerified ? '✓ Подтверждён' : '✗ Не подтверждён', color: venue.owner.emailVerified ? '#15803D' : '#DC2626' },
            { label: 'Импортов ТТК', value: `${venue.owner.ttkImportCount} из 3` },
            { label: 'Зарегистрирован', value: new Date(venue.owner.createdAt).toLocaleDateString('ru-RU') },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-xs" style={{ color: '#9a94af' }}>{label}</p>
              <p className="text-sm font-medium mt-0.5 truncate" style={{ color: color ?? 'var(--color-text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Menu stats */}
        <div
          className="flex gap-4 pt-3"
          style={{ borderTop: '0.5px solid rgba(176,166,223,0.4)' }}
        >
          <div>
            <p className="text-xs" style={{ color: '#9a94af' }}>Категорий</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{venue.categories.length}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: '#9a94af' }}>Позиций</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{totalItems}</p>
          </div>
          {unavailableItems > 0 && (
            <div>
              <p className="text-xs" style={{ color: '#9a94af' }}>Скрыто</p>
              <p className="text-sm font-semibold" style={{ color: '#B45309' }}>{unavailableItems}</p>
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      {venue.categories.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: '#EAE7F8' }}
        >
          <p className="text-sm" style={{ color: '#9a94af' }}>Меню пустое — владелец ещё не добавил категории</p>
        </div>
      ) : (
        <div className="space-y-3">
          {venue.categories.map(cat => (
            <div key={cat.id} className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(176,166,223,0.35)' }}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:opacity-80"
                style={{ background: '#EAE7F8' }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{cat.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(176,166,223,0.3)', color: '#7a748f' }}>
                    {cat.items.length}
                  </span>
                </div>
                {expanded.has(cat.id)
                  ? <ChevronDown size={15} style={{ color: '#9a94af' }} />
                  : <ChevronRight size={15} style={{ color: '#9a94af' }} />
                }
              </button>

              {/* Items */}
              {expanded.has(cat.id) && (
                <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.2)' }}>
                  {cat.items.length === 0 ? (
                    <p className="px-5 py-3 text-xs" style={{ color: '#9a94af' }}>Нет позиций</p>
                  ) : cat.items.map(item => (
                    <div
                      key={item.id}
                      className="px-5 py-3 flex items-start gap-4"
                      style={{ background: item.isAvailable ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: item.isAvailable ? 1 : 0.55 }}
                    >
                      {/* Photo */}
                      {item.photo ? (
                        <img src={item.photo} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ background: 'rgba(176,166,223,0.15)' }}>
                          <span className="text-lg">🍽</span>
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.name}</p>
                          {!item.isAvailable && (
                            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.06)', color: '#9a94af' }}>
                              <EyeOff size={10} /> скрыто
                            </span>
                          )}
                          {item.price != null && (
                            <span className="text-xs font-medium ml-auto" style={{ color: 'var(--color-text-primary)' }}>
                              {item.price} ₽
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#9a94af' }}>{item.description}</p>
                        )}
                        {/* Nutrition */}
                        {(item.calories > 0 || item.protein > 0) && (
                          <div className="flex gap-3 mt-1.5 flex-wrap">
                            {item.weight > 0 && (
                              <span className="text-xs" style={{ color: '#9a94af' }}>{item.weight} {item.weightUnit}</span>
                            )}
                            {item.calories > 0 && (
                              <span className="text-xs" style={{ color: '#9a94af' }}>{Math.round(item.calories)} ккал</span>
                            )}
                            {[['Б', item.protein], ['Ж', item.fat], ['У', item.carbs]].map(([label, val]) =>
                              Number(val) > 0 ? (
                                <span key={String(label)} className="text-xs" style={{ color: '#9a94af' }}>
                                  {label}: {Number(val).toFixed(1)}г
                                </span>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
