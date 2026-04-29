'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getVenue, saveVenue } from '@/lib/store'
import type { Venue } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  address: z.string().optional(),
  description: z.string().optional(),
  workingHours: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [venue, setVenue] = useState<Venue | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const v = getVenue()
    setVenue(v)
    if (v) reset({ name: v.name, address: v.address ?? '', description: v.description ?? '', workingHours: v.workingHours ?? '' })
  }, [reset])

  function onSubmit(data: FormData) {
    if (!venue) return
    saveVenue({ ...venue, ...data })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fieldClass = "w-full px-4 py-3 rounded-xl text-sm outline-none"
  const fieldStyle = { background: '#EAE7F8', color: '#2C2950' }
  const labelClass = "block text-sm font-medium mb-1.5"
  const labelStyle = { color: '#2C2950' }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-6" style={{ color: '#2C2950' }}>Настройки заведения</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className={labelClass} style={labelStyle}>Название заведения</label>
          <input {...register('name')} type="text" className={fieldClass} style={fieldStyle} />
          {errors.name && <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>{errors.name.message}</p>}
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Адрес</label>
          <input {...register('address')} type="text" placeholder="ул. Ленина, 1" className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Описание</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Уютное кафе в центре города"
            className={`${fieldClass} resize-none`}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Часы работы</label>
          <input {...register('workingHours')} type="text" placeholder="Пн–Вс: 8:00–22:00" className={fieldClass} style={fieldStyle} />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] mt-1"
          style={{ background: saved ? '#2A9D5C' : '#2C2950', color: '#FEFEF2' }}
        >
          {saved ? 'Сохранено ✓' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}
