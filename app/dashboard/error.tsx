'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error boundary:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div
        className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)' }}
      >
        <p className="text-base font-semibold mb-1" style={{ color: '#2C2950' }}>
          Что-то пошло не так
        </p>
        <p className="text-sm mb-5" style={{ color: '#6B6490' }}>
          Не удалось отобразить эту часть страницы. Попробуйте ещё раз.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#2C2950', color: '#FEFEF2' }}
          >
            Повторить
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#EAE7F8', color: '#2C2950' }}
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  )
}
