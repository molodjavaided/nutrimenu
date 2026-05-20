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
    boxShadow: '0 4px 16px rgba(139,92,246,0.10)',
  },
  // Opaque cream — рабочие секции форм на светлом фоне.
  solid: {
    background: '#FEFEF2',
    border: '0.5px solid rgba(139,92,246,0.18)',
    boxShadow: '0 2px 10px rgba(139,92,246,0.06)',
  },
  // Lavender wash — акценты, выделенные блоки, summary-секции.
  tinted: {
    background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(176,166,223,0.14))',
    border: '0.5px solid rgba(139,92,246,0.22)',
    boxShadow: '0 2px 10px rgba(139,92,246,0.08)',
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
