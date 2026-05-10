'use client'

import { useState } from 'react'
import { toast } from 'sonner'

type Category = 'bug' | 'idea' | 'question' | 'other'
type Source = 'OWNER' | 'GUEST'

interface Props {
  open: boolean
  onClose: () => void
  source: Source
  venueSlug?: string
}

const CATEGORIES: { id: Category; icon: string; label: string }[] = [
  { id: 'bug', icon: '🐛', label: 'Баг' },
  { id: 'idea', icon: '💡', label: 'Идея' },
  { id: 'question', icon: '❓', label: 'Вопрос' },
  { id: 'other', icon: '💬', label: 'Другое' },
]

export default function FeedbackModal({ open, onClose, source, venueSlug }: Props) {
  const [category, setCategory] = useState<Category>(source === 'GUEST' ? 'other' : 'bug')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  async function submit() {
    if (message.trim().length < 3) {
      toast.error('Опишите подробнее')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          category,
          message: message.trim(),
          rating: source === 'GUEST' && rating ? rating : undefined,
          email: source === 'GUEST' && email ? email.trim() : undefined,
          pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
          venueSlug,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Не удалось отправить')
        return
      }
      toast.success('Спасибо! Мы получили ваш отзыв')
      setMessage('')
      setRating(null)
      setEmail('')
      onClose()
    } catch {
      toast.error('Нет соединения')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6"
        style={{ background: '#FEFEF2' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: '#2C2950' }}>
            {source === 'OWNER' ? 'Обратная связь' : 'Оставить отзыв'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: '#7a748f' }}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
              style={{
                background: category === c.id ? '#2C2950' : '#EAE7F8',
                color: category === c.id ? '#FEFEF2' : '#2C2950',
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {source === 'GUEST' && (
          <div className="mb-4">
            <p className="text-xs mb-2" style={{ color: '#7a748f' }}>Оценка (необязательно)</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(rating === n ? null : n)}
                  className="text-2xl transition-transform active:scale-90"
                  style={{ opacity: rating && n <= rating ? 1 : 0.25 }}
                  aria-label={`${n} звёзд`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={source === 'OWNER' ? 'Что не работает или что хотелось бы улучшить?' : 'Расскажите, что вам понравилось или что можно улучшить'}
          rows={5}
          maxLength={4000}
          className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
          style={{ background: '#EAE7F8', color: '#2C2950' }}
        />

        {source === 'GUEST' && (
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email для ответа (необязательно)"
            maxLength={200}
            className="w-full mt-3 px-4 py-3 rounded-2xl text-sm outline-none"
            style={{ background: '#EAE7F8', color: '#2C2950' }}
          />
        )}

        <button
          onClick={submit}
          disabled={submitting || message.trim().length < 3}
          className="w-full mt-4 py-3 rounded-2xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
          style={{ background: '#2C2950', color: '#FEFEF2' }}
        >
          {submitting ? 'Отправка…' : 'Отправить'}
        </button>
      </div>
    </div>
  )
}
