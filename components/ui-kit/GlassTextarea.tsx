import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(function GlassTextarea(
  { invalid, className, style, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn('w-full px-3.5 py-3 text-sm rounded-xl resize-none', className)}
      style={{
        fontSize: 16,
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: invalid
          ? '0.5px solid rgba(220,38,38,0.55)'
          : '0.5px solid rgba(139,92,246,0.25)',
        color: 'var(--color-text-primary)',
        boxShadow: 'inset 0 1px 2px rgba(44,41,80,0.04)',
        outline: 'none',
        ...style,
      }}
      {...rest}
    />
  )
})
