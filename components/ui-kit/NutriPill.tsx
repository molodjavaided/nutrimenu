import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PillTone =
  | 'neutral'
  | 'calorie'
  | 'protein'
  | 'fat'
  | 'carbs'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand'

export type PillSize = 'xs' | 'sm' | 'md'

interface NutriPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone
  size?: PillSize
  icon?: ReactNode
  /** Цифра/значение — подсвечивается жирно. */
  value?: ReactNode
  /** Подпись слева от value (Б/Ж/У). */
  label?: ReactNode
  /** Единица справа от value (г/мл/ккал). */
  unit?: string
}

const SIZES: Record<PillSize, string> = {
  xs: 'text-[10px] px-1.5 py-0.5 rounded-full gap-0.5',
  sm: 'text-xs px-2 py-0.5 rounded-full gap-1',
  md: 'text-sm px-2.5 py-1 rounded-full gap-1.5',
}

// Палитра: фон с прозрачностью + сочный текст + полупрозрачный hairline.
const TONES: Record<PillTone, React.CSSProperties> = {
  neutral: { background: 'rgba(176,166,223,0.15)', color: '#534AB7', border: '0.5px solid rgba(139,92,246,0.20)' },
  brand:   { background: 'rgba(139,92,246,0.12)',  color: '#7C3AED', border: '0.5px solid rgba(139,92,246,0.28)' },
  calorie: { background: 'rgba(242,217,101,0.28)', color: '#7C5200', border: '0.5px solid rgba(242,217,101,0.55)' },
  protein: { background: 'rgba(59,130,246,0.12)',  color: '#1D4ED8', border: '0.5px solid rgba(59,130,246,0.28)' },
  fat:     { background: 'rgba(244,114,182,0.14)', color: '#BE185D', border: '0.5px solid rgba(244,114,182,0.32)' },
  carbs:   { background: 'rgba(34,197,94,0.12)',   color: '#15803D', border: '0.5px solid rgba(34,197,94,0.28)' },
  success: { background: 'rgba(34,197,94,0.14)',   color: '#15803D', border: '0.5px solid rgba(34,197,94,0.30)' },
  warning: { background: 'rgba(242,217,101,0.30)', color: '#7C5200', border: '0.5px solid rgba(242,217,101,0.55)' },
  danger:  { background: 'rgba(239,68,68,0.10)',   color: '#DC2626', border: '0.5px solid rgba(239,68,68,0.28)' },
  info:    { background: 'rgba(14,165,233,0.10)',  color: '#0369A1', border: '0.5px solid rgba(14,165,233,0.28)' },
}

export function NutriPill({
  tone = 'neutral',
  size = 'sm',
  icon,
  label,
  value,
  unit,
  className,
  style,
  children,
  ...rest
}: NutriPillProps) {
  // Если переданы label/value/unit — строим композицию; иначе уважаем children.
  const hasStructured = label != null || value != null || unit
  return (
    <span
      className={cn('inline-flex items-center font-medium whitespace-nowrap tabular-nums', SIZES[size], className)}
      style={{ ...TONES[tone], ...style }}
      {...rest}
    >
      {icon}
      {hasStructured ? (
        <>
          {label != null && <span style={{ opacity: 0.75 }}>{label}</span>}
          {value != null && <span style={{ fontWeight: 600 }}>{value}</span>}
          {unit && <span style={{ opacity: 0.75 }}>{unit}</span>}
        </>
      ) : (
        children
      )}
    </span>
  )
}
