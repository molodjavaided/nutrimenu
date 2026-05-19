import { MenuItem, SizeOption, CompositionRow } from '@/types'
import { ItemFormState } from './useItemFormState'

/** Собирает MenuItem из текущего состояния формы — для preview в DishSheet, без сохранения. */
export function buildPreviewItem(s: ItemFormState): MenuItem {
  const base = {
    id: 'preview',
    name: s.name || 'Без названия',
    description: s.description || undefined,
    photo: s.photo || undefined,
    photoPosition: s.photo ? s.photoPosition : undefined,
    price: s.price ? parseFloat(s.price) : undefined,
    categoryId: s.categoryId || '',
    venueId: 'preview',
    isAvailable: s.isAvailable,
    allergens: s.allergens.length > 0 ? s.allergens : undefined,
    creationMode: s.mode,
  }

  if (s.mode === 'quick') {
    return {
      ...base,
      weight: s.quickWeight,
      weightUnit: s.quickWeightUnit,
      calories: s.quickCalories,
      protein: s.quickProtein,
      fat: s.quickFat,
      carbs: s.quickCarbs,
      sizes: [],
      composition: [],
      variantGroups: [],
      modifierGroups: [],
    }
  }

  const sizes: SizeOption[] = s.sizes.map(size => {
    const nutri = s.calculateNutriForSize(size.id)
    const composition: CompositionRow[] = s.ingredients.flatMap(ing => {
      const cell = s.amounts.find(a => a.ingredientId === ing.id && a.sizeId === size.id)
      const amount = cell?.amount || 0
      if (amount === 0) return []
      return [{ ingredientId: ing.ingredientRefId, amount, unit: ing.unit }]
    })
    const totalWeight = composition.reduce((sum, c) => {
      const ref = s.ingredientRefs.find(r => r.id === c.ingredientId)
      const grams = c.unit === 'шт' && ref?.weightPerUnit ? c.amount * ref.weightPerUnit : c.amount
      return sum + grams
    }, 0)
    return {
      id: size.id,
      name: size.name || (s.sizes.length === 1 ? `${totalWeight}${size.unit}` : ''),
      weight: totalWeight,
      weightUnit: size.unit,
      price: size.price,
      calories: nutri.calories,
      protein: nutri.protein,
      fat: nutri.fat,
      carbs: nutri.carbs,
      composition,
      ingredientAmounts: {},
    }
  })

  const first = sizes[0]
  return {
    ...base,
    weight: first?.weight ?? 0,
    weightUnit: first?.weightUnit ?? 'г',
    calories: first?.calories ?? 0,
    protein: first?.protein ?? 0,
    fat: first?.fat ?? 0,
    carbs: first?.carbs ?? 0,
    sizes,
    composition: first?.composition ?? [],
    variantGroups: [],
    modifierGroups: [],
  }
}
