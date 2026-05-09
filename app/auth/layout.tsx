import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#FEFEF2' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-text-primary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5" stroke="#FEFEF2" strokeWidth="1.5" />
              <path d="M8 5v3l2 1.5" stroke="#FEFEF2" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
            <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>NutriMenu</span>
          </div>
          <Link
            href="/venues"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: '#7a748f' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Искать заведение
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
