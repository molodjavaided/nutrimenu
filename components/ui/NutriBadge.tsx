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
      className={cn(
        'text-xs px-1.5 py-0.5 rounded-md font-medium',
        variant === 'calorie'
          ? 'bg-yellow text-yellow-dark'
          : 'bg-lavender-light text-lavender-dark',
        className
      )}
    >
      {label} {value}{unit}
    </span>
  )
}
