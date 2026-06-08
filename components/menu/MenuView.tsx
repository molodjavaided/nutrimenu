'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Category, IngredientRef, MenuItem, TrackerItem, Venue } from '@/types'
import { SelectedModifiers, SelectedVariants } from '@/types'
import { calcNutriTotal } from '@/lib/utils'
import CategoryTabs from './CategoryTabs'
import DishCard from './DishCard'
import DishSheet from './DishSheet'
import NutriTracker from './NutriTracker'
import VenueHeader from './VenueHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import GuestFeedbackLink from '@/components/feedback/GuestFeedbackLink'
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'

interface Props {
  venue: Venue
  categories: Category[]
  isOwner?: boolean
  ingredientRefs?: IngredientRef[]
}

export default function MenuView({ venue, categories, isOwner = false, ingredientRefs = [] }: Props) {
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

  // Bottom-sheet ↔ history sync: opening the dish sheet pushes a history entry so the
  // mobile back-gesture (or hardware Back) closes the sheet instead of leaving the menu.
  useEffect(() => {
    if (!sheetOpen) return
    window.history.pushState({ ...window.history.state, dishSheet: true }, '')
    const onPop = () => setSheetOpen(false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [sheetOpen])

  function closeSheet() {
    // Pop our pushed entry (fires popstate → setSheetOpen(false)) so no dangling history state.
    if (typeof window !== 'undefined' && window.history.state?.dishSheet) {
      window.history.back()
    } else {
      setSheetOpen(false)
    }
  }

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
  closeSheet()
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
    <LayoutGroup>
    <div className="min-h-screen bg-background">
      <div className="max-w-lg md:max-w-5xl mx-auto">

        <VenueHeader venue={venue} isOwner={isOwner} />

        {/* Sticky: поиск + табы */}
        <div
          className="sticky top-0 z-20 pt-1 pb-0"
          style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}
        >
          <div className="px-4 pb-2 max-w-lg md:max-w-2xl mx-auto">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Поиск блюда..."
            />
          </div>
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>

        {/* Список блюд */}
        <div className={`px-4 ${trackerItems.length > 0 ? 'pb-52' : 'pb-24'}`}>
          {filteredCategories.length === 0 ? (
            <p className="text-center py-12 text-sm text-text-muted">
              Ничего не найдено
            </p>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="mb-8">
                <h2
                  className="font-heading text-xl md:text-2xl font-medium tracking-tight pb-3 mb-3"
                  style={{ color: 'var(--color-text-primary)', borderBottom: '0.5px solid rgba(139,92,246,0.15)' }}
                >
                  {cat.name}
                </h2>
                <motion.div
                  layout
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {cat.items.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{
                          duration: 0.28,
                          delay: Math.min(idx * 0.03, 0.24),
                          ease: [0.22, 0.61, 0.36, 1],
                        }}
                      >
                        <DishCard
                          item={item}
                          quantity={
                            trackerItems.find((t) => t.menuItem.id === item.id)
                              ?.quantity ?? 0
                          }
                          onOpen={() => handleOpenDish(item)}
                          onAdd={() => handleAddToTracker(item, 1)}
                          onRemove={() => handleRemoveOne(item.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      {trackerItems.length === 0 && (
        <div className="py-8 flex justify-center gap-3 flex-wrap">
          <GuestFeedbackLink venueSlug={venue.slug} />
          <Link
            href="/auth/login"
            className="text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
            style={{ color: '#B0A6DF', background: 'rgba(176,166,223,0.1)' }}
          >
            Войти как владелец
          </Link>
        </div>
      )}

      {/* Bottom sheet */}
      <DishSheet
        item={selectedDish}
        open={sheetOpen}
        onClose={closeSheet}
        onAdd={handleAddToTracker}
        venueIngredientRefs={ingredientRefs}
      />

      {/* Sticky NutriTracker */}
      {trackerItems.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 px-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto pb-1">
            <NutriTracker
              items={trackerItems}
              nutri={nutri}
              onRemove={handleRemoveFromTracker}
            />
          </div>
        </div>
      )}
    </div>
    </LayoutGroup>
  )
}