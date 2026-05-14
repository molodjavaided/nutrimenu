import type { Metadata } from 'next'
import Link from 'next/link'
import SiteNav from '@/components/landing/SiteNav'

export const metadata: Metadata = {
  title: 'Тарифы — Plate',
  description:
    'Тарифы Plate: Старт 690 ₽/мес и Стандарт 1 990 ₽/мес. QR-меню, КБЖУ, AI-импорт и ТТК-экспорт для ресторанов и кафе.',
}

type Feature = string | { text: string; note: string }

type Plan = {
  id: string
  name: string
  price: string
  priceSub?: string
  tagline: string
  features: Feature[]
  cta: { label: string; href: string; disabled?: boolean }
  highlight?: boolean
  accent: string
}

const plans: Plan[] = [
  {
    id: 'start',
    name: 'Старт',
    price: '690 ₽',
    priceSub: '/мес',
    tagline: 'Стартуй уже сегодня',
    features: [
      '1 точка, до 50 блюд',
      'QR-меню гостям',
      'Конструктор + Ингредиенты + КБЖУ',
      'AI-импорт: 5 операций/мес',
      'Аналитика спроса',
      'Оцифровка меню — разово 5 000 ₽',
    ],
    cta: { label: 'Попробуй 14 дней бесплатно', href: '/auth/register' },
    accent: '#8B5CF6',
  },
  {
    id: 'standard',
    name: 'Стандарт',
    price: '1 990 ₽',
    priceSub: '/мес',
    tagline: 'Основной тариф — все функции',
    features: [
      { text: '1 точка, до 200 блюд', note: '+1 190 ₽ за доп. точку' },
      'Всё из Старта',
      'AI-импорт: 15 операций/мес',
      'ТТК-экспорт без ограничений',
      'Обратная связь в Telegram',
      'Кастомизация (лого / цвета / шрифт)',
      'Food cost и наценка',
      'Оцифровка меню — разово 5 000 ₽',
    ],
    cta: { label: 'В разработке', href: '#', disabled: true },
    highlight: true,
    accent: '#7C3AED',
  },
  {
    id: 'custom',
    name: 'Индивидуальная',
    price: 'По запросу',
    tagline: 'Кастомные функции под ваш бизнес',
    features: [
      'Обсудим задачу',
      'Сделаем лично под вас',
      'Нестандартные интеграции',
    ],
    cta: { label: 'Связаться', href: 'mailto:hello@plate.menu?subject=Индивидуальная%20разработка' },
    accent: '#1a1730',
  },
]


