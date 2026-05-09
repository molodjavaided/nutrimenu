'use client'

import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/session', { method: 'DELETE' })
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FEFEF2' }}>
      <header
        className="px-6 py-4 flex items-center gap-3 border-b"
        style={{ borderColor: '#EAE7F8' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--color-text-primary)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="4" stroke="#FEFEF2" strokeWidth="1.5" />
            <path d="M7 4.5v2.5l1.5 1" stroke="#FEFEF2" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="font-bold text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>NutriMenu Admin</span>
        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ color: '#7a748f', background: '#EAE7F8' }}
        >
          Выйти
        </button>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
