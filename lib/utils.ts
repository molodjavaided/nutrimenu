import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { MenuItem, NutriTotal, SelectedModifiers, SelectedVariants, TrackerItem, ModifierGroup, CompositionRow, IngredientRef, Modifier } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function roundNutri(value: number): number {
  return Math.round(value * 10) / 10
}

// Маппинг КБЖУ для боула по начинке + крупе
const bowlNutri: Record<string, Record<string, { calories: number; protein: number; fat: number; carbs: number }>> = {
  veg:     { bulgur: { calories: 220, protein: 8, fat: 9.5, carbs: 23 }, quinoa: { calories: 259, protein: 9.5, fat: 11, carbs: 28 }, buckwheat: { calories: 232, protein: 8, fat: 10, carbs: 27 } },
  chicken: { bulgur: { calories: 332, protein: 20.5, fat: 16, carbs: 23 }, quinoa: { calories: 371, protein: 22, fat: 18, carbs: 28 }, buckwheat: { calories: 344, protein: 21, fat: 16.5, carbs: 28 } },
  salmon:  { bulgur: { calories: 314, protein: 15, fat: 16, carbs: 24 }, quinoa: { calories: 353, protein: 17, fat: 18, carbs: 29 }, buckwheat: { calories: 326, protein: 16, fat: 17, carbs: 29 } },
  shrimp:  { bulgur: { calories: 260, protein: 16, fat: 10, carbs: 24 }, quinoa: { calories: 299, protein: 17, fat: 12, carbs: 29 }, buckwheat: { calories: 271, protein: 16, fat: 10, carbs: 28 } },
  tuna:    { bulgur: { calories: 285, protein: 20.7, fat: 9, carbs: 32.3 }, quinoa: { calories: 345, protein: 22.6, fat: 11, carbs: 40 }, buckwheat: { calories: 322, protein: 20.8, fat: 13, carbs: 32.8 } },
}

export function resolveNutri(
  item: MenuItem,
  selectedVariants: SelectedVariants,
  selectedModifiers: SelectedModifiers
) {
  let calories = item.calories
  let protein = item.protein
  let fat = item.fat
  let carbs = item.carbs
  let weight = item.weight
  let weightUnit = item.weightUnit

  // Боул — особая логика
  if (item.id === 'bowl') {
    const filling = selectedVariants['filling']
    const grain = selectedVariants['grain']
    if (filling && grain && bowlNutri[filling]?.[grain]) {
      const n = bowlNutri[filling][grain]
      calories = n.calories; protein = n.protein; fat = n.fat; carbs = n.carbs
      weight = 400
    }
    return { calories, protein, fat, carbs, weight, weightUnit }
  }

  // Варианты (объём, начинка, формат)
  for (const group of item.variantGroups ?? []) {
    const selectedId = selectedVariants[group.id]
    const option = group.options.find(o => o.id === selectedId)
    if (option && option.calories > 0) {
      calories = option.calories
      protein = option.protein
      fat = option.fat
      carbs = option.carbs
      weight = option.weight
      weightUnit = option.weightUnit
    }
  }

// Одиночные добавки
for (const group of item.modifierGroups ?? []) {
  if (group.multi) continue
  const selectedId = selectedModifiers[group.id]
  if (!selectedId || selectedId === true) continue

  const modifier = group.modifiers.find(m => m.id === selectedId)
  if (!modifier) continue

  if (group.type === 'replace' && group.replacesIngredientId) {
    // Режим замены — ничего не прибавляем к базовым КБЖУ здесь,
    // замена считается отдельно через состав (см. resolveNutriFromComposition)
    continue
  }

  if (group.calcByMl && group.mlPerVariant && group.linkedVariantGroupId) {
    const linkedVariantId = selectedVariants[group.linkedVariantGroupId]
    const mlAmount = linkedVariantId
      ? (group.mlPerVariant[linkedVariantId] ?? 0)
      : 0

    if (mlAmount > 0) {
      const ratio = mlAmount / 100
      calories += Math.round(modifier.calories * ratio)
      protein  += Math.round(modifier.protein  * ratio * 10) / 10
      fat      += Math.round(modifier.fat      * ratio * 10) / 10
      carbs    += Math.round(modifier.carbs    * ratio * 10) / 10
    }
  } else {
    calories += modifier.calories
    protein  += modifier.protein
    fat      += modifier.fat
    carbs    += modifier.carbs
  }
}

  // Мультиселект добавки
  for (const group of item.modifierGroups ?? []) {
    if (!group.multi) continue
    const selected = selectedModifiers[group.id]
    if (Array.isArray(selected)) {
      for (const sid of selected) {
        const modifier = group.modifiers.find(m => m.id === sid)
        if (modifier) {
          calories += modifier.calories
          protein += modifier.protein
          fat += modifier.fat
          carbs += modifier.carbs
        }
      }
    }
  }

  return { calories, protein, fat, carbs, weight, weightUnit }
}

