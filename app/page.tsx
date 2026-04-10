'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_KEY = 'nutrimenu_role'
type Role = 'owner' | 'guest'

export default function RoleSelect() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(ROLE_KEY) as Role | null
    if (saved === 'owner') router.replace('/dashboard')
    else if (saved === 'guest') router.replace('/menu/utro')
  }, [router])

  function choose(role: Role) {
    localStorage.setItem(ROLE_KEY, role)
    router.push(role === 'owner' ? '/dashboard' : '/menu/utro')
  }

  if (!mounted) return null

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#FEFEF2' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-10">
        {/* Logo / brand */}
        <div className="text-center">
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ color: '#2C2950' }}
          >
            NutriMenu
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#7a748f' }}>
            Выберите, как вы заходите
          </p>
        </div>

        {/* Role cards */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => choose('owner')}
            className="w-full rounded-2xl px-6 py-5 text-left transition-all active:scale-[0.98]"
            style={{
              backgroundColor: '#2C2950',
              color: '#FEFEF2',
            }}
          >
            <span className="block text-lg font-semibold">Владелец заведения</span>
            <span className="block text-sm mt-0.5 opacity-70">
              Управление меню, ингредиентами и настройками
            </span>
          </button>

          <button
            onClick={() => choose('guest')}
            className="w-full rounded-2xl px-6 py-5 text-left border-2 transition-all active:scale-[0.98]"
            style={{
              borderColor: '#B0A6DF',
              backgroundColor: '#EAE7F8',
              color: '#2C2950',
            }}
          >
            <span className="block text-lg font-semibold">Гость</span>
            <span className="block text-sm mt-0.5" style={{ color: '#7a748f' }}>
              Просмотр меню и КБЖУ
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
