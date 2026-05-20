'use client'

import { useEffect, useRef, useState } from 'react'
import { MenuExport } from '@/components/dashboard/MenuExport'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { GlassCard, GlassButton, GlassInput, GlassTextarea, NutriPill } from '@/components/ui-kit'

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

  const labelClass = 'block text-sm font-medium mb-1.5'
  const labelStyle = { color: 'var(--color-text-primary)' }

  if (loading) return <div className="p-6" />

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Настройки заведения</h1>

      {/* Onboarding tutorial banner — глава 1 */}
      {onboardingActive && (
        <GlassCard tone="tinted" padding="md" className="mb-5">
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(139,92,246,0.10)', color: '#5B21B6' }}
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2.5 8L9 3l6.5 5v6.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M7 14.5v-4h4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: '#5B21B6' }}>Шаг 1 из 4 — Заведение</p>
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
              <div
                key={i}
                className="flex items-center gap-2 text-xs"
                style={{ color: step.done ? '#15803D' : 'var(--color-text-muted)' }}
              >
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
        </GlassCard>
      )}

      {/* Live preview — «Как увидит гость» */}
      <GlassCard tone="solid" padding="none" className="mb-6 overflow-hidden">
        <div
          className="px-3 py-2 text-xs flex items-center gap-1.5"
          style={{ background: 'rgba(176,166,223,0.15)', color: 'var(--color-text-muted)' }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1 7c1.5-3 4-4.5 6-4.5s4.5 1.5 6 4.5c-1.5 3-4 4.5-6 4.5S2.5 10 1 7z" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          Как увидит гость
        </div>
        <div className="px-4 py-4 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(255,255,255,0.6)',
              border: '0.5px solid rgba(255,255,255,0.5)',
              boxShadow: '0 2px 8px rgba(139,92,246,0.1)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#8B5CF6" strokeWidth="1.5" />
              <path d="M11 7v4l2.5 1.5" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <p
              className="font-medium text-base truncate"
              style={{ color: hasName ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
            >
              {watched.name?.trim() || 'Название заведения'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
              {[watched.address?.trim(), watched.workingHours?.trim()].filter(Boolean).join(' · ') || 'адрес · часы работы'}
            </p>
          </div>
        </div>
      </GlassCard>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className={labelClass} style={labelStyle}>Название заведения</label>
          <GlassInput {...register('name')} type="text" placeholder="Кафе «Утро»" invalid={!!errors.name} />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            То, что гость увидит первым на странице меню
          </p>
          {errors.name && <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} style={labelStyle}>Страна</label>
            <GlassInput {...register('country')} type="text" placeholder="Россия" />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Город</label>
            <GlassInput {...register('city')} type="text" placeholder="Москва" />
          </div>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Адрес</label>
          <GlassInput {...register('address')} type="text" placeholder="ул. Ленина, 1" />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Покажется под названием — поможет гостю понять что это правильное заведение
          </p>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Описание</label>
          <GlassTextarea {...register('description')} rows={3} placeholder="Уютное кафе в центре города" />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Коротко о концепции — необязательно, гость увидит при детальном просмотре
          </p>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Часы работы</label>
          <GlassInput {...register('workingHours')} type="text" placeholder="Пн–Вс: 8:00–22:00" />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Гость сразу видит, открыты вы или нет
          </p>
        </div>

        <GlassButton
          type="submit"
          variant="primary"
          fullWidth
          disabled={onboardingActive && !requiredFilled}
          className="mt-1"
          style={
            saved
              ? { background: '#2A9D5C', boxShadow: '0 4px 12px rgba(42,157,92,0.3)', borderColor: 'rgba(42,157,92,0.6)' }
              : onboardingActive && requiredFilled
                ? { background: 'var(--color-text-primary)', borderColor: 'rgba(44,41,80,0.6)' }
                : undefined
          }
          rightIcon={
            onboardingActive && !saved ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : undefined
          }
        >
          {saved
            ? (onboardingActive ? 'Сохранено ✓ — перехожу к категориям...' : 'Сохранено ✓')
            : (onboardingActive ? 'Сохранить и перейти к категориям' : 'Сохранить')}
        </GlassButton>
      </form>

      {/* QR code */}
      {slug && (
        <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(139,92,246,0.18)' }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>QR-код для гостей</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Распечатайте и разместите на столах — гости отсканируют и увидят меню с КБЖУ.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <GlassCard tone="solid" padding="sm" className="shrink-0">
              <canvas ref={canvasRef} />
            </GlassCard>
            <div className="flex flex-col gap-2 min-w-0">
              <p className="text-xs font-mono break-all" style={{ color: 'var(--color-text-secondary)' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/menu/${slug}` : `/menu/${slug}`}
              </p>
              <GlassButton
                onClick={downloadQR}
                style={{ background: 'var(--color-text-primary)', color: '#FEFEF2', borderColor: 'rgba(44,41,80,0.6)' }}
                leftIcon={
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
                    <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              >
                Скачать PNG
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      <MenuExport />

      {/* Onboarding restart */}
      <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(139,92,246,0.18)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Обучение</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Если кто-то другой будет работать с этим аккаунтом — он сможет пройти короткое обучение.
          Туториал проведёт по основным шагам: настройка заведения, категории, первое блюдо, QR.
        </p>
        <GlassButton
          variant="secondary"
          onClick={async () => {
            const res = await fetch('/api/user/onboarding', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'restart' }),
            })
            if (res.ok) router.push('/dashboard')
          }}
          leftIcon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 2l6 3-6 3-6-3 6-3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M4 6.5v3c0 1 2 2 4 2s4-1 4-2v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        >
          Пройти обучение заново
        </GlassButton>
      </div>

      {/* Danger zone */}
      <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(220,38,38,0.2)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: '#DC2626' }}>Опасная зона</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Удаление аккаунта необратимо — все данные заведения, меню и ингредиенты будут удалены.
        </p>
        {!deleteConfirm ? (
          <GlassButton
            variant="secondary"
            onClick={() => setDeleteConfirm(true)}
            style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', borderColor: 'rgba(220,38,38,0.3)' }}
          >
            Удалить аккаунт
          </GlassButton>
        ) : (
          <GlassCard
            tone="solid"
            padding="md"
            className="flex flex-col gap-3"
            style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)' }}
          >
            <p className="text-sm font-medium" style={{ color: '#DC2626' }}>Вы уверены? Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <GlassButton variant="danger" size="sm" onClick={deleteAccount} disabled={deleting}>
                {deleting ? 'Удаление…' : 'Да, удалить всё'}
              </GlassButton>
              <GlassButton variant="secondary" size="sm" onClick={() => setDeleteConfirm(false)}>
                Отмена
              </GlassButton>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Admin edit permission */}
      <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(139,92,246,0.18)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Доступ администратора</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Разрешите команде Plate редактировать ваше меню — например, чтобы перенести данные о КБЖУ за вас.
        </p>
        <button
          onClick={() => toggleAdminEdit(!allowAdminEdit)}
          disabled={savingAdminEdit}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all active:scale-[0.99]"
          style={{
            background: allowAdminEdit ? 'rgba(139,92,246,0.08)' : 'rgba(234,231,248,0.7)',
            border: `0.5px solid ${allowAdminEdit ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.15)'}`,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          {/* Toggle pill */}
          <div
            className="relative shrink-0 transition-colors"
            style={{ width: 40, height: 22, borderRadius: 11, background: allowAdminEdit ? '#8B5CF6' : '#C8C3F0' }}
          >
            <div
              className="absolute top-0.5 transition-transform"
              style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transform: allowAdminEdit ? 'translateX(20px)' : 'translateX(2px)',
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {allowAdminEdit ? 'Разрешено' : 'Запрещено'}
              </p>
              {allowAdminEdit && <NutriPill tone="brand" size="xs">admin</NutriPill>}
            </div>
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
