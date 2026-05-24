'use client'

import { useEffect, useState } from 'react'
import { Category, IngredientRef, Venue } from '@/types'
import MenuView from './MenuView'
import Image from 'next/image'

type MenuStatus = 'active' | 'coming_soon' | 'paused'

interface MenuData {
  menuStatus: MenuStatus
  venue: { name: string; logo?: string; description?: string; id?: string; slug?: string; address?: string; workingHours?: string; tags?: string[] }
  categories: Category[]
  ingredientRefs: IngredientRef[]
}

interface Props {
  slug: string
  initialData: MenuData | null
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

export default function MenuClientWrapper({ slug, initialData }: Props) {
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    if (initialData?.menuStatus === 'active') {
      fetch(`/api/menu/${slug}/view`, { method: 'POST' }).catch(() => {})
    }
    // Проверяем владельца только если есть cookie-сессия
    fetch('/api/venue').then(r => r.ok ? r.json() : null).then(venue => {
      if (venue && initialData?.venue && 'id' in initialData.venue) {
        setIsOwner(venue.id === initialData.venue.id)
      }
    }).catch(() => {})
  }, [slug, initialData])

  if (!initialData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FEFEF2' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Заведение не найдено</p>
      </div>
    )
  }

  const { menuStatus, venue, categories, ingredientRefs } = initialData

  if (menuStatus === 'coming_soon' && !isOwner) return <ComingSoonScreen venue={venue} />
  if (menuStatus === 'paused' && !isOwner) return <PausedScreen venue={venue} />

  return (
    <MenuView
      venue={venue as Venue}
      categories={categories}
      isOwner={isOwner}
      ingredientRefs={ingredientRefs ?? []}
    />
  )
}
