'use client'

import { motion } from 'motion/react'
import { SMOOTH } from '@/lib/motion'

interface LevelToggleProps {
  title: string
  hint?: string
  badge?: string
  open: boolean
  onToggle: () => void
  dataTour?: string
}

/**
 * Заголовок-переключатель уровня формы. Один индикатор — шеврон справа,
 * поворачивается при раскрытии. Контент уровня раскрывается ВНИЗ под этим
 * заголовком (см. ItemForm). Свёрнут = пунктир-приглашение, раскрыт = сплошная рамка.
 */
export function LevelToggleHeader({ title, hint, badge, open, onToggle, dataTour }: LevelToggleProps) {
  return (
    <button
      type="button"
      data-tour={dataTour}
      onClick={onToggle}
      aria-expanded={open}
      className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.99] hover:border-[rgba(139,92,246,0.5)] flex items-center gap-3"
      style={{
        background: 'var(--surface-2)',
        border: open ? '0.5px solid rgba(139,92,246,0.22)' : '1px dashed rgba(139,92,246,0.35)',
        boxShadow: 'var(--shadow-soft-xs)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
          {badge && (
            <span
              className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
            >
              {badge}
            </span>
          )}
        </div>
        {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
      </div>
      <motion.span
        animate={{ rotate: open ? 0 : -90 }}
        transition={SMOOTH}
        className="shrink-0"
        style={{ color: '#7C3AED' }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M5 7l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.span>
    </button>
  )
}
