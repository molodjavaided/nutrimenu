import type { Metadata } from 'next'
import Link from 'next/link'
import DemoButton from '@/components/landing/DemoButton'
import PlateLogoIcon from '@/components/PlateLogoIcon'

export const metadata: Metadata = {
  title: 'Plate — умное цифровое меню с КБЖУ и аллергенами',
  description:
    'Создайте интерактивное цифровое меню для ресторана или кафе. Автоматический расчёт калорий и КБЖУ, подсветка аллергенов, мгновенные обновления по QR-коду.',
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL ?? 'https://plate.menu',
  },
}

export default function RootPage() {
  return (
    <>
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(3deg); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(-2deg); }
          66% { transform: translateY(8px) rotate(1deg); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .blob-a { animation: float-slow 9s ease-in-out infinite; }
        .blob-b { animation: float-slower 13s ease-in-out infinite 2s; }
        .blob-c { animation: float-slow 11s ease-in-out infinite 4s; }
        .hero-title { animation: fade-up 0.7s ease both 0.1s; }
        .hero-sub   { animation: fade-up 0.7s ease both 0.25s; }
        .hero-ctas  { animation: fade-up 0.7s ease both 0.4s; }
        .cta-primary:hover {
          box-shadow: 0 8px 28px rgba(139,92,246,0.45);
          transform: translateY(-1px);
        }
        .cta-secondary:hover {
          background: rgba(255,255,255,0.85) !important;
          transform: translateY(-1px);
        }
        .demo-btn:hover {
          box-shadow: 0 8px 28px rgba(44,41,80,0.18);
          transform: translateY(-1px);
        }
        .logo-mark:hover { transform: rotate(-6deg) scale(1.08); }
      `}</style>

      <div
        className="min-h-screen flex flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #EDE9FE 0%, #FEFEF2 50%, #E8F4F0 100%)' }}
      >
        {/* ── Decorative background blobs ── */}
        <div aria-hidden className="pointer-events-none select-none absolute inset-0 overflow-hidden">
          <svg className="blob-a absolute -top-32 -right-40 opacity-40" width="600" height="600" viewBox="0 0 600 600">
            <path d="M480,300 C480,397 397,480 300,480 C203,480 120,397 120,300 C120,203 203,120 300,120 C370,120 430,160 460,220 C476,252 480,276 480,300 Z" fill="#C4B5FD" />
          </svg>
          <svg className="blob-b absolute -bottom-24 -left-32 opacity-30" width="500" height="500" viewBox="0 0 500 500">
            <ellipse cx="250" cy="250" rx="220" ry="200" fill="#8B5CF6" />
          </svg>
          <svg className="blob-c absolute top-1/2 right-12 opacity-20 -translate-y-1/2" width="280" height="280" viewBox="0 0 280 280">
            <circle cx="140" cy="140" r="120" fill="#F2D965" />
          </svg>
          <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="#2C2950" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* ── Nav ── */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 logo-mark"
              style={{ background: '#2C2950' }}
            >
              <PlateLogoIcon size={26} />
            </div>
            <span className="font-semibold text-base tracking-tight" style={{ color: '#2C2950' }}>Plate</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all"
              style={{ color: '#6B6490' }}
            >
              Войти
            </Link>
            <DemoButton
              className="demo-btn text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer"
              style={{ background: '#2C2950', color: '#FEFEF2' }}
            />
          </div>
        </nav>

        {/* ── Hero ── */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-5xl mx-auto w-full text-center">

          {/* Headline */}
          <h1
            className="hero-title mb-5 leading-[1.15]"
            style={{
              fontFamily: "'Stolzl', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(1.75rem, 7vw, 5rem)',
              color: '#2C2950',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ display: 'block' }}>Цифровое меню</span>
            <span style={{ display: 'block' }}>
              <span style={{ color: '#7C3AED' }}>удобно</span>
              {' '}и просто
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="hero-sub text-base leading-relaxed mb-10"
            style={{ color: '#6B6490', maxWidth: '520px' }}
          >
            Создайте меню с расчётом КБЖУ, отметьте аллергены и поделитесь с гостями через QR-код. Обновления — мгновенно.
          </p>

          {/* CTA buttons */}
          <div className="hero-ctas flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              href="/auth/register"
              className="cta-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200"
              style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }}
            >
              Начать бесплатно
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/venues"
              className="cta-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-medium text-sm transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(176,166,223,0.45)',
                color: '#2C2950',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C5.79 2 4 3.79 4 6c0 3 4 8 4 8s4-5 4-8c0-2.21-1.79-4-4-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
              Найти заведение
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}
