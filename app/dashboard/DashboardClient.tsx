'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Category, Venue } from '@/types'
import { GlassCard, GlassButton, NutriPill } from '@/components/ui-kit'

interface Props {
  venue: Venue | null
  categories: Category[]
  views: { total: number; today: number; week: number }
}

export default function DashboardClient({ venue, categories, views }: Props) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!venue?.slug || !qrCanvasRef.current) return
    const url = `${window.location.origin}/menu/${venue.slug}`
    QRCode.toCanvas(qrCanvasRef.current, url, {
      width: 160,
      margin: 1,
      color: { dark: '#3D3100', light: '#F2D965' },
    }).catch(() => {})
  }, [venue?.slug])

  function downloadQr() {
    if (!qrCanvasRef.current || !venue?.slug) return
    const link = document.createElement('a')
    link.download = `qr-${venue.slug}.png`
    link.href = qrCanvasRef.current.toDataURL('image/png')
    link.click()
  }

  if (venue?.status === 'REJECTED') {
    return (
      <div className="p-6 sm:p-10 flex flex-col items-center text-center max-w-md mx-auto mt-12">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#FEE2E2' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" stroke="#DC2626" strokeWidth="2" />
            <path d="M11 11l10 10M21 11l-10 10" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Заявка отклонена</h1>
        {venue.rejectionReason && (
          <GlassCard
            tone="solid"
            padding="md"
            className="w-full mb-3 text-left text-sm"
            style={{ background: '#FEE2E2', borderColor: 'rgba(220,38,38,0.25)', color: '#7F1D1D' }}
          >
            {venue.rejectionReason}
          </GlassCard>
        )}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Если вы считаете, что это ошибка, свяжитесь с нами.
        </p>
        <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
          <a href="mailto:support@nutrimenu.app" className="underline">support@nutrimenu.app</a>
        </p>
      </div>
    )
  }

  const totalDishes = categories.reduce((sum, c) => sum + (c.items?.length ?? 0), 0)
  const venueName = venue?.name ?? ''
  const venueAddress = [venue?.address, venue?.workingHours].filter(Boolean).join(' · ')

  const onboardingSteps = [
    { done: !!venue?.name, label: 'Заполните данные заведения', href: '/dashboard/settings', hint: 'Название, адрес, часы работы' },
    { done: categories.length > 0, label: 'Создайте первую категорию', href: '/dashboard/menu', hint: 'Например: Завтраки, Напитки, Десерты' },
    { done: totalDishes > 0, label: 'Добавьте первое блюдо', href: '/dashboard/item/new', hint: 'С составом и КБЖУ' },
  ]
  const onboardingDone = onboardingSteps.every(s => s.done)

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        {venueName ? (
          <>
            <h1 className="text-xl sm:text-2xl font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {venueName}
            </h1>
            {venueAddress && (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{venueAddress}</p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-xl sm:text-2xl font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Название заведения
            </h1>
            <Link href="/dashboard/settings" className="text-sm underline" style={{ color: '#B0A6DF' }}>
              Заполните данные в настройках
            </Link>
          </>
        )}
      </div>

      {/* PENDING banner — семантически yellow, не lavender */}
      {venue?.status === 'PENDING' && (
        <GlassCard
          tone="solid"
          padding="md"
          className="mb-6 flex gap-3 items-start"
          style={{ background: 'rgba(242,217,101,0.18)', borderColor: 'rgba(242,217,101,0.5)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(99,82,0,0.12)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="#635200" strokeWidth="1.5" />
              <path d="M9 5v4l2.5 2" stroke="#635200" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold mb-1" style={{ color: '#3D3100' }}>Заявка на рассмотрении</p>
            <p className="text-xs leading-relaxed" style={{ color: '#635200' }}>
              Меню пока скрыто от гостей — но вы можете подготовить категории, ингредиенты и блюда.
              Как только одобрим — всё сразу опубликуется. Обычно это 1–2 рабочих дня.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Onboarding checklist */}
      {!onboardingDone && (
        <GlassCard tone="glass" padding="md" className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>С чего начать</p>
            <NutriPill tone="neutral" size="xs">
              {onboardingSteps.filter(s => s.done).length} / {onboardingSteps.length}
            </NutriPill>
          </div>
          <div className="flex flex-col gap-2">
            {onboardingSteps.map((step, i) => (
              <Link
                key={i}
                href={step.done ? '#' : step.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                style={{ background: step.done ? 'transparent' : 'rgba(139,92,246,0.05)', cursor: step.done ? 'default' : 'pointer' }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: step.done ? '#8B5CF6' : 'transparent', border: step.done ? 'none' : '1.5px solid #B0A6DF' }}
                >
                  {step.done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm"
                    style={{
                      color: step.done ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      textDecoration: step.done ? 'line-through' : 'none',
                    }}
                  >
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{step.hint}</p>
                  )}
                </div>
                {!step.done && (
                  <svg className="ml-auto shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="#B0A6DF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </Link>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Категорий', value: categories.length, sub: 'в меню' },
          { label: 'Блюд', value: totalDishes, sub: 'позиций' },
          { label: 'Просмотров', value: views?.total ?? '—', sub: 'за всё время' },
        ].map(({ label, value, sub }) => (
          <GlassCard key={label} tone="glass" padding="sm" className="sm:p-5">
            <p className="text-xs mb-1 sm:mb-2" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
            <p className="text-2xl sm:text-3xl font-medium mb-0.5" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
          </GlassCard>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>Быстрые действия</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Link href="/dashboard/menu" className="sm:flex-1">
            <GlassButton
              variant="primary"
              fullWidth
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M2 4h12M2 8h12M2 12h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              }
            >
              Управление меню
            </GlassButton>
          </Link>
          <Link href="/dashboard/item/new" className="sm:flex-1">
            <GlassButton
              variant="secondary"
              fullWidth
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              }
            >
              Добавить блюдо
            </GlassButton>
          </Link>
          <Link href="/dashboard/settings" className="sm:flex-1">
            <GlassButton
              variant="secondary"
              fullWidth
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              }
            >
              Настройки
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* QR block — желтый, семантически отдельный акцент */}
      <GlassCard
        tone="solid"
        padding="md"
        className="flex items-center justify-between gap-4"
        style={{ background: '#F2D965', borderColor: 'rgba(242,217,101,0.5)', boxShadow: '0 4px 16px rgba(242,217,101,0.30)' }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium mb-1" style={{ color: '#635200' }}>QR-код для гостей</p>
          <p className="text-xs mb-3" style={{ color: '#635200' }}>
            Гости сканируют и сразу видят меню с КБЖУ. Распечатайте один раз — ссылка не меняется.
          </p>
          <p className="text-xs font-medium mb-3 truncate" style={{ color: '#3D3100' }}>
            {venue?.slug ? `${typeof window !== 'undefined' ? window.location.host : 'plate.menu'}/menu/${venue.slug}` : 'plate.menu/menu/…'}
          </p>
          {venue?.slug && (
            <GlassButton
              size="sm"
              onClick={downloadQr}
              style={{ background: '#3D3100', color: '#F2D965', boxShadow: 'none', border: 'none' }}
              leftIcon={
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                  <path d="M6.5 2v6.5M3.5 5.5l3 3 3-3M2 11h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              Скачать PNG
            </GlassButton>
          )}
        </div>
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(99,82,0,0.06)' }}
        >
          {venue?.slug
            ? <canvas ref={qrCanvasRef} className="w-full h-full" />
            : <div className="text-xs" style={{ color: '#635200' }}>—</div>
          }
        </div>
      </GlassCard>
    </div>
  )
}
