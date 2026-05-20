import type { ComponentProps } from 'react'
import { GlassInput, GlassSelect, GlassTextarea } from '@/components/ui-kit'

export function FormField({ label, required = false, children }: {
  label: string
  required?: boolean
  children: ComponentProps<'div'>['children']
}) {
  return (
    <div className="mb-5">
      <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--color-text-primary)' }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

// API-совместимые обёртки над ui-kit: чтобы потребители (BasicSection, CompositionSection
// и т.д.) не меняли спред-пропсов, мы оставляем имена FormInput/FormSelect/FormTextarea
// прежними. По стилю и поведению они теперь — это GlassInput/GlassSelect/GlassTextarea.
export function FormInput(props: ComponentProps<'input'>) {
  return <GlassInput inputSize="md" {...props} />
}

export function FormSelect(props: ComponentProps<'select'>) {
  return <GlassSelect selectSize="md" {...props} />
}

export function FormTextarea(props: ComponentProps<'textarea'>) {
  return <GlassTextarea {...props} />
}

const NUTRI_FIELDS = [
  { key: 'calories' as const, label: 'ккал', step: undefined, tone: 'calorie' as const },
  { key: 'protein' as const, label: 'белки', step: '0.1', tone: 'protein' as const },
  { key: 'fat' as const, label: 'жиры', step: '0.1', tone: 'fat' as const },
  { key: 'carbs' as const, label: 'углеводы', step: '0.1', tone: 'carbs' as const },
]

// Цвета лейблов поверх инпутов — синхронны с NutriPill tones (calorie/protein/fat/carbs).
const TONE_LABEL_COLOR: Record<'calorie' | 'protein' | 'fat' | 'carbs', string> = {
  calorie: '#7C5200',
  protein: '#1D4ED8',
  fat: '#BE185D',
  carbs: '#15803D',
}

export function NutriFields({ nutri, onChange }: {
  nutri: { calories: number; protein: number; fat: number; carbs: number }
  onChange: (field: string, value: number) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {NUTRI_FIELDS.map(({ key, label, step, tone }) => (
        <div key={key} className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: TONE_LABEL_COLOR[tone] }}>{label}</span>
          <GlassInput
            type="number"
            inputMode="decimal"
            value={nutri[key]}
            onChange={e => onChange(key, Number(e.target.value))}
            step={step}
            className="text-center"
          />
        </div>
      ))}
    </div>
  )
}
