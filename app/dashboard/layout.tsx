import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: '#FEFEF2' }}>

      {/* Сайдбар */}
      <aside className="w-56 shrink-0 border-r flex flex-col"
        style={{ background: '#FEFEF2', borderColor: 'rgba(176,166,223,0.3)' }}>

        {/* Логотип */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: '#B0A6DF' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="5" stroke="#FEFEF2" strokeWidth="1.5"/>
                <path d="M8 5v3l2 1.5" stroke="#FEFEF2" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-medium text-sm" style={{ color: '#2C2950' }}>NutriMenu</span>
          </div>
        </div>

        {/* Навигация */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <NavLink href="/dashboard" label="Обзор" icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="9" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="2" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="9" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          }/>
          <NavLink href="/dashboard/menu" label="Меню" icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          }/>
          <NavLink href="/dashboard/ingredients" label="Ингредиенты" icon={
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M12 9.5v1.5l1 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
}/>
          <NavLink href="/dashboard/settings" label="Настройки" icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          }/>
        </nav>

        {/* Ссылка на гостевое меню */}
        <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
          <Link href="/menu/utro" target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
            style={{ color: '#6B6490', background: '#EAE7F8' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M10 2h4m0 0v4m0-4L8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Смотреть меню
          </Link>
        </div>
      </aside>

      {/* Контент */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all"
      style={{ color: '#6B6490' }}>
      {icon}
      {label}
    </Link>
  )
}