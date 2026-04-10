'use client'

import { useRouter } from 'next/navigation'

interface Props {
  variant?: 'sidebar' | 'menu'
}

export function SwitchRoleButton({ variant = 'sidebar' }: Props) {
  const router = useRouter()

  function handleSwitch() {
    localStorage.removeItem('nutrimenu_role')
    router.push('/')
  }

  if (variant === 'menu') {
    return (
      <button
        onClick={handleSwitch}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
        style={{
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '0.5px solid rgba(255,255,255,0.5)',
          color: '#6B6490',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M2 8a6 6 0 1012 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M14 5l-2 3-2-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Сменить роль
      </button>
    )
  }

  return (
    <button
      onClick={handleSwitch}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs w-full transition-all"
      style={{ color: '#9D99B8' }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M2 8a6 6 0 1012 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M14 5l-2 3-2-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Сменить роль
    </button>
  )
}