export function buildVariantLabel(
  item: MenuItem,
  selectedVariants: SelectedVariants,
  selectedModifiers: SelectedModifiers
): string {
  const parts: string[] = []
  for (const group of item.variantGroups ?? []) {
    const opt = group.options.find(o => o.id === selectedVariants[group.id])
    if (opt) parts.push(opt.label)
  }
  for (const group of item.modifierGroups ?? []) {
    if (group.id === 'milk' || group.id === 'milk-add') {
      const mod = group.modifiers.find(m => m.id === selectedModifiers[group.id])
      if (mod && mod.id !== 'milk-classic' && mod.id !== 'milk-add-no') parts.push(mod.label)
    }
  }
  return parts.join(', ')
}

// ← ЭТО БЫЛО НУЖНО ДОБАВИТЬ — считает итого по трекеру
export function calcNutriTotal(items: TrackerItem[]): NutriTotal {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.resolvedCalories * item.quantity,
      protein:  total.protein  + item.resolvedProtein  * item.quantity,
      fat:      total.fat      + item.resolvedFat       * item.quantity,
      carbs:    total.carbs    + item.resolvedCarbs     * item.quantity,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )
}

// Расчёт КБЖУ из состава с учётом замен ингредиентов
export function resolveNutriFromComposition(
  composition: CompositionRow[],
  ingredientRefs: IngredientRef[],
  modifierGroups: ModifierGroup[],
  selectedModifiers: SelectedModifiers
): { calories: number; protein: number; fat: number; carbs: number } {
  // Строим карту замен: replacesIngredientId → modifier
  const replacements = new Map<string, { modifier: Modifier; amount: number; unit: 'г' | 'мл' }>()

  for (const group of modifierGroups) {
    if (group.type !== 'replace' || !group.replacesIngredientId) continue
    const selectedId = selectedModifiers[group.id]
    if (!selectedId || selectedId === true) continue
    const modifier = group.modifiers.find(m => m.id === selectedId)
    if (!modifier) continue

    // Находим количество заменяемого ингредиента в составе
    const originalRow = composition.find(c => c.ingredientId === group.replacesIngredientId)
    if (originalRow) {
      replacements.set(group.replacesIngredientId, {
        modifier,
        amount: originalRow.amount,
        unit: originalRow.unit,
      })
    }
  }

  let calories = 0, protein = 0, fat = 0, carbs = 0

  for (const row of composition) {
    // Если этот ингредиент заменён — используем данные замены
    const replacement = replacements.get(row.ingredientId)
    if (replacement) {
      const ratio = replacement.amount / 100
      calories += replacement.modifier.calories * ratio
      protein  += replacement.modifier.protein  * ratio
      fat      += replacement.modifier.fat      * ratio
      carbs    += replacement.modifier.carbs    * ratio
      continue
    }

    // Иначе берём из справочника
    const ref = ingredientRefs.find(r => r.id === row.ingredientId)
    if (!ref || !row.amount) continue
    const ratio = row.amount / 100
    calories += ref.caloriesPer100 * ratio
    protein  += ref.proteinPer100  * ratio
    fat      += ref.fatPer100      * ratio
    carbs    += ref.carbsPer100    * ratio
  }

  return {
    calories: Math.round(calories),
    protein:  Math.round(protein  * 10) / 10,
    fat:      Math.round(fat      * 10) / 10,
    carbs:    Math.round(carbs    * 10) / 10,
  }
}