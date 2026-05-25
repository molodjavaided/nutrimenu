'use client'

import { useState, type ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

/**
 * Свёрнутый блок-подсказка с иконкой ⓘ. Раскрывается по клику.
 * Используется для объяснения концептов формы без визуального шума по умолчанию.
 */
export function HelpHint({ title, children, defaultOpen = false, className }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M7 6.5v3M7 4.5v.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {title} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div
          className="mt-2 text-xs space-y-2 p-3 rounded-lg"
          style={{ background: 'rgba(139,92,246,0.06)', color: 'var(--color-text-secondary)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
