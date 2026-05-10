'use client'

import { useEffect, useMemo, useState } from 'react'

type Status = 'new' | 'triaged' | 'resolved' | 'wontfix'
type Source = 'OWNER' | 'GUEST'
type Category = 'bug' | 'idea' | 'question' | 'other'

interface Feedback {
  id: string
  createdAt: string
  source: Source
  category: Category
  message: string
  rating: number | null
  email: string | null
  pageUrl: string | null
  userAgent: string | null
  status: Status
  note: string | null
  venueId: string | null
  venue: { id: string; name: string; slug: string } | null
}

const STATUS_LABEL: Record<Status, string> = {
  new: 'Новое',
  triaged: 'В работе',
  resolved: 'Решено',
  wontfix: 'Не будет',
}

const STATUS_COLOR: Record<Status, string> = {
  new: '#B45309',
  triaged: '#7C3AED',
  resolved: '#15803D',
  wontfix: '#7a748f',
}

const CATEGORY_ICON: Record<Category, string> = {
  bug: '🐛',
  idea: '💡',
  question: '❓',
  other: '💬',
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<Status | ''>('new')
  const [source, setSource] = useState<Source | ''>('')
  const [category, setCategory] = useState<Category | ''>('')
  const [q, setQ] = useState('')

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    if (source) p.set('source', source)
    if (category) p.set('category', category)
    if (q.trim()) p.set('q', q.trim())
    return p.toString()
  }, [status, source, category, q])

  useEffect(() => {
    setLoading(true)
    const ctrl = new AbortController()
    fetch(`/api/admin/feedback?${queryString}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : [])
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [queryString])

  async function updateStatus(id: string, next: Status) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: next } : i))
    await fetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
  }

  async function deleteItem(id: string) {
    if (!confirm('Удалить отзыв?')) return
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE' })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Обратная связь</h1>
        <span className="text-sm" style={{ color: '#7a748f' }}>{items.length} {items.length === 1 ? 'отзыв' : 'отзывов'}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <Select value={status} onChange={v => setStatus(v as Status | '')} options={[
          { v: '', label: 'Все статусы' },
          { v: 'new', label: 'Новое' },
          { v: 'triaged', label: 'В работе' },
          { v: 'resolved', label: 'Решено' },
          { v: 'wontfix', label: 'Не будет' },
        ]} />
        <Select value={source} onChange={v => setSource(v as Source | '')} options={[
          { v: '', label: 'Все источники' },
          { v: 'OWNER', label: 'Владельцы' },
          { v: 'GUEST', label: 'Гости' },
        ]} />
        <Select value={category} onChange={v => setCategory(v as Category | '')} options={[
          { v: '', label: 'Все категории' },
          { v: 'bug', label: '🐛 Баги' },
          { v: 'idea', label: '💡 Идеи' },
          { v: 'question', label: '❓ Вопросы' },
          { v: 'other', label: '💬 Другое' },
        ]} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Поиск по тексту…"
          className="px-3 py-1.5 rounded-xl text-sm outline-none flex-1 min-w-[180px]"
          style={{ background: '#EAE7F8', color: '#2C2950' }}
        />
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: '#7a748f' }}>Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-sm" style={{ color: '#7a748f' }}>Нет отзывов под фильтр</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => {
            const lowRating = item.rating !== null && item.rating < 3
            return (
              <div
                key={item.id}
                className="rounded-2xl px-5 py-4"
                style={{
                  background: lowRating ? 'rgba(220,38,38,0.06)' : '#EAE7F8',
                  border: lowRating ? '1px solid rgba(220,38,38,0.25)' : 'none',
                }}
              >
                <div className="flex items-start gap-3 mb-2 flex-wrap">
                  <span className="text-lg leading-none">{CATEGORY_ICON[item.category]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: '#7a748f' }}>
                      {item.source === 'OWNER' ? 'Владелец' : 'Гость'}
                      {item.venue ? ` · ${item.venue.name}` : ''}
                      {item.email ? ` · ${item.email}` : ''}
                      {item.rating ? ` · ${'⭐'.repeat(item.rating)}` : ''}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7a748f' }}>
                      {new Date(item.createdAt).toLocaleString('ru-RU')}
                      {item.pageUrl ? ` · ${item.pageUrl}` : ''}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                    style={{ color: STATUS_COLOR[item.status], background: 'rgba(255,255,255,0.6)' }}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>

                <p className="text-sm whitespace-pre-wrap mb-3" style={{ color: '#2C2950' }}>
                  {item.message}
                </p>

                <div className="flex gap-2 flex-wrap">
                  {(['new', 'triaged', 'resolved', 'wontfix'] as Status[])
                    .filter(s => s !== item.status)
                    .map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(item.id, s)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.6)', color: STATUS_COLOR[s] }}
                      >
                        → {STATUS_LABEL[s]}
                      </button>
                    ))}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ml-auto"
                    style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { v: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-xl text-sm outline-none"
      style={{ background: '#EAE7F8', color: '#2C2950' }}
    >
      {options.map(o => (
        <option key={o.v} value={o.v}>{o.label}</option>
      ))}
    </select>
  )
}
