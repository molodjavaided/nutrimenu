import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const inputStyle = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.5)',
  color: '#2C2950',
  boxShadow: '0 1px 4px rgba(139,92,246,0.06)',
}

export function FormField({ label, required = false, children }: {
  label: string
  required?: boolean
  children: ComponentProps<'div'>['children']
}) {
  return (
    <div className="mb-5">
      <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2C2950' }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

export function FormInput({ className, style, ...props }: ComponentProps<'input'>) {
  return (
    <input
      {...props}
      className={cn('h-10 px-3 rounded-xl text-sm outline-none', className)}
      style={{ fontSize: 16, ...inputStyle, ...style }}
    />
  )
}

export function FormSelect({ className, style, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      {...props}
      className={cn('h-10 px-3 rounded-xl text-sm outline-none', className)}
      style={{ fontSize: 16, ...inputStyle, ...style }}
    >
      {children}
    </select>
  )
}

export function FormTextarea({ className, style, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      {...props}
      className={cn('w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none', className)}
      style={{ fontSize: 16, ...inputStyle, ...style }}
    />
  )
}

const NUTRI_FIELDS = [
  { key: 'calories' as const, label: 'ккал', step: undefined },
  { key: 'protein' as const, label: 'белки', step: '0.1' },
  { key: 'fat' as const, label: 'жиры', step: '0.1' },
  { key: 'carbs' as const, label: 'углеводы', step: '0.1' },
]

export function NutriFields({ nutri, onChange }: {
  nutri: { calories: number; protein: number; fat: number; carbs: number }
  onChange: (field: string, value: number) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {NUTRI_FIELDS.map(({ key, label, step }) => (
        <div key={key} className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: '#6B6490' }}>{label}</span>
          <input
            type="number"
            inputMode="decimal"
            value={nutri[key]}
            onChange={e => onChange(key, Number(e.target.value))}
            step={step}
            className="h-11 w-full px-3 rounded-xl text-sm outline-none text-center"
            style={{ background: 'rgba(255,255,255,0.7)', border: '0.5px solid rgba(255,255,255,0.5)', color: '#2C2950' }}
          />
        </div>
      ))}
    </div>
  )
}
