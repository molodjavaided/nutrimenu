'use client'

import { useEffect, useState } from 'react'
import { Category, IngredientRef, Venue } from '@/types'
import MenuView from './MenuView'
import Image from 'next/image'

interface Props {
  slug: string
}

type MenuStatus = 'active' | 'coming_soon' | 'paused'

interface MenuData {
  menuStatus: MenuStatus
  venue: { name: string; logo?: string; description?: string; id?: string; slug?: string; address?: string; workingHours?: string; tags?: string[] }
  categories: Category[]
  ingredientRefs: IngredientRef[]
}

function ComingSoonScreen({ venue }: { venue: MenuData['venue'] }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(160deg, #EDE9FE 0%, #FEFEF2 60%)' }}
    >
      {venue.logo && (
        <div className="mb-6 w-20 h-20 rounded-2xl overflow-hidden shadow-md">
          <Image src={venue.logo} alt={venue.name} width={80} height={80} className="object-cover w-full h-full" />
        </div>
      )}
      <h1
        className="mb-3 font-bold"
        style={{ fontFamily: "'Stolzl', sans-serif", fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#2C2950' }}
      >
        {venue.name}
      </h1>
      <div
        className="mb-4 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
        style={{ background: '#EAE7F8', color: '#7C3AED' }}
      >
        Меню в разработке
      </div>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: '#6B6490' }}>
        Мы готовим меню для вас. Скоро здесь появится полный список блюд с составом и КБЖУ.
      </p>
    </div>
  )
}

function PausedScreen({ venue }: { venue: MenuData['venue'] }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(160deg, #F5F5F5 0%, #FEFEF2 60%)' }}
    >
      {venue.logo && (
        <div className="mb-6 w-20 h-20 rounded-2xl overflow-hidden shadow-md opacity-60">
          <Image src={venue.logo} alt={venue.name} width={80} height={80} className="object-cover w-full h-full" />
        </div>
      )}
      <h1
        className="mb-3 font-bold"
        style={{ fontFamily: "'Stolzl', sans-serif", fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#2C2950' }}
      >
        {venue.name}
      </h1>
      <div
        className="mb-4 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
        style={{ background: '#FEF2F2', color: '#DC2626' }}
      >
        Меню приостановлено
      </div>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: '#6B6490' }}>
        Цифровое меню этого заведения временно недоступно.
      </p>
    </div>
  )
}

export default function MenuClientWrapper({ slug }: Props) {
  const [data, setData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/menu/${slug}`).then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      }),
      fetch('/api/venue').then(r => r.ok ? r.json() : null),
    ]).then(([menuData, sessionVenue]) => {
      if (menuData) {
        setData(menuData)
        if (sessionVenue && menuData.venue && sessionVenue.id === menuData.venue.id) {
          setIsOwner(true)
        }
        if (menuData.menuStatus === 'active') {
          fetch(`/api/menu/${slug}/view`, { method: 'POST' }).catch(() => {})
        }
      }
    }).finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FEFEF2' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Загружаем меню...</p>
        </div>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FEFEF2' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Заведение не найдено</p>
      </div>
    )
  }

  // Owner always sees the real menu (preview mode)
  if (data.menuStatus === 'coming_soon' && !isOwner) {
    return <ComingSoonScreen venue={data.venue} />
  }
  if (data.menuStatus === 'paused' && !isOwner) {
    return <PausedScreen venue={data.venue} />
  }

  return (
    <MenuView
      venue={data.venue as Venue}
      categories={data.categories}
      isOwner={isOwner}
      ingredientRefs={data.ingredientRefs ?? []}
    />
  )
}
