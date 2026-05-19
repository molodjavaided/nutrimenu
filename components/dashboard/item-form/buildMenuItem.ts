import { MenuItem, SizeOption, ModifierGroup, VariantGroup, IngredientRef } from '@/types'
import type { AddonGroup, AmountCell, IngredientItem, Size, VariantOption as FormVariantGroup } from './useItemFormState'

/** Снимок состояния формы для сборки MenuItem. */
export interface FormSnapshot {
  mode: 'quick' | 'composition' | 'ttk'
  name: string
  description: string
  photo: string
  photoPosition: 'top' | 'center' | 'bottom'
  price: string
  categoryId: string
  isAvailable: boolean
  allergens: string[]
  // quick
  quickWeight: number
  quickWeightUnit: 'г' | 'мл'
  quickCalories: number
  quickProtein: number
  quickFat: number
  quickCarbs: number
  // ttk
  finalWeight?: number
  servingSize?: number
  // composition / ttk shared
  ingredients: IngredientItem[]
  amounts: AmountCell[]
  sizes: Size[]
  variantGroups: FormVariantGroup[]
  addonGroups: AddonGroup[]
  ingredientRefs: IngredientRef[]
  /** Возвращает суммарные КБЖУ для конкретного размера (closure из useItemFormState). */
  calculateNutriForSize: (sizeId: string) => { calories: number; protein: number; fat: number; carbs: number }
}

interface BuildOptions {
  /** ID for the resulting MenuItem. Caller supplies itemId for edit, new uuid for create, or 'preview' for unsaved preview. */
  id: string
  /** venueId. Server fills real one on save; для preview подойдёт 'preview'. */
  venueId?: string
}

/**
 * Чистая функция: собирает финальный MenuItem из состояния формы.
 * Используется и в handleSave (для POST/PATCH), и в buildPreviewItem (для просмотра без сохранения).
 *
 * Никакой валидации, никаких toast'ов — ввод считается валидным.
 * Если в quick-режиме — возвращает плоский item; иначе — со sizes/variants/modifiers.
 */
