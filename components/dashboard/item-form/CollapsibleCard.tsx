'use client'

import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GlassCard } from '@/components/ui-kit'
import { SMOOTH, REVEAL } from '@/lib/motion'

/**
 * Сворачиваемая секция-карточка: заголовок-кнопка раскрывает/сворачивает тело.
 * Заполнил → свернул, чтобы не мешалось; в свёрнутом виде показывает summary.
 * По умолчанию управляет состоянием сам; если переданы open/onToggle — controlled
 * (состояние снаружи, напр. от режима формы). Анимация — кривая REVEAL.
 */
interface CollapsibleCardProps {
  title: string
  /** Подсказка под заголовком, когда раскрыто. */
  hint?: string
  /** Компактная сводка под заголовком, когда свёрнуто. */
  summary?: ReactNode
  badge?: string
  tone?: 'solid' | 'tinted'
  defaultOpen?: boolean
  /** Controlled: если задан, секция управляется снаружи через onToggle. */
  open?: boolean
  onToggle?: () => void
  dataTour?: string
  children: ReactNode
}

export default function CollapsibleCard({
  title,
  hint,
  summary,
  badge,
  tone = 'solid',
  defaultOpen = true,
  open: controlledOpen,
  onToggle,
  dataTour,
  children,
}: CollapsibleCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  // overflow: hidden во время анимации (чистый рост height), visible после —
  // иначе обрезается tour-свечение и всплывающие панели внутри тела.
  const [overflowVisible, setOverflowVisible] = useState(false)

  const toggle = () => {
    if (isControlled) onToggle?.()
    else setInternalOpen(o => !o)
  }

  return (
    <GlassCard tone={tone} padding="lg">
      <button
        type="button"
        data-tour={dataTour}
        onClick={toggle}
        className="w-full flex items-center gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
            {badge && (
              <span
                className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
              >
                {badge}
              </span>
            )}
          </div>
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
            transition={REVEAL}
            onAnimationStart={() => setOverflowVisible(false)}
            onAnimationComplete={() => setOverflowVisible(true)}
            style={{ overflow: overflowVisible ? 'visible' : 'hidden' }}
          >
            <div className="pt-4 [&>*:last-child]:mb-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
