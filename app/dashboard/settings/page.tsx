'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'

const schema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  address: z.string().optional(),
  description: z.string().optional(),
  workingHours: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function SettingsPage() {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [allowAdminEdit, setAllowAdminEdit] = useState(false)
  const [savingAdminEdit, setSavingAdminEdit] = useState(false)
  const [slug, setSlug] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    fetch('/api/venue')
      .then(r => r.ok ? r.json() : null)
      .then(v => {
        if (v) {
          reset({ name: v.name, address: v.address ?? '', description: v.description ?? '', workingHours: v.workingHours ?? '' })
          setAllowAdminEdit(v.allowAdminEdit ?? false)
          setSlug(v.slug ?? null)
        }
      })
      .finally(() => setLoading(false))
  }, [reset])

  useEffect(() => {
    if (!slug || !canvasRef.current) return
    const url = `${window.location.origin}/menu/${slug}`
    QRCode.toCanvas(canvasRef.current, url, {
      width: 200,
      margin: 2,
      color: { dark: '#2C2950', light: '#FEFEF2' },
    })
  }, [slug])

  function downloadQR() {
    if (!canvasRef.current || !slug) return
    const link = document.createElement('a')
    link.download = `qr-${slug}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  async function onSubmit(data: FormData) {
    await fetch('/api/venue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function deleteAccount() {
    setDeleting(true)
    const res = await fetch('/api/venue', { method: 'DELETE' })
    if (res.ok) router.push('/')
    else setDeleting(false)
  }

  async function toggleAdminEdit(val: boolean) {
    setSavingAdminEdit(true)
    setAllowAdminEdit(val)
    await fetch('/api/venue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowAdminEdit: val }),
    })
    setSavingAdminEdit(false)
  }

  const fieldClass = "w-full px-4 py-3 rounded-xl text-sm outline-none"
  const fieldStyle = { background: '#EAE7F8', color: '#2C2950' }
  const labelClass = "block text-sm font-medium mb-1.5"
  const labelStyle = { color: '#2C2950' }

  if (loading) return <div className="p-6" />

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

      {/* QR code */}
      {slug && (
        <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: '#2C2950' }}>QR-код для гостей</h2>
          <p className="text-xs mb-4" style={{ color: '#7a748f' }}>
            Распечатайте и разместите на столах — гости отсканируют и увидят меню с КБЖУ.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="rounded-2xl p-3 shrink-0" style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.3)' }}>
              <canvas ref={canvasRef} />
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <p className="text-xs font-mono break-all" style={{ color: '#6B6490' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/menu/${slug}` : `/menu/${slug}`}
              </p>
              <button
                type="button"
                onClick={downloadQR}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] self-start"
                style={{ background: '#2C2950', color: '#FEFEF2' }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Скачать PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(220,38,38,0.2)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: '#DC2626' }}>Опасная зона</h2>
        <p className="text-xs mb-4" style={{ color: '#7a748f' }}>
          Удаление аккаунта необратимо — все данные заведения, меню и ингредиенты будут удалены.
        </p>
        {!deleteConfirm ? (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
          >
            Удалить аккаунт
          </button>
        ) : (
          <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: 'rgba(220,38,38,0.06)', border: '0.5px solid rgba(220,38,38,0.2)' }}>
            <p className="text-sm font-medium" style={{ color: '#DC2626' }}>Вы уверены? Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-60 transition-all active:scale-[0.98]"
                style={{ background: '#DC2626', color: '#fff' }}
              >
                {deleting ? 'Удаление…' : 'Да, удалить всё'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
                style={{ background: '#EAE7F8', color: '#2C2950' }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin edit permission */}
      <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: '#2C2950' }}>Доступ администратора</h2>
        <p className="text-xs mb-4" style={{ color: '#7a748f' }}>
          Разрешите команде NutriMenu редактировать ваше меню — например, чтобы перенести данные о КБЖУ за вас.
        </p>
        <button
          onClick={() => toggleAdminEdit(!allowAdminEdit)}
          disabled={savingAdminEdit}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-left transition-all"
          style={{
            background: allowAdminEdit ? 'rgba(139,92,246,0.08)' : '#EAE7F8',
            border: `0.5px solid ${allowAdminEdit ? 'rgba(139,92,246,0.3)' : 'transparent'}`,
          }}
        >
          {/* Toggle pill */}
          <div
            className="relative shrink-0 transition-colors"
            style={{
              width: 40, height: 22,
              borderRadius: 11,
              background: allowAdminEdit ? '#8B5CF6' : '#C8C3F0',
            }}
          >
            <div
              className="absolute top-0.5 transition-transform"
              style={{
                width: 18, height: 18,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transform: allowAdminEdit ? 'translateX(20px)' : 'translateX(2px)',
              }}
            />
          </div>
          <div>
            <p className="font-medium" style={{ color: '#2C2950' }}>
              {allowAdminEdit ? 'Разрешено' : 'Запрещено'}
            </p>
            <p className="text-xs" style={{ color: '#9D99B8' }}>
              {allowAdminEdit
                ? 'Администратор может редактировать ваше меню'
                : 'Только вы можете редактировать меню'}
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
