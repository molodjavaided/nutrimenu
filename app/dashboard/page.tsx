'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Category, Venue } from '@/types'

export default function DashboardPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [views, setViews] = useState<{ total: number; today: number; week: number } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/venue').then(r => r.ok ? r.json() : null),
      fetch('/api/categories').then(r => r.ok ? r.json() : null),
      fetch('/api/venue/views').then(r => r.ok ? r.json() : null),
    ]).then(([v, c, vw]) => {
      if (v) setVenue(v)
      if (c) setCategories(c)
      if (vw) setViews(vw)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-6" />

  if (venue?.status === 'PENDING') {
    return (
      <div className="p-6 sm:p-10 flex flex-col items-center text-center max-w-md mx-auto mt-12">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#EAE7F8' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" stroke="#B0A6DF" strokeWidth="2"/>
            <path d="M16 10v7M16 21v1.5" stroke="#B0A6DF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-lg font-semibold mb-2" style={{ color: '#2C2950' }}>Заявка на рассмотрении</h1>
        <p className="text-sm leading-relaxed" style={{ color: '#6B6490' }}>
          Мы проверяем данные вашего заведения. Обычно это занимает 1–2 рабочих дня.
          Как только заявка будет одобрена — вы сразу получите доступ к дашборду.
        </p>
        <p className="text-xs mt-4" style={{ color: '#9D99B8' }}>
          Вопросы? Напишите на{' '}
          <a href="mailto:support@nutrimenu.app" className="underline">support@nutrimenu.app</a>
        </p>
      </div>
    )
  }

  if (venue?.status === 'REJECTED') {
    return (
      <div className="p-6 sm:p-10 flex flex-col items-center text-center max-w-md mx-auto mt-12">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#FEE2E2' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" stroke="#DC2626" strokeWidth="2"/>
            <path d="M11 11l10 10M21 11l-10 10" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-lg font-semibold mb-2" style={{ color: '#2C2950' }}>Заявка отклонена</h1>
        {venue.rejectionReason && (
          <div className="w-full rounded-xl px-4 py-3 mb-3 text-left text-sm" style={{ background: '#FEE2E2', color: '#7F1D1D' }}>
            {venue.rejectionReason}
          </div>
        )}
        <p className="text-sm leading-relaxed" style={{ color: '#6B6490' }}>
          Если вы считаете, что это ошибка, свяжитесь с нами.
        </p>
        <p className="text-xs mt-4" style={{ color: '#9D99B8' }}>
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
            <h1 className="text-xl sm:text-2xl font-medium mb-1" style={{ color: '#2C2950' }}>
              {venueName}
            </h1>
            {venueAddress && (
              <p className="text-sm" style={{ color: '#6B6490' }}>{venueAddress}</p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-xl sm:text-2xl font-medium mb-1" style={{ color: '#9D99B8' }}>
              Название заведения
            </h1>
            <Link href="/dashboard/settings" className="text-sm underline" style={{ color: '#B0A6DF' }}>
              Заполните данные в настройках
            </Link>
          </>
        )}
      </div>

      {/* Onboarding checklist */}
      {!onboardingDone && (
        <div className="mb-6 rounded-2xl p-4 sm:p-5"
          style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '0.5px solid rgba(176,166,223,0.4)', boxShadow: '0 8px 24px rgba(139,92,246,0.08)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#2C2950' }}>
            С чего начать
            <span className="ml-2 text-xs font-normal" style={{ color: '#9D99B8' }}>
              {onboardingSteps.filter(s => s.done).length} / {onboardingSteps.length}
            </span>
          </p>
          <div className="flex flex-col gap-2">
            {onboardingSteps.map((step, i) => (
              <Link key={i} href={step.done ? '#' : step.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                style={{ background: step.done ? 'transparent' : 'rgba(139,92,246,0.05)', cursor: step.done ? 'default' : 'pointer' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: step.done ? '#8B5CF6' : 'transparent', border: step.done ? 'none' : '1.5px solid #B0A6DF' }}>
                  {step.done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: step.done ? '#9D99B8' : '#2C2950', textDecoration: step.done ? 'line-through' : 'none' }}>
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="text-xs" style={{ color: '#9D99B8' }}>{step.hint}</p>
                  )}
                </div>
                {!step.done && (
                  <svg className="ml-auto shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="#B0A6DF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Категорий', value: categories.length, sub: 'в меню' },
          { label: 'Блюд',      value: totalDishes,        sub: 'позиций' },
          { label: 'Просмотров', value: views?.total ?? '—', sub: 'за всё время' },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-2xl p-3 sm:p-5"
            style={{
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '0.5px solid rgba(255,255,255,0.5)',
              boxShadow: '0 8px 24px rgba(139,92,246,0.08)',
            }}
          >
            <p className="text-xs mb-1 sm:mb-2" style={{ color: '#6B6490' }}>{label}</p>
            <p className="text-2xl sm:text-3xl font-medium mb-0.5" style={{ color: '#2C2950' }}>{value}</p>
            <p className="text-xs" style={{ color: '#9D99B8' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-3" style={{ color: '#2C2950' }}>Быстрые действия</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Link href="/dashboard/menu"
            className="flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Управление меню
          </Link>
          <Link href="/dashboard/item/new"
            className="flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED', border: '0.5px solid rgba(139,92,246,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Добавить блюдо
          </Link>
          <Link href="/dashboard/settings"
            className="flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED', border: '0.5px solid rgba(139,92,246,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Настройки
          </Link>
        </div>
      </div>

      {/* QR block */}
      <div className="rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4"
        style={{ background: '#F2D965', border: '0.5px solid rgba(242,217,101,0.5)' }}>
        <div className="min-w-0">
          <p className="text-sm font-medium mb-1" style={{ color: '#635200' }}>QR-код для гостей</p>
          <p className="text-xs mb-3" style={{ color: '#635200' }}>
            Гости сканируют и сразу видят меню с КБЖУ
          </p>
          <p className="text-xs font-medium truncate" style={{ color: '#3D3100' }}>
            {venue?.slug ? `nutrimenu.app/menu/${venue.slug}` : 'nutrimenu.app/menu/…'}
          </p>
        </div>
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(99,82,0,0.1)' }}>
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="4" width="14" height="14" rx="2" stroke="#635200" strokeWidth="2"/>
            <rect x="7" y="7" width="8" height="8" fill="#635200"/>
            <rect x="22" y="4" width="14" height="14" rx="2" stroke="#635200" strokeWidth="2"/>
            <rect x="25" y="7" width="8" height="8" fill="#635200"/>
            <rect x="4" y="22" width="14" height="14" rx="2" stroke="#635200" strokeWidth="2"/>
            <rect x="7" y="25" width="8" height="8" fill="#635200"/>
            <rect x="22" y="22" width="4" height="4" fill="#635200"/>
            <rect x="29" y="22" width="4" height="4" fill="#635200"/>
            <rect x="22" y="29" width="4" height="4" fill="#635200"/>
            <rect x="29" y="29" width="7" height="7" fill="#635200"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
