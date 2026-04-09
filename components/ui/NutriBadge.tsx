import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: number | string
  unit?: string
  variant?: 'calorie' | 'macro'
  className?: string
}

export function NutriBadge({ label, value, unit = '', variant = 'macro', className }: Props) {
  return (
    <span
      className={cn('text-xs px-1.5 py-0.5 rounded-md font-medium', className)}
      style={
        variant === 'calorie'
          ? { background: 'rgba(242,217,101,0.3)', color: '#7C5200', border: '0.5px solid rgba(242,217,101,0.5)' }
          : { background: 'rgba(139,92,246,0.1)', color: '#7C3AED', border: '0.5px solid rgba(139,92,246,0.2)' }
      }
    >
      {label} {value}{unit}
    </span>
  )
}
