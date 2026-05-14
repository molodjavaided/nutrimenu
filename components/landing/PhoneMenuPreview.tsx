'use client'

import { useState, useMemo } from 'react'
import DishCard from '@/components/menu/DishCard'
import DishSheetContent from '@/components/menu/DishSheetContent'
import NutriTracker from '@/components/menu/NutriTracker'
import { calcNutriTotal } from '@/lib/utils'
import { MenuItem, TrackerItem, SelectedVariants, SelectedModifiers } from '@/types'

const DEMO_ITEMS: MenuItem[] = [
  {
    id: 'demo-cappuccino',
    name: 'Капучино',
    description: 'Эспрессо с нежной молочной пенкой',
    price: 250,
    weight: 300,
    weightUnit: 'мл',
    calories: 120,
    protein: 6,
    fat: 5,
    carbs: 13,
    categoryId: 'demo-cat',
    venueId: 'demo',
    isAvailable: true,
    allergens: ['milk'],
  },
  {
    id: 'demo-carbonara',
    name: 'Паста Карбонара',
    description: 'Спагетти, бекон, яйцо, пармезан, чёрный перец',
    price: 590,
    weight: 320,
    weightUnit: 'г',
    calories: 610,
    protein: 28,
    fat: 24,
    carbs: 72,
    categoryId: 'demo-cat',
    venueId: 'demo',
    isAvailable: true,
    allergens: ['gluten', 'eggs', 'milk'],
  },
]

export default function PhoneMenuPreview() {
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  const nutri = useMemo(() => calcNutriTotal(trackerItems), [trackerItems])

  function getQuantity(itemId: string) {
    return trackerItems.find(t => t.menuItem.id === itemId)?.quantity ?? 0
  }

  function addToTracker(
    item: MenuItem,
    quantity: number,
    selectedVariants: SelectedVariants = {},
    selectedModifiers: SelectedModifiers = {},
    variantLabel: string = '',
  ) {
    setTrackerItems(prev => {
      const existing = prev.find(t => t.menuItem.id === item.id && t.variantLabel === variantLabel)
      if (existing) {
        return prev.map(t =>
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
        resolvedCalories: item.calories,
        resolvedProtein: item.protein,
        resolvedFat: item.fat,
        resolvedCarbs: item.carbs,
        resolvedWeight: item.weight,
        resolvedWeightUnit: item.weightUnit,
        variantLabel,
      }]
    })
  }

  function removeOne(itemId: string) {
    setTrackerItems(prev =>
      prev
        .map(t => t.menuItem.id === itemId ? { ...t, quantity: t.quantity - 1 } : t)
        .filter(t => t.quantity > 0)
    )
  }

  function removeFromTracker(key: string) {
    setTrackerItems(prev =>
      prev.filter(t => `${t.menuItem.id}-${t.variantLabel ?? ''}` !== key)
    )
  }

  return (
    <div
      className="relative rounded-[2.2rem] p-2 shadow-2xl mx-auto"
      style={{
        background: 'linear-gradient(160deg, #2C2950 0%, #1a1730 100%)',
        width: 'min(280px, 100%)',
        aspectRatio: '9 / 19',
      }}
    >
      {/* Нотч */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full z-20"
        style={{ width: 80, height: 20, background: '#1a1730' }}
      />

      {/* Экран */}
      <div
        className="relative w-full h-full rounded-[1.7rem] overflow-hidden flex flex-col"
        style={{ background: '#EAE7F8' }}
      >
        {/* Шапка */}
        <div className="px-4 pt-8 pb-2 shrink-0" style={{ background: '#EAE7F8' }}>
          <p className="text-xs font-bold" style={{ color: '#7C3AED' }}>Plate Demo</p>
          <p className="text-[10px]" style={{ color: '#6B6490' }}>Кафе на Пушкинской</p>
        </div>

        {/* Список блюд */}
        <div className="flex-1 overflow-y-auto px-3 min-h-0">
          <p className="text-[10px] font-semibold mb-1 mt-1" style={{ color: '#6B6490' }}>Напитки & Паста</p>
          {DEMO_ITEMS.map(item => (
            <DishCard
              key={item.id}
              item={item}
              quantity={getQuantity(item.id)}
              onOpen={() => setSelectedItem(item)}
              onAdd={() => addToTracker(item, 1)}
              onRemove={() => removeOne(item.id)}
            />
          ))}
        </div>

        {/* Трекер КБЖУ */}
        {trackerItems.length > 0 && (
          <div className="px-3 pb-3 shrink-0">
            <NutriTracker
              items={trackerItems}
              nutri={nutri}
              onRemove={removeFromTracker}
            />
          </div>
        )}

        {/* Full DishSheet inline — рендерим контент 1:1 как мобильная версия */}
        {selectedItem && (
          <div className="absolute inset-0 z-30" style={{ background: '#1C1726' }}>
            <DishSheetContent
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onAdd={(item, qty, variants, modifiers, label) => {
                addToTracker(item, qty, variants, modifiers, label)
                setSelectedItem(null)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