export function buildMenuItem(s: FormSnapshot, opts: BuildOptions): MenuItem {
  const id = opts.id
  const venueId = opts.venueId ?? '1'

  const baseCommon = {
    name: s.name,
    description: s.description || undefined,
    photo: s.photo || undefined,
    photoPosition: s.photo ? s.photoPosition : undefined,
    price: s.price ? parseFloat(s.price) : undefined,
    categoryId: s.categoryId,
    venueId,
    isAvailable: s.isAvailable,
    allergens: s.allergens.length > 0 ? s.allergens : undefined,
    creationMode: s.mode,
  }

  if (s.mode === 'quick') {
    return {
      id,
      ...baseCommon,
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

  // ── composition / ttk ──
  const replacedIngredientRefIds = new Set(
    s.variantGroups.map(g => g.replacesIngredientRefId).filter((id): id is string => Boolean(id)),
  )

  const sizesToSave: SizeOption[] = s.sizes.map(size => {
    const composition = s.ingredients.flatMap(ingredient => {
      const amountCell = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
      const amount = amountCell?.amount || 0
      const isReplaced = replacedIngredientRefIds.has(ingredient.ingredientRefId)
      if (amount === 0 && !isReplaced) return []
      return [{
        ingredientId: ingredient.ingredientRefId,
        amount,
        unit: ingredient.unit,
        ...(s.mode === 'ttk' && ingredient.processing && ingredient.processing !== 'raw'
          ? { processing: ingredient.processing }
          : {}),
        ...(s.mode === 'ttk' && ingredient.yieldOverride !== undefined && ingredient.yieldOverride > 0
          ? { yieldOverride: ingredient.yieldOverride }
          : {}),
        ...(ingredient.locked ? { removable: false } : {}),
      }]
    })

    const nutri = s.calculateNutriForSize(size.id)
    const totalWeight = composition.reduce((sum, comp) => {
      const ref = s.ingredientRefs.find(r => r.id === comp.ingredientId)
      const grams = comp.unit === 'шт' && ref?.weightPerUnit ? comp.amount * ref.weightPerUnit : comp.amount
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

  const variantGroupsToSave: VariantGroup[] = s.variantGroups.map(group => {
    const replacedIng = group.replacesIngredientRefId
      ? s.ingredients.find(i => i.ingredientRefId === group.replacesIngredientRefId)
      : null
    const firstSizeReplacedAmount = replacedIng && s.sizes.length > 0
      ? (s.amounts.find(a => a.ingredientId === replacedIng.id && a.sizeId === s.sizes[0].id)?.amount ?? 0)
      : 0
    const firstSizeUnit = s.sizes[0]?.unit ?? 'г'

    return {
      id: group.id,
      label: group.label,
      required: group.required,
      replacesIngredientRefId: group.replacesIngredientRefId,
      options: group.options.map(opt => {
        if (group.replacesIngredientRefId && firstSizeReplacedAmount > 0 && opt.ingredientRefId) {
          const ref = s.ingredientRefs.find(r => r.id === opt.ingredientRefId)
          if (ref) {
            const ratio = firstSizeReplacedAmount / 100
            return {
              id: opt.id,
              ingredientRefId: opt.ingredientRefId,
              label: opt.label,
              weight: firstSizeReplacedAmount,
              weightUnit: firstSizeUnit,
              calories: Math.round(ref.caloriesPer100 * ratio),
              protein: Math.round(ref.proteinPer100 * ratio * 10) / 10,
              fat: Math.round(ref.fatPer100 * ratio * 10) / 10,
              carbs: Math.round(ref.carbsPer100 * ratio * 10) / 10,
              price: opt.price || undefined,
            }
          }
        }
        return {
          id: opt.id,
          ingredientRefId: opt.ingredientRefId || '',
          label: opt.label,
          weight: opt.weight,
          weightUnit: opt.weightUnit,
          calories: opt.calories,
          protein: opt.protein,
          fat: opt.fat,
          carbs: opt.carbs,
          price: opt.price || undefined,
        }
      }),
    }
  })

  const modifierGroupsToSave: ModifierGroup[] = s.addonGroups.map(group => {
    const modifiers = group.addons
      .filter(a => a.ingredientRefId)
      .map(a => {
        const ref = s.ingredientRefs.find(r => r.id === a.ingredientRefId)
        const weight = a.weight && a.weight > 0 ? a.weight : 100
        const ratio = weight / 100
        return {
          id: a.id,
          label: a.label || ref?.name || '',
          ingredientRefId: a.ingredientRefId,
          calories: Math.round((ref?.caloriesPer100 ?? 0) * ratio),
          protein: Math.round((ref?.proteinPer100 ?? 0) * ratio * 10) / 10,
          fat: Math.round((ref?.fatPer100 ?? 0) * ratio * 10) / 10,
          carbs: Math.round((ref?.carbsPer100 ?? 0) * ratio * 10) / 10,
          weight,
          weightUnit: 'г' as const,
          price: a.price || undefined,
        }
      })
    return {
      id: group.id,
      label: group.label,
      multi: true,
      required: false,
      type: 'addon' as const,
      allowCustomGrams: group.allowCustomGrams,
      modifiers,
    }
  }).filter(g => g.modifiers.length > 0)

  const first = sizesToSave[0]
  return {
    id,
    ...baseCommon,
    weight: first?.weight ?? 0,
    weightUnit: first?.weightUnit ?? 'г',
    calories: first?.calories ?? 0,
    protein: first?.protein ?? 0,
    fat: first?.fat ?? 0,
    carbs: first?.carbs ?? 0,
    composition: first?.composition ?? [],
    sizes: sizesToSave,
    variantGroups: variantGroupsToSave.length > 0 ? variantGroupsToSave : undefined,
    modifierGroups: modifierGroupsToSave.length > 0 ? modifierGroupsToSave : undefined,
    finalWeight: s.mode === 'ttk' ? s.finalWeight : undefined,
    servingSize: s.mode === 'ttk' ? s.servingSize : undefined,
  }
}
