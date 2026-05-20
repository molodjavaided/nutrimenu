import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-11 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-base rounded-xl gap-2',
}

// Стили построены так, чтобы disabled-состояние имело визуальный приоритет.
function variantStyle(variant: Variant, disabled: boolean): React.CSSProperties {
  if (disabled) {
    return { background: '#EAE7F8', color: 'rgba(44,41,80,0.45)', boxShadow: 'none', border: '0.5px solid transparent' }
  }
  switch (variant) {
    case 'primary':
      return {
        background: '#8B5CF6',
        color: '#FEFEF2',
        boxShadow: '0 4px 12px rgba(139,92,246,0.30)',
        border: '0.5px solid rgba(139,92,246,0.6)',
      }
    case 'brand':
      // Мягкий лавандовый CTA — второй по силе после primary.
      // Тёплый фон + тёмный текст, чтобы читался как «спокойное действие».
      return {
        background: '#B0A6DF',
        color: 'var(--color-text-primary)',
        boxShadow: '0 4px 12px rgba(176,166,223,0.35)',
        border: '0.5px solid rgba(176,166,223,0.6)',
      }
    case 'secondary':
      return {
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        color: 'var(--color-text-primary)',
        border: '0.5px solid rgba(139,92,246,0.30)',
        boxShadow: '0 2px 8px rgba(139,92,246,0.08)',
      }
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        border: '0.5px solid transparent',
      }
    case 'danger':
      return {
        background: '#DC2626',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(220,38,38,0.30)',
        border: '0.5px solid rgba(220,38,38,0.6)',
      }
  }
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton(
  { variant = 'primary', size = 'md', leftIcon, rightIcon, fullWidth, className, style, disabled, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all whitespace-nowrap',
        'active:scale-[0.97] disabled:cursor-not-allowed',
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      style={{ ...variantStyle(variant, !!disabled), ...style }}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
})
