'use client'

import type { ReactNode } from 'react'

interface ExpanderProps {
  title: string
  hint: string
  onExpand: () => void
}

/**
 * CTA-карточка между уровнями формы. Приглашает раскрыть следующий уровень.
 * Не аккордеон — это активное приглашение «хочу точнее».
 */
export function LevelExpander({ title, hint, onExpand }: ExpanderProps) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.99] flex items-center gap-3"
      style={{
        background: 'rgba(255,255,255,0.45)',
        border: '1px dashed rgba(139,92,246,0.35)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 4v10M4 9l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
      </div>
      <span className="text-xs shrink-0" style={{ color: '#7C3AED' }}>Открыть →</span>
    </button>
  )
}

interface PanelProps {
  title: string
  badge?: string
  onCollapse: () => void
  collapseLabel?: string
  children: ReactNode
}

/**
 * Заголовок раскрытого уровня с кнопкой «↑ скрыть».
 */
export function LevelPanelHeader({ title, badge, onCollapse, collapseLabel = 'Скрыть' }: Omit<PanelProps, 'children'>) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-lg font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
        {badge && (
          <span
            className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
          >
            {badge}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onCollapse}
        className="text-xs inline-flex items-center gap-1 transition-colors shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M3 8l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {collapseLabel}
      </button>
    </div>
  )
}
