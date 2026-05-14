import type { Metadata } from 'next'
import Link from 'next/link'
import SiteNav from '@/components/landing/SiteNav'
import PhoneMenuPreview from '@/components/landing/PhoneMenuPreview'

export const metadata: Metadata = {
  title: 'О продукте — Plate',
  description:
    'За фасадом меню кипит работа. Plate упрощает её: цифровое меню для гостей, конструктор блюд, ТТК, food-cost и аналитика — для владельца.',
}

const guestPains = [
  {
    title: 'Одно меню на кассе',
    body: 'Гости толпятся, чтобы просто посмотреть, что в меню. Одни уходят, не вытерпев очередь.',
  },
  {
    title: 'До меню нужно дойти и выбрать',
    body: 'А гость не знает, что он хочет. А там очередь — или просто лень. Ему проще не выбирать. А значит — не покупать.',
  },
  {
    title: 'Официант не помнит состав',
    body: 'Длинное меню, шпарит гостю наугад, пропустив аллерген. Он виноват, что забыл. Но мог бы честно сказать: «давайте посмотрим, что в составе». Честно забыл.',
  },
  {
    title: 'КБЖУ десерта — в чате',
    body: 'Бариста помнит, что всё прописано в отдельном файле, который надо найти в чате, и просит подождать минуту. В наше время минута раздумий для гостя — это много. У него есть время только на свои раздумья.',
  },
]

const ownerExtras = [
  { title: 'ТТК для персонала', body: 'Оформим — чтобы им было удобно с ним знакомиться и возвращаться при необходимости.' },
  { title: 'Уведомления об обратной связи', body: 'Менеджеру или владельцу — без потери рейтинга на других площадках.' },
  { title: 'Выгрузка ТТК в PDF / XLSX', body: 'Составили через конструктор — забрали к себе.' },
]

// const ownerRoadmap = [
//   'Просчёт food-cost',
//   'Аналитика заказов при интеграции к вашей POS-системе',
//   'Кастомизация меню для гостей с использованием вашей айдентики',
// ]

