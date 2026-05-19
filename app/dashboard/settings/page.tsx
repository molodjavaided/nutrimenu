'use client'

import { useEffect, useRef, useState } from 'react'
import { MenuExport } from '@/components/dashboard/MenuExport'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'

const schema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  country: z.string().optional(),
  city: z.string().optional(),
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

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Onboarding state — рендерим тутор-баннер только когда step===1
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/venue')
      .then(r => r.ok ? r.json() : null)
      .then(v => {
        if (v) {
          reset({ name: v.name, country: v.country ?? '', city: v.city ?? '', address: v.address ?? '', description: v.description ?? '', workingHours: v.workingHours ?? '' })
          setAllowAdminEdit(v.allowAdminEdit ?? false)
          setSlug(v.slug ?? null)
        }
      })
      .finally(() => setLoading(false))
    fetch('/api/user/onboarding')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setOnboardingStep(data.step) })
      .catch(() => {})
  }, [reset])

  // Подписываемся на значения формы — для live preview и чек-листа туториала
  const watched = watch()
  const hasName = (watched.name ?? '').trim().length >= 2
  const hasCity = (watched.city ?? '').trim().length > 0
  const hasWorkingHours = (watched.workingHours ?? '').trim().length > 0
  const onboardingActive = onboardingStep === 1
  const requiredFilled = hasName && hasCity && hasWorkingHours

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

    // Если идём по туториалу (глава 1) и заполнили минимум — переходим к главе 2 (категории)
    if (onboardingStep === 1 && data.name.trim().length >= 2 && (data.city ?? '').trim() && (data.workingHours ?? '').trim()) {
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next' }),
      })
      setTimeout(() => router.push('/dashboard/menu'), 600)
      return
    }
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
  const fieldStyle = { background: '#EAE7F8', color: 'var(--color-text-primary)' }
  const labelClass = "block text-sm font-medium mb-1.5"
  const labelStyle = { color: 'var(--color-text-primary)' }

  if (loading) return <div className="p-6" />

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Настройки заведения</h1>

      {/* Onboarding tutorial banner — глава 1 */}
      {onboardingActive && (
        <div
          className="mb-5 rounded-2xl p-4 sm:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(176,166,223,0.12))',
            border: '0.5px solid rgba(139,92,246,0.3)',
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="text-2xl shrink-0">🏠</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: '#5B21B6' }}>
                Шаг 1 из 4 — Заведение
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Эти данные гость увидит в шапке меню. Заполните хотя бы название, город и часы работы — этого хватит, чтобы двигаться дальше.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 ml-9">
            {[
              { done: hasName, label: 'Название заведения' },
              { done: hasCity, label: 'Город' },
              { done: hasWorkingHours, label: 'Часы работы' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs"
                style={{ color: step.done ? '#15803D' : 'var(--color-text-muted)' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%',
                  background: step.done ? '#15803D' : 'transparent',
                  border: step.done ? 'none' : '1.2px solid #C8C3F0',
                  color: '#fff', fontSize: 10,
                }}>
                  {step.done ? '✓' : ''}
                </span>
                {step.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live preview — «Как увидит гость» */}
      <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(176,166,223,0.3)' }}>
        <div className="px-3 py-2 text-xs flex items-center gap-1.5"
          style={{ background: 'rgba(176,166,223,0.15)', color: 'var(--color-text-muted)' }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M1 7c1.5-3 4-4.5 6-4.5s4.5 1.5 6 4.5c-1.5 3-4 4.5-6 4.5S2.5 10 1 7z" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          Как увидит гость
        </div>
        <div className="px-4 py-4 flex items-center gap-3" style={{ background: '#FEFEF2' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.5)', boxShadow: '0 2px 8px rgba(139,92,246,0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#8B5CF6" strokeWidth="1.5"/>
              <path d="M11 7v4l2.5 1.5" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-base truncate" style={{ color: hasName ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
              {watched.name?.trim() || 'Название заведения'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
              {[watched.address?.trim(), watched.workingHours?.trim()].filter(Boolean).join(' · ') || 'адрес · часы работы'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className={labelClass} style={labelStyle}>Название заведения</label>
          <input {...register('name')} type="text" placeholder="Кафе «Утро»" className={fieldClass} style={fieldStyle} />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>То, что гость увидит первым на странице меню</p>
          {errors.name && <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} style={labelStyle}>Страна</label>
            <input {...register('country')} type="text" placeholder="Россия" className={fieldClass} style={fieldStyle} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Город</label>
            <input {...register('city')} type="text" placeholder="Москва" className={fieldClass} style={fieldStyle} />
          </div>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Адрес</label>
          <input {...register('address')} type="text" placeholder="ул. Ленина, 1" className={fieldClass} style={fieldStyle} />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Покажется под названием — поможет гостю понять что это правильное заведение</p>
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
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Коротко о концепции — необязательно, гость увидит при детальном просмотре</p>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Часы работы</label>
          <input {...register('workingHours')} type="text" placeholder="Пн–Вс: 8:00–22:00" className={fieldClass} style={fieldStyle} />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Гость сразу видит, открыты вы или нет</p>
        </div>

        <button
          type="submit"
          disabled={onboardingActive && !requiredFilled}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] mt-1 flex items-center justify-center gap-2"
          style={{
            background: saved
              ? '#2A9D5C'
              : (onboardingActive && !requiredFilled ? 'rgba(44,41,80,0.35)' : 'var(--color-text-primary)'),
            color: '#FEFEF2',
            cursor: onboardingActive && !requiredFilled ? 'not-allowed' : 'pointer',
          }}
        >
          {saved
            ? (onboardingActive ? 'Сохранено ✓ — перехожу к категориям...' : 'Сохранено ✓')
            : (onboardingActive ? 'Сохранить и перейти к категориям' : 'Сохранить')}
          {onboardingActive && !saved && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </form>

      {/* QR code */}
      {slug && (
        <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>QR-код для гостей</h2>
          <p className="text-xs mb-4" style={{ color: '#7a748f' }}>
            Распечатайте и разместите на столах — гости отсканируют и увидят меню с КБЖУ.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="rounded-2xl p-3 shrink-0" style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.3)' }}>
              <canvas ref={canvasRef} />
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <p className="text-xs font-mono break-all" style={{ color: 'var(--color-text-secondary)' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/menu/${slug}` : `/menu/${slug}`}
              </p>
              <button
                type="button"
                onClick={downloadQR}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] self-start"
                style={{ background: 'var(--color-text-primary)', color: '#FEFEF2' }}
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

      <MenuExport />

      {/* Onboarding restart */}
      <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Обучение</h2>
        <p className="text-xs mb-4" style={{ color: '#7a748f' }}>
          Если кто-то другой будет работать с этим аккаунтом — он сможет пройти короткое обучение.
          Туториал проведёт по основным шагам: настройка заведения, категории, первое блюдо, QR.
        </p>
        <button
          type="button"
          onClick={async () => {
            const res = await fetch('/api/user/onboarding', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'restart' }),
            })
            if (res.ok) router.push('/dashboard')
          }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-2"
          style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}
        >
          🎓 Пройти обучение заново
        </button>
      </div>

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
                style={{ background: '#EAE7F8', color: 'var(--color-text-primary)' }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin edit permission */}
      <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Доступ администратора</h2>
        <p className="text-xs mb-4" style={{ color: '#7a748f' }}>
          Разрешите команде Plate редактировать ваше меню — например, чтобы перенести данные о КБЖУ за вас.
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
            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {allowAdminEdit ? 'Разрешено' : 'Запрещено'}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
