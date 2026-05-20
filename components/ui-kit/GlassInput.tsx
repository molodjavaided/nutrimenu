import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

interface GlassInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: Size
  invalid?: boolean
  leftSlot?: ReactNode
  rightSlot?: ReactNode
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs rounded-lg',
  md: 'h-11 px-3.5 text-sm rounded-xl',
  lg: 'h-12 px-4 text-base rounded-xl',
}

function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    fontSize: 16, // anti-zoom на iOS
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    border: invalid
      ? '0.5px solid rgba(220,38,38,0.55)'
      : '0.5px solid rgba(139,92,246,0.25)',
    color: 'var(--color-text-primary)',
    boxShadow: 'inset 0 1px 2px rgba(44,41,80,0.04)',
    outline: 'none',
  }
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(function GlassInput(
  { inputSize = 'md', invalid, leftSlot, rightSlot, className, style, ...rest },
  ref,
) {
  if (leftSlot || rightSlot) {
    // Композитный вариант: тот же визуальный стиль на обёртке, инпут прозрачный.
    return (
      <div
        className={cn('flex items-center gap-2', SIZES[inputSize], className)}
        style={{ ...inputStyle(!!invalid), ...style }}
      >
        {leftSlot}
        <input
          ref={ref}
          className="flex-1 bg-transparent outline-none"
          style={{ fontSize: 16, color: 'inherit' }}
          {...rest}
        />
        {rightSlot}
      </div>
    )
  }

  return (
    <input
      ref={ref}
      className={cn('w-full', SIZES[inputSize], className)}
      style={{ ...inputStyle(!!invalid), ...style }}
      {...rest}
    />
  )
})
