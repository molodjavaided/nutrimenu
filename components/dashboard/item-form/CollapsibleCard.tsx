'use client'

import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GlassCard } from '@/components/ui-kit'

/**
 * Сворачиваемая секция-карточка: заголовок-кнопка раскрывает/сворачивает тело.
 * Заполнил поля → свернул, чтобы не мешалось; в свёрнутом виде показывает summary.
 *
 * Анимация — единая «плавная» кривая проекта (SMOOTH). По мере роста числа
 * раскрытий стоит вынести пресеты движения в общий каталог.
 * TODO(animation-system): каталог motion-пресетов (collapse / fade-slide / stagger / tap).
 */
const SMOOTH = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const }

interface CollapsibleCardProps {
  title: string
  /** Подсказка под заголовком, когда раскрыто. */
  hint?: string
  /** Компактная сводка под заголовком, когда свёрнуто. */
  summary?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export default function CollapsibleCard({ title, hint, summary, defaultOpen = true, children }: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <GlassCard tone="solid" padding="lg">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
          {open
            ? hint && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
            : summary != null && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>{summary}</p>}
        </div>
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={SMOOTH}
          className="shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SMOOTH}
            style={{ overflow: 'hidden' }}
          >
            <div className="pt-4 [&>*:last-child]:mb-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
