'use client'

import { useEffect, useState } from 'react'
import { Category, Venue } from '@/types'
import MenuView from './MenuView'

interface Props {
  slug: string
}

export default function MenuClientWrapper({ slug }: Props) {
  const [venue, setVenue] = useState<Venue | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/menu/${slug}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(data => {
        if (data) {
          setVenue(data.venue)
          setCategories(data.categories)
        }
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FEFEF2' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#9D99B8' }}>Загружаем меню...</p>
        </div>
      </div>
    )
  }

  if (notFound || !venue) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FEFEF2' }}>
        <p className="text-sm" style={{ color: '#6B6490' }}>Заведение не найдено</p>
      </div>
    )
  }

  return <MenuView venue={venue} categories={categories} />
}
