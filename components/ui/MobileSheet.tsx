'use client'

import { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  /** Заголовок в шапке (рядом с ✕). Если не задан — шапка не рендерится. */
  title?: ReactNode
  /** Произвольный футер (sticky внизу). Под него безопасно ставить padding-bottom. */
  footer?: ReactNode
  /** z-index. Для вложенных модалок передавайте более высокое значение. По умолчанию 60. */
  zIndex?: number
  /** Максимальная ширина на десктопе. По умолчанию 'lg' (≈512px). */
  desktopWidth?: 'sm' | 'md' | 'lg' | 'xl'
  /** Доп. класс для области body (под шапкой, над футером). */
  bodyClassName?: string
  children: ReactNode
}

const DESKTOP_WIDTH_CLASS: Record<NonNullable<Props['desktopWidth']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
}

/**
 * Единая обёртка для модалок: на мобильном — full-screen sheet (100dvh, без палочки, с safe-area),
 * на десктопе — центрированная карточка с rounded-2xl.
 *
 * Не контролирует focus — autoFocus НИГДЕ не делаем (mobile-first invariant: клавиатура
 * не должна выпрыгивать сама, см. feedback_mobile_first_invariant).
 *
 * Использование:
 *   <MobileSheet open={open} onClose={close} title="..." footer={...}>
 *     scrollable body
 *   </MobileSheet>
 */
export default function MobileSheet({
  open,
  onClose,
  title,
  footer,
  zIndex = 60,
  desktopWidth = 'lg',
  bodyClassName = '',
  children,
}: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-stretch sm:items-center justify-center"
      style={{
        zIndex,
        background: 'rgba(44,41,80,0.45)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`w-full ${DESKTOP_WIDTH_CLASS[desktopWidth]} flex flex-col overflow-hidden h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl`}
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {title !== undefined && (
          <div
            className="flex items-center justify-between px-5 pt-4 pb-4 shrink-0"
            style={{ borderBottom: '0.5px solid rgba(176,166,223,0.2)' }}
          >
            <p className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </p>
            <button
              onClick={onClose}
              className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'rgba(139,92,246,0.08)', color: '#7C3AED' }}
              aria-label="Закрыть"
            >✕</button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0" style={{ borderTop: '0.5px solid rgba(176,166,223,0.2)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
