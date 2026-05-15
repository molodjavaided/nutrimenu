import type { Metadata } from 'next'
import Link from 'next/link'
import PlateLogoIcon from '@/components/PlateLogoIcon'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#FEFEF2' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-70">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-text-primary)' }}
            >
              <PlateLogoIcon size={20} />
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Plate</span>
          </Link>
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
