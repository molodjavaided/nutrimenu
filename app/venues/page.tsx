'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import PlateLogoIcon from '@/components/PlateLogoIcon'
import { GlassCard, GlassButton, GlassInput, NutriPill } from '@/components/ui-kit'

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
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '0.5px solid rgba(139,92,246,0.18)' }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-text-primary)' }}>
            <PlateLogoIcon size={22} />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>Plate</span>
        </Link>
        <Link href="/auth/login">
          <GlassButton variant="ghost" size="sm">Войти как владелец</GlassButton>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Заведения</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Найдите кафе или ресторан и смотрите меню с КБЖУ
          </p>
        </div>

        {/* Search */}
        <GlassInput
          inputSize="lg"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Название или адрес..."
          className="mb-6"
          leftSlot={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="4.5" stroke="#9D99B8" strokeWidth="1.3" />
              <path d="M11 11L14 14" stroke="#9D99B8" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          }
          rightSlot={
            search ? (
              <button
                onClick={() => setSearch('')}
                aria-label="Очистить поиск"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            ) : undefined
          }
        />

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div
              className="w-7 h-7 rounded-full border-2 animate-spin"
              style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }}
            />
          </div>
        ) : venues.length === 0 ? (
          <GlassCard tone="solid" padding="lg" className="text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {search ? 'Ничего не найдено' : 'Заведений пока нет'}
            </p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-3">
            {venues.map(venue => (
              <Link key={venue.id} href={`/menu/${venue.slug}`} className="block">
                <GlassCard
                  tone="glass"
                  padding="md"
                  interactive
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {venue.name}
                    </p>
                    {venue.address && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {venue.address}
                      </p>
                    )}
                    {venue.workingHours && (
                      <p className="text-xs mt-0.5" style={{ color: '#B0A6DF' }}>
                        {venue.workingHours}
                      </p>
                    )}
                  </div>
                  <NutriPill tone="brand" size="md" className="shrink-0">
                    Меню
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </NutriPill>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
