'use client'

import { useMemo, useState } from 'react'
import { Category, MenuItem, TrackerItem, Venue } from '@/types'
import { resolveNutri } from '@/lib/utils'
import { SelectedModifiers, SelectedVariants } from '@/types'
import { calcNutriTotal } from '@/lib/utils'
import CategoryTabs from './CategoryTabs'
import DishCard from './DishCard'
import DishSheet from './DishSheet'
import NutriTracker from './NutriTracker'
import VenueHeader from './VenueHeader'

interface Props {
  venue: Venue
  categories: Category[]
}

export default function MenuView({ venue, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([])
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => ({
        ...cat,
        items: (cat.items ?? []).filter((item) => {
          const matchCat =
            activeCategory === 'all' || cat.id === activeCategory
          const matchSearch = item.name
            .toLowerCase()
            .includes(search.toLowerCase())
          return matchCat && matchSearch && item.isAvailable
        }),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [categories, activeCategory, search])

  const nutri = useMemo(() => calcNutriTotal(trackerItems), [trackerItems])

  function handleAddToTracker(
  item: MenuItem,
  quantity: number,
  selectedVariants: SelectedVariants = {},
  selectedModifiers: SelectedModifiers = {},
  variantLabel: string = ''
) {
  const resolved = resolveNutri(item, selectedVariants, selectedModifiers)
  const trackerId = `${item.id}-${variantLabel}`

  setTrackerItems((prev) => {
    const existing = prev.find((t) => t.menuItem.id === item.id && t.variantLabel === variantLabel)
    if (existing) {
      return prev.map((t) =>
        t.menuItem.id === item.id && t.variantLabel === variantLabel
          ? { ...t, quantity: t.quantity + quantity }
          : t
      )
    }
    return [...prev, {
      menuItem: item,
      quantity,
      selectedVariants,
      selectedModifiers,
      resolvedCalories: resolved.calories,
      resolvedProtein: resolved.protein,
      resolvedFat: resolved.fat,
      resolvedCarbs: resolved.carbs,
      resolvedWeight: resolved.weight,
      resolvedWeightUnit: resolved.weightUnit,
      variantLabel,
    }]
  })
  setSheetOpen(false)
}

  function handleRemoveOne(itemId: string) {
    setTrackerItems((prev) =>
      prev
        .map((t) =>
          t.menuItem.id === itemId
            ? { ...t, quantity: t.quantity - 1 }
            : t
        )
        .filter((t) => t.quantity > 0)
    )
  }

  function handleRemoveFromTracker(key: string) {
  setTrackerItems(prev =>
    prev.filter(t => `${t.menuItem.id}-${t.variantLabel ?? ''}` !== key)
  )
}

  function handleOpenDish(item: MenuItem) {
    setSelectedDish(item)
    setSheetOpen(true)
  }

  return (
    <div className="min-h-screen" style={{ background: '#FEFEF2' }}>
      <div className="max-w-lg mx-auto">

        <VenueHeader venue={venue} />

        {/* Поиск */}
        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-2 px-3 h-10 rounded-xl"
            style={{
              background: '#EAE7F8',
              border: '0.5px solid rgba(176,166,223,0.4)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="#9D99B8" strokeWidth="1.3" />
              <path
                d="M11 11L14 14"
                stroke="#9D99B8"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск блюда..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#2C2950' }}
            />
            {search.length > 0 && (
              <button
                onClick={() => setSearch('')}
                className="text-xs"
                style={{ color: '#9D99B8' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Табы категорий */}
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        {/* Трекер КБЖУ */}
        {trackerItems.length > 0 && (
          <div className="px-4 pb-3">
            <NutriTracker
              items={trackerItems}
              nutri={nutri}
              onRemove={handleRemoveFromTracker}
            />
          </div>
        )}

        {/* Список блюд */}
        <div className="px-4 pb-24">
          {filteredCategories.length === 0 ? (
            <p
              className="text-center py-12 text-sm"
              style={{ color: '#9D99B8' }}
            >
              Ничего не найдено
            </p>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="mb-6">
                <p
                  className="text-xs font-medium uppercase tracking-wider pb-2 mb-1"
                  style={{
                    color: '#9D99B8',
                    borderBottom: '0.5px solid rgba(176,166,223,0.2)',
                  }}
                >
                  {cat.name}
                </p>
                {cat.items.map((item) => (
                  <DishCard
                    key={item.id}
                    item={item}
                    quantity={
                      trackerItems.find((t) => t.menuItem.id === item.id)
                        ?.quantity ?? 0
                    }
                    onOpen={() => handleOpenDish(item)}
                    onAdd={() => handleAddToTracker(item, 1)}
                    onRemove={() => handleRemoveOne(item.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom sheet */}
      <DishSheet
        item={selectedDish}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={handleAddToTracker}
      />
    </div>
  )
}