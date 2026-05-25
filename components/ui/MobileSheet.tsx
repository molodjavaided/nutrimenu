'use client'

import { ReactNode } from 'react'
import { Drawer } from './Drawer'

interface Props {
  open: boolean
  onClose: () => void
  /** Заголовок в шапке. Если не задан — шапка минимальная. */
  title?: ReactNode
  /** Произвольный футер (sticky внизу). */
  footer?: ReactNode
  /** z-index не используется — vaul управляет порядком сам через portal. Поддерживается для совместимости. */
  zIndex?: number
  /** Максимальная ширина на десктопе. По умолчанию 'lg' (≈512px). */
  desktopWidth?: 'sm' | 'md' | 'lg' | 'xl'
  /** Доп. класс для области body. */
  bodyClassName?: string
  children: ReactNode
}

const DESKTOP_WIDTH_CLASS: Record<NonNullable<Props['desktopWidth']>, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-md',
  lg: 'md:max-w-lg',
  xl: 'md:max-w-xl',
}

/**
 * Backward-compatible wrapper над vaul-Drawer.
 *
 * Раньше был самописный fixed-overlay. Теперь — vaul:
 * - Мобиле: bottom-sheet со свайпом вниз для закрытия
 * - Десктоп: центрированный модал
 *
 * API оставлен прежним, чтобы не трогать все 3 точки потребления.
 * Новый код пиши напрямую через `<Drawer />`.
 */
export default function MobileSheet({
  open,
  onClose,
  title,
  footer,
  desktopWidth = 'lg',
  bodyClassName,
  children,
}: Props) {
  return (
    <Drawer
      open={open}
      onOpenChange={v => { if (!v) onClose() }}
      title={typeof title === 'string' ? title : undefined}
      desktopMaxWidth={DESKTOP_WIDTH_CLASS[desktopWidth]}
      contentClassName={bodyClassName}
      footer={footer}
    >
      {/* Если title — ReactNode (не string), рендерим его в шапке руками,
          т.к. Drawer.title принимает только строку. */}
      {title && typeof title !== 'string' && (
        <div className="mb-3 -mt-1 text-base font-medium font-heading" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </div>
      )}
      {children}
    </Drawer>
  )
}
