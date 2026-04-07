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

  const nutri = useMemo(() => {
  console.log('trackerItems:', trackerItems)
  const result = calcNutriTotal(trackerItems)
  console.log('Рассчитанный nutri:', result)
  return result
}, [trackerItems])

  function handleAddToTracker(
  item: MenuItem,
  quantity: number,
  selectedVariants: SelectedVariants = {},
  selectedModifiers: SelectedModifiers = {},
  variantLabel: string = ''
) {
  // Ручной расчёт КБЖУ с учётом вариантов
  let totalCalories = item.calories
  let totalProtein = item.protein
  let totalFat = item.fat
  let totalCarbs = item.carbs

  // Добавляем КБЖУ выбранных вариантов
  for (const group of item.variantGroups ?? []) {
    const selectedId = selectedVariants[group.id]
    const option = group.options.find(o => o.id === selectedId)
    if (option) {
      totalCalories += option.calories
      totalProtein += option.protein
      totalFat += option.fat
      totalCarbs += option.carbs
    }
  }

  // Добавляем КБЖУ выбранных добавок (если нужно)
  for (const group of item.modifierGroups ?? []) {
    const selectedId = selectedModifiers[group.id]
    if (!selectedId) continue

    if (group.multi && Array.isArray(selectedId)) {
      for (const id of selectedId) {
        const modifier = group.modifiers.find(m => m.id === id)
        if (modifier) {
          totalCalories += modifier.calories
          totalProtein += modifier.protein
          totalFat += modifier.fat
          totalCarbs += modifier.carbs
        }
      }
    } else if (typeof selectedId === 'string') {
      const modifier = group.modifiers.find(m => m.id === selectedId)
      if (modifier) {
        totalCalories += modifier.calories
        totalProtein += modifier.protein
        totalFat += modifier.fat
        totalCarbs += modifier.carbs
      }
    }
  }

  // Умножаем на количество
const resolved = {
  calories: totalCalories * quantity,
  protein: Math.round((totalProtein * quantity) * 10) / 10,
  fat: Math.round((totalFat * quantity) * 10) / 10,
  carbs: Math.round((totalCarbs * quantity) * 10) / 10,
  weight: item.weight,
  weightUnit: item.weightUnit,
}

console.log('Добавляем в трекер:', { resolved, variantLabel }) // ← добавить

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
  console.log('Открыто блюдо:', item)
  console.log('КБЖУ блюда:', item.calories, item.protein, item.fat, item.carbs)
  console.log('Варианты:', item.variantGroups)
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