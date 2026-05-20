import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassDashedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  leftIcon?: ReactNode
  fullWidth?: boolean
}

// Dashed add-кнопка: для empty/add-сценариев. Высота h-11 синхронна с GlassInput/GlassButton md,
// чтобы при размещении в одну строку с инпутом или primary-кнопкой ничего не прыгало.
export const GlassDashedButton = forwardRef<HTMLButtonElement, GlassDashedButtonProps>(function GlassDashedButton(
  { leftIcon, fullWidth, className, style, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition-all active:scale-[0.98] whitespace-nowrap',
        fullWidth && 'w-full',
        className,
      )}
      style={{
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        border: '0.5px dashed rgba(139,92,246,0.40)',
        ...style,
      }}
      {...rest}
    >
      {leftIcon}
      {children}
    </button>
  )
})
