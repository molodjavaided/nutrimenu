'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronRight, Eye, EyeOff, Copy, Check } from 'lucide-react'

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
  updatedAt: string
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
  adminNote: string | null
  createdAt: string
  updatedAt: string
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

  // Admin note
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  // Password reset
  const [resettingPwd, setResettingPwd] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Verify email
  const [verifying, setVerifying] = useState(false)

  // Delete
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/venues/${id}/menu`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setVenue(data)
        setNote(data?.adminNote ?? '')
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (venue) setExpanded(new Set(venue.categories.map(c => c.id)))
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
    }
  }

  async function saveNote() {
    setSavingNote(true)
    try {
      await fetch(`/api/admin/venues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: note }),
      })
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    } finally {
      setSavingNote(false)
    }
  }

  async function verifyEmail() {
    setVerifying(true)
    try {
      const res = await fetch(`/api/admin/venues/${id}/verify-email`, { method: 'POST' })
      if (res.ok) setVenue(prev => prev ? { ...prev, owner: { ...prev.owner, emailVerified: true } } : prev)
    } finally {
      setVerifying(false)
    }
  }

  async function generateResetLink() {
    setResettingPwd(true)
    try {
      const res = await fetch(`/api/admin/venues/${id}/reset-password`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setResetLink(data.link)
      }
    } finally {
      setResettingPwd(false)
    }
  }

  async function copyLink() {
    if (!resetLink) return
    await navigator.clipboard.writeText(resetLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function deleteVenue() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/venues/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/admin')
    } finally {
      setDeleting(false)
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

  // Last updated: most recent item updatedAt
  const lastItemUpdate = venue?.categories
    .flatMap(c => c.items)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]?.updatedAt

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
    <div className="space-y-5">
      {/* Delete modal */}
      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleting && setShowDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
            style={{ background: '#FEFEF2' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold mb-1" style={{ color: '#2C2950' }}>Удалить заведение?</h3>
            <p className="text-sm mb-1" style={{ color: '#6B6490' }}>
              <span className="font-medium" style={{ color: '#2C2950' }}>{venue.name}</span>
            </p>
            <p className="text-xs mb-5" style={{ color: '#9D99B8' }}>
              Владелец {venue.owner.email} и все данные меню будут удалены безвозвратно.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#EAE7F8', color: '#6B6490' }}
              >
                Отмена
              </button>
              <button
                onClick={deleteVenue}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: '#DC2626', color: '#fff' }}
              >
                {deleting ? '…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => router.push('/admin')}
        className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
        style={{ color: '#9D99B8' }}
      >
        <ArrowLeft size={15} />
        Все заведения
      </button>

      {/* Venue header */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: '#EAE7F8' }}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold" style={{ color: '#2C2950' }}>{venue.name}</h1>
              <select
                value={venue.status}
                disabled={updating}
                onChange={e => setStatus(e.target.value as VenueStatus)}
                className="px-2.5 py-1 rounded-xl text-xs font-medium outline-none cursor-pointer disabled:opacity-50"
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
            </div>
            <p className="text-sm mt-0.5" style={{ color: '#9D99B8' }}>/{venue.slug}</p>
            {venue.address && <p className="text-xs mt-1" style={{ color: '#9D99B8' }}>{venue.address}</p>}
            {venue.description && <p className="text-xs mt-1 italic" style={{ color: '#B0A6DF' }}>{venue.description}</p>}
          </div>

          <div className="flex gap-2 flex-wrap">
            <a
              href={`/menu/${venue.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
              style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}
            >
              <Eye size={13} />
              Открыть меню
            </a>
            <button
              onClick={() => setShowDelete(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
            >
              Удалить
            </button>
          </div>
        </div>

        {/* Owner info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3" style={{ borderTop: '0.5px solid rgba(176,166,223,0.4)' }}>
          {[
            { label: 'Владелец', value: venue.owner.email },
            { label: 'Email', value: venue.owner.emailVerified ? '✓ Подтверждён' : '✗ Не подтверждён', color: venue.owner.emailVerified ? '#15803D' : '#DC2626', action: !venue.owner.emailVerified ? (
            <button
              onClick={verifyEmail}
              disabled={verifying}
              className="mt-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
              style={{ background: 'rgba(21,128,61,0.12)', color: '#15803D' }}
            >
              {verifying ? '…' : 'Подтвердить'}
            </button>
          ) : null },
            { label: 'Импортов ТТК', value: `${venue.owner.ttkImportCount} из 1` },
            { label: 'Зарегистрирован', value: new Date(venue.owner.createdAt).toLocaleDateString('ru-RU') },
          ].map(({ label, value, color, action }) => (
            <div key={label}>
              <p className="text-xs" style={{ color: '#9D99B8' }}>{label}</p>
              <p className="text-sm font-medium mt-0.5 truncate" style={{ color: (color as string | undefined) ?? '#2C2950' }}>{value}</p>
              {(action as React.ReactNode | null | undefined) ?? null}
            </div>
          ))}
        </div>

        {/* Activity log */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3" style={{ borderTop: '0.5px solid rgba(176,166,223,0.4)' }}>
          <div>
            <p className="text-xs" style={{ color: '#9D99B8' }}>Категорий</p>
            <p className="text-sm font-semibold" style={{ color: '#2C2950' }}>{venue.categories.length}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: '#9D99B8' }}>Позиций</p>
            <p className="text-sm font-semibold" style={{ color: '#2C2950' }}>{totalItems}</p>
          </div>
          {unavailableItems > 0 && (
            <div>
              <p className="text-xs" style={{ color: '#9D99B8' }}>Скрыто</p>
              <p className="text-sm font-semibold" style={{ color: '#B45309' }}>{unavailableItems}</p>
            </div>
          )}
          <div>
            <p className="text-xs" style={{ color: '#9D99B8' }}>Создано</p>
            <p className="text-sm font-semibold" style={{ color: '#2C2950' }}>
              {new Date(venue.createdAt).toLocaleDateString('ru-RU')}
            </p>
          </div>
          {lastItemUpdate && (
            <div>
              <p className="text-xs" style={{ color: '#9D99B8' }}>Последнее изменение</p>
              <p className="text-sm font-semibold" style={{ color: '#2C2950' }}>
                {new Date(lastItemUpdate).toLocaleDateString('ru-RU')}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs" style={{ color: '#9D99B8' }}>Меню обновлено</p>
            <p className="text-sm font-semibold" style={{ color: '#2C2950' }}>
              {new Date(venue.updatedAt).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
      </div>

      {/* Admin tools row */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Admin note */}
        <div className="rounded-2xl p-4 space-y-2.5" style={{ background: '#EAE7F8' }}>
          <p className="text-xs font-semibold" style={{ color: '#9D99B8' }}>ЗАМЕТКА АДМИНИСТРАТОРА</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Внутренние заметки — видны только администраторам"
            rows={3}
            className="w-full text-sm rounded-xl px-3 py-2.5 resize-none outline-none"
            style={{ background: 'rgba(255,255,255,0.7)', color: '#2C2950', border: '0.5px solid rgba(176,166,223,0.4)' }}
          />
          <button
            onClick={saveNote}
            disabled={savingNote}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-60 flex items-center gap-1.5"
            style={{ background: noteSaved ? 'rgba(21,128,61,0.12)' : 'rgba(139,92,246,0.12)', color: noteSaved ? '#15803D' : '#7C3AED' }}
          >
            {noteSaved ? <><Check size={12} /> Сохранено</> : savingNote ? '…' : 'Сохранить заметку'}
          </button>
        </div>

        {/* Password reset */}
        <div className="rounded-2xl p-4 space-y-2.5" style={{ background: '#EAE7F8' }}>
          <p className="text-xs font-semibold" style={{ color: '#9D99B8' }}>СБРОС ПАРОЛЯ</p>
          <p className="text-xs" style={{ color: '#B0A6DF' }}>
            Генерирует ссылку для сброса пароля. Действительна 24 часа.
          </p>
          {resetLink ? (
            <div className="space-y-2">
              <div
                className="px-3 py-2 rounded-xl text-xs break-all select-all"
                style={{ background: 'rgba(255,255,255,0.7)', color: '#6B6490', border: '0.5px solid rgba(176,166,223,0.4)' }}
              >
                {resetLink}
              </div>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: copied ? 'rgba(21,128,61,0.12)' : 'rgba(139,92,246,0.12)', color: copied ? '#15803D' : '#7C3AED' }}
              >
                {copied ? <><Check size={12} /> Скопировано</> : <><Copy size={12} /> Скопировать ссылку</>}
              </button>
            </div>
          ) : (
            <button
              onClick={generateResetLink}
              disabled={resettingPwd}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-60"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
            >
              {resettingPwd ? '…' : 'Сгенерировать ссылку'}
            </button>
          )}
        </div>
      </div>

      {/* Menu */}
      <div>
        <p className="text-xs font-semibold mb-3" style={{ color: '#9D99B8' }}>МЕНЮ</p>
        {venue.categories.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#EAE7F8' }}>
            <p className="text-sm" style={{ color: '#9D99B8' }}>Меню пустое — владелец ещё не добавил категории</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {venue.categories.map(cat => (
              <div key={cat.id} className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(176,166,223,0.35)' }}>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:opacity-80"
                  style={{ background: '#EAE7F8' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: '#2C2950' }}>{cat.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(176,166,223,0.3)', color: '#9D99B8' }}>
                      {cat.items.length}
                    </span>
                  </div>
                  {expanded.has(cat.id)
                    ? <ChevronDown size={15} style={{ color: '#9D99B8' }} />
                    : <ChevronRight size={15} style={{ color: '#9D99B8' }} />
                  }
                </button>

                {expanded.has(cat.id) && (
                  <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.2)' }}>
                    {cat.items.length === 0 ? (
                      <p className="px-5 py-3 text-xs" style={{ color: '#9D99B8' }}>Нет позиций</p>
                    ) : cat.items.map(item => (
                      <div
                        key={item.id}
                        className="px-5 py-3 flex items-start gap-4"
                        style={{ background: item.isAvailable ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: item.isAvailable ? 1 : 0.55 }}
                      >
                        {item.photo ? (
                          <img src={item.photo} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ background: 'rgba(176,166,223,0.15)' }}>
                            <span className="text-lg">🍽</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium" style={{ color: '#2C2950' }}>{item.name}</p>
                            {!item.isAvailable && (
                              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.06)', color: '#9D99B8' }}>
                                <EyeOff size={10} /> скрыто
                              </span>
                            )}
                            {item.price != null && (
                              <span className="text-xs font-medium ml-auto" style={{ color: '#2C2950' }}>
                                {item.price} ₽
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#9D99B8' }}>{item.description}</p>
                          )}
                          {(item.calories > 0 || item.protein > 0) && (
                            <div className="flex gap-3 mt-1.5 flex-wrap">
                              {item.weight > 0 && (
                                <span className="text-xs" style={{ color: '#B0A6DF' }}>{item.weight} {item.weightUnit}</span>
                              )}
                              {item.calories > 0 && (
                                <span className="text-xs" style={{ color: '#B0A6DF' }}>{Math.round(item.calories)} ккал</span>
                              )}
                              {[['Б', item.protein], ['Ж', item.fat], ['У', item.carbs]].map(([label, val]) =>
                                Number(val) > 0 ? (
                                  <span key={String(label)} className="text-xs" style={{ color: '#B0A6DF' }}>
                                    {label}: {Number(val).toFixed(1)}г
                                  </span>
                                ) : null
                              )}
                            </div>
                          )}
                          <p className="text-xs mt-1" style={{ color: '#D8D4F0' }}>
                            обновлено {new Date(item.updatedAt).toLocaleDateString('ru-RU')}
                          </p>
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
    </div>
  )
}
