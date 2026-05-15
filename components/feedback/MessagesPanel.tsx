'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import FeedbackModal from './FeedbackModal'
import { X, Send, ChevronLeft, MessageSquarePlus } from 'lucide-react'

type Category = 'bug' | 'idea' | 'question' | 'billing' | 'other'
type Status = 'new' | 'triaged' | 'resolved' | 'wontfix'
type Role = 'OWNER' | 'ADMIN'

interface ThreadSummary {
  id: string
  createdAt: string
  lastReplyAt: string | null
  category: Category
  status: Status
  message: string
  ownerUnread: boolean
  _count: { replies: number }
}

interface Reply {
  id: string
  authorRole: Role
  message: string
  createdAt: string
}

interface ThreadDetail {
  id: string
  category: Category
  status: Status
  message: string
  createdAt: string
  replies: Reply[]
}

const CATEGORY_ICON: Record<Category, string> = {
  bug: '🐛', idea: '💡', question: '❓', billing: '💳', other: '💬',
}
const STATUS_LABEL: Record<Status, string> = {
  new: 'Новое', triaged: 'В работе', resolved: 'Решено', wontfix: 'Закрыто',
}

const threadsKey = ['feedback', 'threads'] as const
const threadKey = (id: string) => ['feedback', 'thread', id] as const

interface Props {
  open: boolean
  onClose: () => void
  initialCategory?: Category
}