export default function AboutPage() {
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #EDE9FE 0%, #FEFEF2 35%, #FEFEF2 70%, #E8F4F0 100%)' }}
    >
      {/* Decorative background */}
      <div aria-hidden className="pointer-events-none select-none absolute inset-0 overflow-hidden">
        <svg className="absolute -top-32 -right-40 opacity-30" width="600" height="600" viewBox="0 0 600 600">
          <path d="M480,300 C480,397 397,480 300,480 C203,480 120,397 120,300 C120,203 203,120 300,120 C370,120 430,160 460,220 C476,252 480,276 480,300 Z" fill="#C4B5FD" />
        </svg>
        <svg className="absolute top-[40%] -left-32 opacity-20" width="500" height="500" viewBox="0 0 500 500">
          <ellipse cx="250" cy="250" rx="220" ry="200" fill="#8B5CF6" />
        </svg>
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots-about" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#2C2950" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-about)" />
        </svg>
      </div>

      <SiteNav />

      <main className="relative z-10 flex-1 px-6 pb-24 max-w-5xl mx-auto w-full">
        {/* ── Hero ── */}
        <section className="text-center pt-12 pb-20">
          <h1
            className="mb-6 leading-[1.1]"
            style={{
              fontFamily: "'Stolzl', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(1.875rem, 5.5vw, 3.75rem)',
              color: '#2C2950',
            }}
          >
            За фасадом меню кипит работа,<br />
            <span style={{ color: '#7C3AED' }}>мы её упрощаем.</span>
          </h1>
        </section>

        {/* ── Для гостей ── */}
        <section className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center mb-24">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5 text-xs font-semibold tracking-wide uppercase"
                 style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}>
              Для гостей
            </div>
            <ul className="space-y-3 mb-7" style={{ color: '#2C2950' }}>
              {['Актуальное меню', 'Подробный состав', 'Аллергены', 'Калькулятор КБЖУ'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-base">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: '#8B5CF6' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Phone mockup — живое демо */}
          <div className="flex justify-center md:justify-end">
            <PhoneMenuPreview />
          </div>
        </section>

        {/* ── Боли гостей ── */}
        <section className="mb-24">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <p style={{ color: '#6B6490' }} className="text-base sm:text-lg">
              Звучит просто — но за этим стоит решение проблем. Вот основные примеры.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {guestPains.map((pain, i) => (
              <div
                key={pain.title}
                className="p-6 rounded-2xl transition-all hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(176,166,223,0.4)',
                }}
              >
                <div className="text-xs font-bold mb-2" style={{ color: '#8B5CF6' }}>
                  Боль №{i + 1}
                </div>
                <h3 className="mb-2 text-base font-semibold" style={{ color: '#2C2950' }}>
                  {pain.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B6490' }}>
                  {pain.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Для владельца ── */}
        <section className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5 text-xs font-semibold tracking-wide uppercase"
               style={{ background: 'rgba(44,41,80,0.08)', color: '#2C2950' }}>
            Для владельца
          </div>
          <h2 className="mb-5" style={{
            fontFamily: "'Stolzl', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
            color: '#2C2950',
            lineHeight: 1.2,
          }}>
            Под фасадом меню — конструктор
          </h2>
          <p className="mb-3 text-base leading-relaxed max-w-2xl" style={{ color: '#2C2950' }}>
            Мы сделали удобный конструктор для блюд / напитков / десертов. Автоматический подсчёт КБЖУ. Нужно лишь один раз занести в базу — и переиспользовать в блюдах.
          </p>
          <p className="mb-8 text-base leading-relaxed max-w-2xl" style={{ color: '#6B6490' }}>
            Это основная наша функция — от которой мы хотим развивать наш продукт.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 hover:-translate-y-px"
            style={{ background: '#2C2950', color: '#FEFEF2' }}
          >
            Попробовать конструктор
          </Link>
        </section>

        {/* ── Что ещё умеем ── */}
        <section className="mb-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownerExtras.map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(176,166,223,0.4)',
                }}
              >
                <h3 className="mb-2 text-base font-semibold" style={{ color: '#2C2950' }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B6490' }}>
                  {item.body}
                </p>
              </div>
            ))}

            {/* Заполним меню за вас — на всю ширину */}
            <div
              className="sm:col-span-2 lg:col-span-3 p-8 rounded-2xl"
              style={{
                background: 'linear-gradient(160deg, #2C2950 0%, #1a1730 100%)',
                border: '1px solid rgba(44,41,80,0.2)',
              }}
            >
              <h3 className="mb-3 text-lg font-semibold" style={{ color: '#FEFEF2' }}>
                Заполним меню за вас
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#B0A6DF' }}>
                Если не хочется ни с чем возиться — «вжух, и ваше меню в нашем сервисе». Дайте нам ваши ТТК и фотографии — всё перенесём.
              </p>
            </div>
          </div>
        </section>

        {/* ── Кто это делает ── */}
        <section className="mb-24">
          <div
            className="p-8 sm:p-12 rounded-3xl text-center max-w-3xl mx-auto"
            style={{
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(176,166,223,0.4)',
            }}
          >
            <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#2C2950' }}>
              Этот сервис делают <span style={{ color: '#7C3AED', fontWeight: 600 }}>люди из общепита</span> — и понимают работу изнутри. Мелочи, которые кажутся незначительными, в сумме дают одну большую боль — <span style={{ fontWeight: 600 }}>потерю времени</span>. Мы стараемся улучшить мелкие процессы, чтобы каждое заведение качественно радовало своих гостей. И они возвращались, принося вам прибыль.
            </p>
          </div>
        </section>

        {/* ── Месседж перед тарифами ── */}
        <section className="text-center">
          <h2
            className="mb-5 mx-auto"
            style={{
              fontFamily: "'Stolzl', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              color: '#2C2950',
              lineHeight: 1.2,
              maxWidth: 720,
            }}
          >
            Эту базу мы закрываем уже с первого тарифа — <span style={{ color: '#7C3AED' }}>СТАРТ</span>.
          </h2>
          <p className="text-base sm:text-lg mb-8" style={{ color: '#6B6490' }}>
            А потом — больше, проще, лучше.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center px-8 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 hover:-translate-y-px"
            style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }}
          >
            Смотреть тарифы
          </Link>
        </section>
      </main>
    </div>
  )
}
