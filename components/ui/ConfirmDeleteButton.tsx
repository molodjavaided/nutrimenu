'use client'

import { useState } from 'react'

export function ConfirmDeleteButton({ onConfirm, title = 'Удалить', confirmLabel = 'Удалить', cancelLabel = 'Отмена' }: {
  onConfirm: () => void
  title?: string
  confirmLabel?: string
  cancelLabel?: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => { onConfirm(); setConfirming(false) }}
          className="px-2 h-7 rounded-lg text-xs font-medium"
          style={{ background: '#E24B4A', color: '#fff' }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 h-7 rounded-lg text-xs"
          style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
        >
          {cancelLabel}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
      style={{ color: 'var(--color-text-secondary)' }}
      title={title}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}