export default function MessagesPanel({ open, onClose, initialCategory }: Props) {
  const qc = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [replyText, setReplyText] = useState('')

  const { data: threads = [], isLoading } = useQuery({
    queryKey: threadsKey,
    queryFn: () => fetch('/api/feedback/threads').then(r => r.json() as Promise<ThreadSummary[]>),
    enabled: open,
  })

  const { data: thread } = useQuery({
    queryKey: threadKey(activeId ?? ''),
    queryFn: () => fetch(`/api/feedback/${activeId}`).then(r => r.json() as Promise<ThreadDetail>),
    enabled: open && !!activeId,
  })

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      fetch(`/api/feedback/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Ошибка')
        return r.json()
      }),
    onSuccess: () => {
      setReplyText('')
      if (activeId) qc.invalidateQueries({ queryKey: threadKey(activeId) })
      qc.invalidateQueries({ queryKey: threadsKey })
      qc.invalidateQueries({ queryKey: ['feedback', 'unread'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Open compose if requested via initialCategory and no threads exist
  useEffect(() => {
    if (open && initialCategory && !activeId && !showCompose) {
      setShowCompose(true)
    }
  }, [open, initialCategory, activeId, showCompose])

  async function openTelegramBot() {
    const r = await fetch('/api/telegram/start-link')
    if (!r.ok) {
      toast.error('Telegram-бот пока не настроен')
      return
    }
    const data = (await r.json()) as { url: string }
    window.open(data.url, '_blank')
  }

  if (!open) return null

  function sendReply() {
    if (!activeId || replyText.trim().length === 0) return
    replyMutation.mutate({ id: activeId, message: replyText.trim() })
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] flex flex-col shadow-2xl"
        style={{ background: '#FEFEF2' }}
      >
        <header
          className="flex items-center gap-2 px-4 py-3.5"
          style={{ borderBottom: '0.5px solid #EAE7F8' }}
        >
          {activeId ? (
            <button
              onClick={() => setActiveId(null)}
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: '#2C2950' }}
            ><ChevronLeft size={18} /></button>
          ) : null}
          <h2 className="font-semibold text-sm flex-1" style={{ color: '#2C2950' }}>
            {activeId ? 'Переписка с админом' : 'Сообщения'}
          </h2>
          {!activeId && threads.length > 0 && (
            <>
              <button
                onClick={openTelegramBot}
                title="Написать в Telegram-бота"
                aria-label="Написать в Telegram"
                className="flex items-center justify-center p-1.5 rounded-lg transition-all"
                style={{ background: '#229ED9', color: '#fff' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 7.5a2.25 2.25 0 0 0 .126 4.073l3.9 1.205 2.165 5.633a1.5 1.5 0 0 0 2.526.521l2.2-2.2 4.5 3.6a1.5 1.5 0 0 0 2.434-1.05l2.05-15.555a2.25 2.25 0 0 0-2.379-2.342Z"/>
                </svg>
              </button>
              <button
                onClick={() => setShowCompose(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: '#2C2950', color: '#FEFEF2' }}
              >
                <MessageSquarePlus size={13} /> Написать
              </button>
            </>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#7a748f' }}>
            <X size={18} />
          </button>
        </header>

        {!activeId ? (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {isLoading ? (
              <p className="text-center text-xs py-8" style={{ color: '#9D99B8' }}>Загрузка…</p>
            ) : threads.length === 0 ? (
              <div className="text-center py-8 px-2">
                <p className="text-sm mb-4" style={{ color: '#6B6490' }}>
                  Свяжитесь с админом — выберите канал
                </p>
                <button
                  onClick={openTelegramBot}
                  className="w-full mb-2 px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: '#229ED9', color: '#fff' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 7.5a2.25 2.25 0 0 0 .126 4.073l3.9 1.205 2.165 5.633a1.5 1.5 0 0 0 2.526.521l2.2-2.2 4.5 3.6a1.5 1.5 0 0 0 2.434-1.05l2.05-15.555a2.25 2.25 0 0 0-2.379-2.342Z"/>
                  </svg>
                  Telegram (быстрее)
                </button>
                <p className="text-xs mb-3" style={{ color: '#9D99B8' }}>
                  Бот задаст 5 вопросов и поможет прикрепить ТТК/фото
                </p>
                <button
                  onClick={() => setShowCompose(true)}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: '#EAE7F8', color: '#2C2950' }}
                >
                  Написать здесь в чате
                </button>
              </div>
            ) : (
              threads.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className="w-full text-left rounded-2xl px-4 py-3 transition-all hover:opacity-90"
                  style={{ background: t.ownerUnread ? 'rgba(139,92,246,0.15)' : '#EAE7F8' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{CATEGORY_ICON[t.category]}</span>
                    <span className="text-xs font-semibold" style={{ color: '#2C2950' }}>{STATUS_LABEL[t.status]}</span>
                    {t.ownerUnread && (
                      <span className="ml-auto w-2 h-2 rounded-full" style={{ background: '#7C3AED' }} />
                    )}
                  </div>
                  <p className="text-sm line-clamp-2" style={{ color: '#2C2950' }}>{t.message}</p>
                  <p className="text-xs mt-1" style={{ color: '#9D99B8' }}>
                    {new Date(t.lastReplyAt ?? t.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {t._count.replies > 0 && ` · ${t._count.replies} ${t._count.replies === 1 ? 'ответ' : 'ответов'}`}
                  </p>
                </button>
              ))
            )}
          </div>
        ) : !thread ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <Message authorRole="OWNER" message={thread.message} createdAt={thread.createdAt} category={thread.category} isRoot />
              {thread.replies.map(r => (
                <Message key={r.id} authorRole={r.authorRole} message={r.message} createdAt={r.createdAt} />
              ))}
            </div>
            <div className="px-4 py-3" style={{ borderTop: '0.5px solid #EAE7F8' }}>
              <div className="flex items-end gap-2">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply()
                  }}
                  placeholder="Ваш ответ…"
                  rows={2}
                  className="flex-1 px-3 py-2 rounded-2xl text-sm outline-none resize-none"
                  style={{ background: '#EAE7F8', color: '#2C2950' }}
                />
                <button
                  onClick={sendReply}
                  disabled={replyMutation.isPending || replyText.trim().length === 0}
                  className="p-2.5 rounded-2xl disabled:opacity-40 transition-all"
                  style={{ background: '#2C2950', color: '#FEFEF2' }}
                  aria-label="Отправить"
                ><Send size={16} /></button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#9D99B8' }}>Ctrl+Enter — отправить</p>
            </div>
          </>
        )}
      </aside>

      <FeedbackModal
        open={showCompose}
        source="OWNER"
        initialCategory={initialCategory}
        onClose={() => setShowCompose(false)}
        onSent={() => qc.invalidateQueries({ queryKey: threadsKey })}
      />
    </>
  )
}

function Message({ authorRole, message, createdAt, category, isRoot }: {
  authorRole: Role
  message: string
  createdAt: string
  category?: Category
  isRoot?: boolean
}) {
  const isOwner = authorRole === 'OWNER'
  return (
    <div className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] space-y-1">
        <p className="text-xs px-1" style={{ color: '#9D99B8' }}>
          {isOwner ? 'Вы' : 'Админ'} · {new Date(createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
        <div
          className="px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words"
          style={{
            background: isOwner ? '#2C2950' : '#EAE7F8',
            color: isOwner ? '#FEFEF2' : '#2C2950',
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