export default function PricingPage() {
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #EDE9FE 0%, #FEFEF2 40%, #FEFEF2 80%, #E8F4F0 100%)' }}
    >
      <div aria-hidden className="pointer-events-none select-none absolute inset-0 overflow-hidden">
        <svg className="absolute -top-32 -left-32 opacity-25" width="500" height="500" viewBox="0 0 500 500">
          <ellipse cx="250" cy="250" rx="220" ry="200" fill="#8B5CF6" />
        </svg>
        <svg className="absolute top-[60%] -right-40 opacity-20" width="600" height="600" viewBox="0 0 600 600">
          <path d="M480,300 C480,397 397,480 300,480 C203,480 120,397 120,300 C120,203 203,120 300,120 C370,120 430,160 460,220 C476,252 480,276 480,300 Z" fill="#C4B5FD" />
        </svg>
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots-pricing" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#2C2950" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-pricing)" />
        </svg>
      </div>

      <SiteNav />

      <main className="relative z-10 flex-1 px-6 pb-24 max-w-6xl mx-auto w-full">
        {/* Hero */}
        <section className="text-center pt-12 pb-16">
          <h1
            className="mb-5 leading-[1.15]"
            style={{
              fontFamily: "'Stolzl', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(1.875rem, 5vw, 3.5rem)',
              color: '#2C2950',
            }}
          >
            Тарифы <span style={{ color: '#7C3AED' }}>Plate</span>
          </h1>
          <p className="text-base sm:text-lg mx-auto" style={{ color: '#6B6490', maxWidth: 520 }}>
            Начните с тест-драйва или сразу работайте всерьёз.
          </p>
        </section>

        {/* Tariff cards */}
        <section className="grid md:grid-cols-3 gap-5 mb-20 max-w-4xl mx-auto w-full">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="relative p-6 rounded-3xl flex flex-col transition-all hover:-translate-y-1"
              style={{
                background: plan.highlight ? 'linear-gradient(160deg, #ffffff 0%, #F5F1FF 100%)' : 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: plan.highlight ? '2px solid #7C3AED' : '1px solid rgba(176,166,223,0.45)',
                boxShadow: plan.highlight ? '0 12px 36px rgba(124,58,237,0.18)' : '0 4px 16px rgba(44,41,80,0.06)',
              }}
            >
              {plan.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap"
                  style={{ background: '#7C3AED', color: '#fff' }}
                >
                  Популярный
                </div>
              )}

              <div className="mb-1 text-xs font-bold tracking-wider uppercase" style={{ color: plan.accent }}>
                {plan.name}
              </div>
              <div className="mb-2 flex items-baseline gap-1">
                <span style={{
                  fontFamily: "'Stolzl', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  color: '#2C2950',
                }}>
                  {plan.price}
                </span>
                {plan.priceSub && (
                  <span className="text-sm" style={{ color: '#6B6490' }}>{plan.priceSub}</span>
                )}
              </div>
              <p className="mb-5 text-sm leading-relaxed" style={{ color: '#6B6490' }}>
                {plan.tagline}
              </p>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => {
                  const text = typeof f === 'string' ? f : f.text
                  const note = typeof f === 'string' ? null : f.note
                  return (
                    <li key={text} className="flex items-start gap-2.5 text-sm leading-snug">
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: plan.accent }}
                      >
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span>
                        <span style={{ color: '#2C2950' }}>{text}</span>
                        {note && (
                          <span className="block text-xs mt-0.5 leading-relaxed" style={{ color: '#9B93C0' }}>{note}</span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>

              {plan.cta.disabled ? (
                <span
                  className="text-center px-4 py-3 rounded-xl font-semibold text-sm cursor-not-allowed"
                  style={{ background: 'rgba(44,41,80,0.06)', color: '#B0A6DF', border: '1px solid rgba(176,166,223,0.3)' }}
                >
                  {plan.cta.label}
                </span>
              ) : (
                <Link
                  href={plan.cta.href}
                  className="text-center px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:-translate-y-px"
                  style={
                    plan.highlight
                      ? { background: '#7C3AED', color: '#fff', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }
                      : { background: 'rgba(44,41,80,0.06)', color: plan.accent, border: `1px solid ${plan.accent}22` }
                  }
                >
                  {plan.cta.label}
                </Link>
              )}
            </div>
          ))}
        </section>

        {/* FAQ placeholder */}
        <section className="mb-20">
          <h2
            className="text-center mb-8"
            style={{
              fontFamily: "'Stolzl', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
              color: '#2C2950',
            }}
          >
            Частые вопросы
          </h2>
          <div
            className="max-w-3xl mx-auto p-10 rounded-3xl text-center"
            style={{
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px dashed rgba(176,166,223,0.6)',
              color: '#6B6490',
            }}
          >
            Раздел в разработке. Скоро добавим ответы на главные вопросы про триал, оплату и лимиты.
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2
            className="mb-5 mx-auto"
            style={{
              fontFamily: "'Stolzl', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
              color: '#2C2950',
              lineHeight: 1.2,
              maxWidth: 640,
            }}
          >
            Не уверены, какой тариф подойдёт?
          </h2>
          <p className="text-base mb-7" style={{ color: '#6B6490' }}>
            Напишите нам — поможем выбрать.
          </p>
          <Link
            href="mailto:hello@plate.menu"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 hover:-translate-y-px"
            style={{ background: '#2C2950', color: '#FEFEF2' }}
          >
            Связаться
          </Link>
        </section>
      </main>
    </div>
  )
}
