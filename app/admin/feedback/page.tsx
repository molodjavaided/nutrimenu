'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, X, MessageSquare } from 'lucide-react'

type Status = 'new' | 'triaged' | 'resolved' | 'wontfix'
type Source = 'OWNER' | 'GUEST'
type Category = 'bug' | 'idea' | 'question' | 'billing' | 'other'
type Role = 'OWNER' | 'ADMIN'

interface Feedback {
  id: string
  createdAt: string
  source: Source
  category: Category
  message: string
  rating: number | null
  email: string | null
  pageUrl: string | null
  status: Status
  note: string | null
  venueId: string | null
  venue: { id: string; name: string; slug: string } | null
  lastReplyAt: string | null
  adminUnread: boolean
  ownerUnread: boolean
}

interface Reply {
  id: string
  authorRole: Role
  message: string
  createdAt: string
}

interface ThreadDetail extends Feedback {
  replies: Reply[]
}

const STATUS_LABEL: Record<Status, string> = { new: 'Новое', triaged: 'В работе', resolved: 'Решено', wontfix: 'Не будет' }
const STATUS_COLOR: Record<Status, string> = { new: '#B45309', triaged: '#7C3AED', resolved: '#15803D', wontfix: '#7a748f' }
const CATEGORY_ICON: Record<Category, string> = { bug: '🐛', idea: '💡', question: '❓', billing: '💳', other: '💬' }

export default function AdminFeedbackPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<Status | ''>('')
  const [source, setSource] = useState<Source | ''>('')
  const [category, setCategory] = useState<Category | ''>('')
  const [q, setQ] = useState('')
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    if (source) p.set('source', source)
    if (category) p.set('category', category)
    if (q.trim()) p.set('q', q.trim())
    return p.toString()
  }, [status, source, category, q])

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'feedback', queryString],
    queryFn: () => fetch(`/api/admin/feedback?${queryString}`).then(r => r.json() as Promise<Feedback[]>),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: Status }) =>
      fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/feedback/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })

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
          { v: 'billing', label: '💳 Тариф' },
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

      {isLoading ? (
        <p className="text-sm" style={{ color: '#7a748f' }}>Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-sm" style={{ color: '#7a748f' }}>Нет отзывов под фильтр</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => {
            const lowRating = item.rating !== null && item.rating < 3
            const isBilling = item.category === 'billing'
            return (
              <div
                key={item.id}
                className="rounded-2xl px-5 py-4"
                style={{
                  background: isBilling ? 'rgba(124,58,237,0.08)' : lowRating ? 'rgba(220,38,38,0.06)' : '#EAE7F8',
                  border: isBilling ? '1px solid rgba(124,58,237,0.25)' : lowRating ? '1px solid rgba(220,38,38,0.25)' : 'none',
                }}
              >
                <div className="flex items-start gap-3 mb-2 flex-wrap">
                  <span className="text-lg leading-none">{CATEGORY_ICON[item.category]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: '#7a748f' }}>
                      {item.source === 'OWNER' ? 'Владелец' : 'Гость'}
                      {item.venue ? ` · ${item.venue.name}` : ''}
                      {item.email ? ` · ${item.email}` : ''}
                      {item.rating ? ` · ${'⭐'.repeat(item.rating)}` : ''}
                      {item.adminUnread && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: '#DC2626', color: '#fff' }}
                        >НОВОЕ</span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7a748f' }}>
                      {new Date(item.createdAt).toLocaleString('ru-RU')}
                      {item.lastReplyAt && ` · последний ответ ${new Date(item.lastReplyAt).toLocaleString('ru-RU')}`}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                    style={{ color: STATUS_COLOR[item.status], background: 'rgba(255,255,255,0.6)' }}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>

                <p className="text-sm whitespace-pre-wrap mb-3 line-clamp-3" style={{ color: '#2C2950' }}>
                  {item.message}
                </p>

                <div className="flex gap-2 flex-wrap">
                  {item.source === 'OWNER' && (
                    <button
                      onClick={() => setOpenThreadId(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                      style={{ background: '#2C2950', color: '#FEFEF2' }}
                    >
                      <MessageSquare size={12} /> Открыть переписку
                    </button>
                  )}
                  {(['new', 'triaged', 'resolved', 'wontfix'] as Status[])
                    .filter(s => s !== item.status)
                    .map(s => (
                      <button
                        key={s}
                        onClick={() => statusMutation.mutate({ id: item.id, next: s })}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.6)', color: STATUS_COLOR[s] }}
                      >
                        → {STATUS_LABEL[s]}
                      </button>
                    ))}
                  <button
                    onClick={() => { if (confirm('Удалить отзыв?')) deleteMutation.mutate(item.id) }}
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

      {openThreadId && (
        <ThreadDrawer id={openThreadId} onClose={() => setOpenThreadId(null)} />
      )}
    </>
  )
}

function ThreadDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [reply, setReply] = useState('')

  const { data: thread, isLoading } = useQuery({
    queryKey: ['admin', 'thread', id],
    queryFn: () => fetch(`/api/feedback/${id}`).then(r => r.json() as Promise<ThreadDetail>),
  })

  const replyMutation = useMutation({
    mutationFn: (message: string) =>
      fetch(`/api/feedback/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => {
      setReply('')
      qc.invalidateQueries({ queryKey: ['admin', 'thread', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'feedback'] })
    },
  })

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['admin', 'feedback'] })
  }, [thread, qc])

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] flex flex-col shadow-2xl"
        style={{ background: '#FEFEF2' }}
      >
        <header className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: '0.5px solid #EAE7F8' }}>
          <h2 className="font-semibold text-sm flex-1" style={{ color: '#2C2950' }}>
            Переписка с владельцем
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#7a748f' }}>
            <X size={18} />
          </button>
        </header>

        {isLoading || !thread ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <Bubble role="OWNER" message={thread.message} createdAt={thread.createdAt} category={thread.category} isRoot />
              {thread.replies.map(r => (
                <Bubble key={r.id} role={r.authorRole} message={r.message} createdAt={r.createdAt} />
              ))}
            </div>
            <div className="px-4 py-3" style={{ borderTop: '0.5px solid #EAE7F8' }}>
              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) replyMutation.mutate(reply.trim()) }}
                  placeholder="Ваш ответ владельцу…"
                  rows={3}
                  className="flex-1 px-3 py-2 rounded-2xl text-sm outline-none resize-none"
                  style={{ background: '#EAE7F8', color: '#2C2950' }}
                />
                <button
                  onClick={() => reply.trim() && replyMutation.mutate(reply.trim())}
                  disabled={replyMutation.isPending || reply.trim().length === 0}
                  className="p-2.5 rounded-2xl disabled:opacity-40 transition-all"
                  style={{ background: '#2C2950', color: '#FEFEF2' }}
                ><Send size={16} /></button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#9D99B8' }}>Ctrl+Enter — отправить</p>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

function Bubble({ role, message, createdAt, category, isRoot }: {
  role: Role
  message: string
  createdAt: string
  category?: Category
  isRoot?: boolean
}) {
  const isAdmin = role === 'ADMIN'
  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] space-y-1">
        <p className="text-xs px-1" style={{ color: '#9D99B8' }}>
          {isAdmin ? 'Вы (админ)' : 'Владелец'} · {new Date(createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
        <div
          className="px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words"
          style={{
            background: isAdmin ? '#2C2950' : '#EAE7F8',
            color: isAdmin ? '#FEFEF2' : '#2C2950',
          }}
        >
          {isRoot && category && (
            <span className="text-xs opacity-70 block mb-1">{CATEGORY_ICON[category]} {category}</span>
          )}
          {message}
        </div>
      </div>
    </div>
  )
}

function Select({
  value, onChange, options,
}: {
  value: string; onChange: (v: string) => void; options: { v: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-xl text-sm outline-none"
      style={{ background: '#EAE7F8', color: '#2C2950' }}
    >
      {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
  )
}
