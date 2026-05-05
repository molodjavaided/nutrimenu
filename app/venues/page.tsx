'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface VenueCard {
  id: string
  slug: string
  name: string
  address?: string
  description?: string
  workingHours?: string
  logo?: string
  tags: string[]
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function VenuesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [venues, setVenues] = useState<VenueCard[]>([])
  const [loading, setLoading] = useState(true)
  const debouncedSearch = useDebounce(search, 300)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/venues${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      if (res.ok) setVenues(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(debouncedSearch) }, [debouncedSearch, load])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FEFEF2' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: '#EAE7F8' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#2C2950' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5" stroke="#FEFEF2" strokeWidth="1.5"/>
              <path d="M8 5v3l2 1.5" stroke="#FEFEF2" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-sm" style={{ color: '#2C2950' }}>NutriMenu</span>
        </div>
        <Link
          href="/auth/login"
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ color: '#7a748f', background: '#EAE7F8' }}
        >
          Войти как владелец
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#2C2950' }}>Заведения</h1>
          <p className="text-sm" style={{ color: '#7a748f' }}>Найдите кафе или ресторан и смотрите меню с КБЖУ</p>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-4 h-12 rounded-2xl mb-6"
          style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="#9D99B8" strokeWidth="1.3"/>
            <path d="M11 11L14 14" stroke="#9D99B8" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Название или адрес..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#2C2950' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: '#9D99B8' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 rounded-full border-2 animate-spin"
              style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#9D99B8' }}>
              {search ? 'Ничего не найдено' : 'Заведений пока нет'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {venues.map(venue => (
              <Link
                key={venue.id}
                href={`/menu/${venue.slug}`}
                className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-all active:scale-[0.99]"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(12px)',
                  border: '0.5px solid rgba(176,166,223,0.3)',
                  boxShadow: '0 2px 12px rgba(139,92,246,0.06)',
                }}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: '#2C2950' }}>{venue.name}</p>
                  {venue.address && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#7a748f' }}>{venue.address}</p>
                  )}
                  {venue.workingHours && (
                    <p className="text-xs mt-0.5" style={{ color: '#B0A6DF' }}>{venue.workingHours}</p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl"
                  style={{ background: '#EAE7F8', color: '#7C3AED' }}>
                  Меню
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
