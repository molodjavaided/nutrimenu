'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SwitchRoleButton } from '@/components/SwitchRoleButton'
import { LogOut, ChevronsLeft, ChevronsRight, Menu, ExternalLink } from 'lucide-react'
import PlateLogoIcon from '@/components/PlateLogoIcon'
import { MessagesNavButton } from '@/components/feedback/MessagesHost'

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

const COLLAPSE_KEY = 'nutrimenu_sidebar_collapsed'

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [venueSlug, setVenueSlug] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    fetch('/api/venue').then(r => r.ok ? r.json() : null).then(v => {
      if (v?.slug) setVenueSlug(v.slug)
    })
    if (typeof window !== 'undefined') {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1')
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      }
      return next
    })
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    await fetch('/api/auth/session', { method: 'DELETE' })
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Sidebar — desktop only ── */}
      <aside
        className={`hidden md:flex ${collapsed ? 'w-16' : 'w-56'} shrink-0 flex-col transition-[width] duration-200`}
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '0.5px solid rgba(255,255,255,0.5)',
          boxShadow: '1px 0 20px rgba(139,92,246,0.06)',
        }}
      >
        {/* Логотип + collapse toggle */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-5'} py-5`} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-70" title="Plate">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#2C2950' }}>
              <PlateLogoIcon size={20} />
            </div>
            {!collapsed && <span className="font-medium text-sm text-text-primary">Plate</span>}
          </Link>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(176,166,223,0.2)]"
              style={{ color: 'var(--color-text-muted)' }}
              title="Свернуть"
              aria-label="Свернуть сайдбар"
            >
              <ChevronsLeft size={14} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="mx-2 mt-2 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[rgba(176,166,223,0.2)]"
            style={{ color: 'var(--color-text-muted)' }}
            title="Развернуть"
            aria-label="Развернуть сайдбар"
          >
            <ChevronsRight size={14} />
          </button>
        )}

        {/* Навигация */}
        <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-3'} py-4 flex flex-col gap-1`}>
          {navItems.map(item => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-xl text-sm transition-all`}
                style={{
                  background: active ? 'rgba(139,92,246,0.1)' : 'transparent',
                  color: active ? '#7C3AED' : 'var(--color-text-secondary)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {item.sidebarIcon}
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* Ссылка на гостевое меню + смена роли */}
        <div className={`${collapsed ? 'px-2' : 'px-3'} py-4 flex flex-col gap-1`} style={{ borderTop: '0.5px solid rgba(255,255,255,0.4)' }}>
          <Link
            href={venueSlug ? `/menu/${venueSlug}` : '#'}
            target="_blank"
            title={collapsed ? 'Смотреть меню' : undefined}
            className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'} py-2 rounded-xl text-xs transition-all bg-lavender-light text-text-secondary hover:bg-lavender hover:text-text-primary`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M10 2h4m0 0v4m0-4L8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!collapsed && 'Смотреть меню'}
          </Link>
          {!collapsed && <MessagesNavButton variant="sidebar" />}
          {!collapsed && <SwitchRoleButton variant="sidebar" />}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Выйти' : undefined}
            className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'} py-2 rounded-xl text-xs transition-all w-full text-left`}
            style={{ color: 'var(--color-text-muted)' }}
          >
            <LogOut size={14} />
            {!collapsed && 'Выйти'}
          </button>
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
        {navItems.slice(0, 3).map(item => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative"
              style={{ color: active ? '#7C3AED' : 'var(--color-text-muted)' }}
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
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Ещё"
        >
          <Menu size={20} />
          <span className="text-[10px] font-medium">Ещё</span>
        </button>
      </nav>

      {/* ── "Ещё" bottom sheet — mobile only ── */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(44,41,80,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={e => { if (e.target === e.currentTarget) setMoreOpen(false) }}
        >
          <div
            className="w-full flex flex-col"
            style={{
              borderRadius: '20px 20px 0 0',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '0.5px solid rgba(255,255,255,0.7)',
              boxShadow: '0 -8px 48px rgba(139,92,246,0.18)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full" style={{ background: 'rgba(176,166,223,0.5)' }} />
            </div>
            <div className="px-3 py-3 flex flex-col gap-1">
              {navItems.slice(3).map(item => {
                const active = isActive(item.href, item.exact)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all"
                    style={{
                      background: active ? 'rgba(139,92,246,0.1)' : 'transparent',
                      color: active ? '#7C3AED' : 'var(--color-text-secondary)',
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {item.sidebarIcon}
                    {item.label}
                  </Link>
                )
              })}
              <Link
                href={venueSlug ? `/menu/${venueSlug}` : '#'}
                target="_blank"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <ExternalLink size={16} />
                Смотреть меню
              </Link>
              <div onClick={() => setMoreOpen(false)}>
                <MessagesNavButton variant="sidebar" />
                <SwitchRoleButton variant="sidebar" />
              </div>
              <button
                onClick={() => { setMoreOpen(false); handleLogout() }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all w-full text-left mt-1"
                style={{ color: '#E24B4A', borderTop: '0.5px solid rgba(176,166,223,0.2)' }}
              >
                <LogOut size={16} />
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
