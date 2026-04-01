import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="p-8">

      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-2xl font-medium mb-1" style={{ color: '#2C2950' }}>
          Кофейня «Утро»
        </h1>
        <p className="text-sm" style={{ color: '#6B6490' }}>
          ул. Пушкина, 12 · до 22:00
        </p>
      </div>

      {/* Карточки статистики */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Категорий', value: '9', sub: 'в меню' },
          { label: 'Блюд', value: '47', sub: 'позиций' },
          { label: 'Просмотров', value: '—', sub: 'скоро' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)' }}>
            <p className="text-xs mb-2" style={{ color: '#6B6490' }}>{label}</p>
            <p className="text-3xl font-medium mb-0.5" style={{ color: '#2C2950' }}>{value}</p>
            <p className="text-xs" style={{ color: '#9D99B8' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Быстрые действия */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-3" style={{ color: '#2C2950' }}>Быстрые действия</p>
        <div className="flex gap-3">
          <Link href="/dashboard/menu"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: '#B0A6DF', color: '#2C2950' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Управление меню
          </Link>
          <Link href="/dashboard/item/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: '#EAE7F8', color: '#534AB7', border: '0.5px solid rgba(176,166,223,0.4)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Добавить блюдо
          </Link>
          <Link href="/dashboard/settings"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: '#EAE7F8', color: '#534AB7', border: '0.5px solid rgba(176,166,223,0.4)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Настройки
          </Link>
        </div>
      </div>

      {/* QR-код блок */}
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: '#F2D965', border: '0.5px solid rgba(242,217,101,0.5)' }}>
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: '#635200' }}>QR-код для гостей</p>
          <p className="text-xs mb-3" style={{ color: '#635200' }}>
            Гости сканируют и сразу видят меню с КБЖУ
          </p>
          <p className="text-xs font-medium" style={{ color: '#3D3100' }}>
            nutrimenu.app/menu/utro
          </p>
        </div>
        <div className="w-20 h-20 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(99,82,0,0.1)' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="4" width="14" height="14" rx="2" stroke="#635200" strokeWidth="2"/>
            <rect x="7" y="7" width="8" height="8" fill="#635200"/>
            <rect x="22" y="4" width="14" height="14" rx="2" stroke="#635200" strokeWidth="2"/>
            <rect x="25" y="7" width="8" height="8" fill="#635200"/>
            <rect x="4" y="22" width="14" height="14" rx="2" stroke="#635200" strokeWidth="2"/>
            <rect x="7" y="25" width="8" height="8" fill="#635200"/>
            <rect x="22" y="22" width="4" height="4" fill="#635200"/>
            <rect x="29" y="22" width="4" height="4" fill="#635200"/>
            <rect x="22" y="29" width="4" height="4" fill="#635200"/>
            <rect x="29" y="29" width="7" height="7" fill="#635200"/>
          </svg>
        </div>
      </div>
    </div>
  )
}