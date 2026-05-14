import Link from 'next/link'
import DemoButton from './DemoButton'
import PlateLogoIcon from '@/components/PlateLogoIcon'

export default function SiteNav() {
  return (
    <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110"
          style={{ background: '#2C2950' }}
        >
          <PlateLogoIcon size={26} />
        </div>
        <span className="font-semibold text-base tracking-tight" style={{ color: '#2C2950' }}>Plate</span>
      </Link>

      <div className="hidden sm:flex items-center gap-1">
        <Link
          href="/about"
          className="text-sm font-medium px-3 py-2 rounded-xl transition-all hover:bg-white/50"
          style={{ color: '#6B6490' }}
        >
          О продукте
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-medium px-3 py-2 rounded-xl transition-all hover:bg-white/50"
          style={{ color: '#6B6490' }}
        >
          Тарифы
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/auth/login"
          className="text-sm font-medium px-3 sm:px-4 py-2 rounded-xl transition-all"
          style={{ color: '#6B6490' }}
        >
          Войти
        </Link>
        <DemoButton
          className="text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer hover:-translate-y-px"
          style={{ background: '#2C2950', color: '#FEFEF2' }}
        />
      </div>
    </nav>
  )
}
