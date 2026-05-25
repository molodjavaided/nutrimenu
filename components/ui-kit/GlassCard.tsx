import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'glass' | 'solid' | 'tinted'
type Padding = 'none' | 'sm' | 'md' | 'lg'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone
  padding?: Padding
  interactive?: boolean
}

const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
}

const TONES: Record<Tone, React.CSSProperties> = {
  // Translucent — поверх цветного/фото-фона. Hero, sticky-баннеры, оверлеи.
  glass: {
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '0.5px solid rgba(255,255,255,0.55)',
    boxShadow: 'var(--shadow-soft-md)',
  },
  // Opaque cream — рабочие секции форм на светлом фоне.
  solid: {
    background: 'var(--surface-1)',
    border: 'none',
    boxShadow: 'var(--shadow-soft-sm)',
  },
  // Lavender wash — акценты, выделенные блоки, summary-секции.
  tinted: {
    background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(176,166,223,0.14))',
    border: '0.5px solid rgba(139,92,246,0.22)',
    boxShadow: 'var(--shadow-soft-sm)',
  },
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { tone = 'glass', padding = 'md', interactive, className, style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl',
        PADDING[padding],
        interactive && 'transition-all active:scale-[0.99] cursor-pointer',
        className,
      )}
      style={{ ...TONES[tone], ...style }}
      {...rest}
    />
  )
})
