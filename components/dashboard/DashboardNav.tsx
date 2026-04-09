'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/dashboard',
    label: 'Обзор',
    exact: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="9" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="2" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="9" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
    sidebarIcon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="9" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="2" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="9" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/menu',
    label: 'Меню',
    exact: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h12M2 12h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    sidebarIcon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h12M2 12h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/ingredients',
    label: 'Ингредиенты',
    exact: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M12 9.5v1.5l1 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    sidebarIcon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M12 9.5v1.5l1 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Настройки',
    exact: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    sidebarIcon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Sidebar — desktop only ── */}
      <aside
        className="hidden md:flex w-56 shrink-0 flex-col"
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '0.5px solid rgba(255,255,255,0.5)',
          boxShadow: '1px 0 20px rgba(139,92,246,0.06)',
        }}
      >
        {/* Логотип */}
        <div className="px-5 py-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-lavender">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="5" stroke="#FEFEF2" strokeWidth="1.5"/>
                <path d="M8 5v3l2 1.5" stroke="#FEFEF2" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-medium text-sm text-text-primary">NutriMenu</span>
          </div>
        </div>

        {/* Навигация */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(item => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: active ? 'rgba(139,92,246,0.1)' : 'transparent',
                  color: active ? '#7C3AED' : '#6B6490',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {item.sidebarIcon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Ссылка на гостевое меню */}
        <div className="px-3 py-4" style={{ borderTop: '0.5px solid rgba(255,255,255,0.4)' }}>
          <Link
            href="/menu/utro"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all bg-lavender-light text-text-secondary hover:bg-lavender hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M10 2h4m0 0v4m0-4L8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Смотреть меню
          </Link>
        </div>
      </aside>

      {/* ── Bottom nav — mobile only ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '0.5px solid rgba(255,255,255,0.5)',
          boxShadow: '0 -4px 24px rgba(139,92,246,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {navItems.map(item => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all"
              style={{ color: active ? '#7C3AED' : '#9D99B8' }}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && (
                <span
                  className="absolute top-0 w-8 h-0.5 rounded-full"
                  style={{ background: '#8B5CF6' }}
                />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
