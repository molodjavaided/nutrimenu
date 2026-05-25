'use client'

import { Drawer as VaulDrawer } from 'vaul'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Заголовок (для a11y и шапки). */
  title?: string
  /** Подзаголовок под title. */
  description?: string
  /** ARIA-лейбл если title не нужен визуально. */
  ariaLabel?: string
  /** Контент. */
  children: ReactNode
  /** Sticky-футер (Готово / Отмена). */
  footer?: ReactNode
  /** Дополнительные классы для контейнера контента. */
  contentClassName?: string
  /** На десктопе — ширина окна; на мобиле всегда fullscreen-bottom. */
  desktopMaxWidth?: string
}

/**
 * Универсальный Drawer на vaul.
 *
 * - Мобиле: bottom-sheet, свайп вниз → закрытие.
 * - Десктоп: центрированный модал с тем же контентом.
 *
 * Используется для всех owner-side модалок: опции блюда, пикер ингредиентов,
 * импорт меню. DishSheet (для гостя) трогать НЕ нужно — у него своя реализация
 * и юзер просил её сохранить.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  ariaLabel,
  children,
  footer,
  contentClassName,
  desktopMaxWidth = 'md:max-w-3xl',
}: DrawerProps) {
  return (
    <VaulDrawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <VaulDrawer.Portal>
        {/* Backdrop: лавандовый затемнитель с blur */}
        <VaulDrawer.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        />
        <VaulDrawer.Content
          aria-label={ariaLabel}
          className={cn(
            // Mobile: bottom sheet, скруглён сверху
            'fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl',
            'max-h-[92dvh]',
            // Desktop: центр, оба скругления, ограниченная ширина
            'md:bottom-auto md:left-1/2 md:top-1/2 md:right-auto md:-translate-x-1/2 md:-translate-y-1/2',
            'md:w-[calc(100vw-2rem)] md:rounded-2xl md:max-h-[88vh]',
            desktopMaxWidth,
            'outline-none overflow-hidden',
          )}
          style={{
            background: 'var(--surface-3)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: 'var(--shadow-soft-xl)',
            color: 'var(--color-text-primary)',
          }}
        >
          {/* Drag handle — только на мобиле */}
          <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
            <div
              aria-hidden
              className="w-12 h-1.5 rounded-full"
              style={{ background: 'rgba(139,92,246,0.25)' }}
            />
          </div>

          {/* Header */}
          {(title || description) && (
            <div className="px-4 md:px-6 pt-2 md:pt-5 pb-3 shrink-0">
              {title && (
                <VaulDrawer.Title className="font-heading text-lg md:text-xl font-medium tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {title}
                </VaulDrawer.Title>
              )}
              {description && (
                <VaulDrawer.Description className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {description}
                </VaulDrawer.Description>
              )}
            </div>
          )}

          {/* Content (scroll) */}
          <div className={cn('flex-1 overflow-y-auto px-4 md:px-6 pb-4', contentClassName)}>
            {children}
          </div>

          {/* Footer (sticky) */}
          {footer && (
            <div
              className="px-4 md:px-6 py-3 md:py-4 border-t shrink-0 flex justify-end gap-2"
              style={{
                borderColor: 'rgba(139,92,246,0.18)',
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              {footer}
            </div>
          )}
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  )
}
