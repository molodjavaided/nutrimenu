import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

interface GlassSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  selectSize?: Size
  invalid?: boolean
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 pl-3 pr-8 text-xs rounded-lg',
  md: 'h-11 pl-3.5 pr-9 text-sm rounded-xl',
  lg: 'h-12 pl-4 pr-10 text-base rounded-xl',
}

// SVG-стрелка как data-URL чтобы не зависеть от lucide и не дёргать DOM.
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%232C2950' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E\")"

export const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(function GlassSelect(
  { selectSize = 'md', invalid, className, style, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn('w-full appearance-none cursor-pointer', SIZES[selectSize], className)}
      style={{
        fontSize: 16,
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        backgroundImage: CHEVRON,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        border: invalid
          ? '0.5px solid rgba(220,38,38,0.55)'
          : '0.5px solid rgba(139,92,246,0.25)',
        color: 'var(--color-text-primary)',
        boxShadow: 'inset 0 1px 2px rgba(44,41,80,0.04)',
        outline: 'none',
        ...style,
      }}
      {...rest}
    >
      {children}
    </select>
  )
})
