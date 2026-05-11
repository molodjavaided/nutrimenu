'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Category, IngredientRef, Venue } from '@/types'
import MenuView from '@/components/menu/MenuView'

export default function DemoPreviewPage() {
  const router = useRouter()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem('nutrimenu_venue')
      const c = localStorage.getItem('nutrimenu_categories')
      if (v) setVenue(JSON.parse(v))
      if (c) setCategories(JSON.parse(c))
    } catch {
      // ignore
    }
    setReady(true)
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FEFEF2' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ background: '#FEFEF2' }}>
        <p className="text-sm" style={{ color: '#9D99B8' }}>Нет данных для предпросмотра</p>
        <button
          onClick={() => router.push('/demo')}
          className="text-sm font-medium px-4 py-2 rounded-xl"
          style={{ background: '#8B5CF6', color: '#fff' }}
        >
          Вернуться к форме
        </button>
      </div>
    )
  }

  return (
    <MenuView
      venue={venue}
      categories={categories}
      isOwner={false}
      ingredientRefs={[] as IngredientRef[]}
    />
  )
}
