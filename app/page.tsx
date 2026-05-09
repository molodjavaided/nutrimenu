import Link from 'next/link'

export default function RootPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#FEFEF2' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-text-primary)' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="8" stroke="#FEFEF2" strokeWidth="2"/>
              <path d="M14 9v5l3 2.5" stroke="#FEFEF2" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>NutriMenu</h1>
            <p className="text-sm mt-1" style={{ color: '#7a748f' }}>Меню с КБЖУ для кафе и ресторанов</p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="w-full flex flex-col gap-3">
          <Link
            href="/venues"
            className="w-full h-13 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-[0.98]"
            style={{ background: 'var(--color-text-primary)', color: '#FEFEF2' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M17 17l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Найти заведение
          </Link>
        </div>

        <p className="text-xs text-center" style={{ color: '#B0A6DF' }}>
          Владелец заведения?{' '}
          <Link href="/auth/login" style={{ color: '#7C3AED' }} className="font-medium">
            Войти
          </Link>
          {' · '}
          <Link href="/auth/register" style={{ color: '#7C3AED' }} className="font-medium">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}
