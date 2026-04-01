'use client'

import { useEffect, useState } from 'react'
import { Category, Venue } from '@/types'
import { getCategories, getVenue } from '@/lib/store'
import { mockCategories, mockVenue } from '@/lib/mock-data'
import MenuView from './MenuView'

interface Props {
  slug: string
}

export default function MenuClientWrapper({ slug }: Props) {
  const [venue, setVenue] = useState<Venue | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Берём данные из localStorage, если есть — иначе моковые
    const storedVenue = getVenue()
    const storedCategories = getCategories()

    if (storedCategories.length > 0) {
      setVenue(storedVenue ?? mockVenue)
      setCategories(storedCategories)
    } else {
      setVenue(mockVenue)
      setCategories(mockCategories)
    }

    setLoading(false)
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#FEFEF2' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#9D99B8' }}>Загружаем меню...</p>
        </div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#FEFEF2' }}>
        <p className="text-sm" style={{ color: '#6B6490' }}>Заведение не найдено</p>
      </div>
    )
  }

  return <MenuView venue={venue} categories={categories} />
}