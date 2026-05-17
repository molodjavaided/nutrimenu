import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { MenuItem, NutriTotal, SelectedModifiers, SelectedVariants, TrackerItem, ModifierGroup, CompositionRow, IngredientRef, Modifier } from '@/types'
import { asCategory, getColdLossPercent, getYieldCoef } from './cooking-coefficients'

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
  if (group.allowCustomGrams) continue  // граммы вводятся клиентом, здесь не считаем
  if (group.multi) continue
  const selectedId = selectedModifiers[group.id]
  if (!selectedId || selectedId === true) continue

  const modifier = group.modifiers.find(m => m.id === selectedId)
  if (!modifier) continue

  if (group.type === 'replace' && group.replacesIngredientId) {
    // Режим замены через состав — считается отдельно в resolveNutriFromComposition
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
  } else if (group.required) {
    // Обязательная одиночная группа = замена ингредиента.
    // Первый вариант в списке — эталон (уже учтён в базовом КБЖУ блюда).
    // Применяем дельту: выбранное − эталонное.
    const defaultMod = group.modifiers[0]
    calories += modifier.calories - defaultMod.calories
    protein  += modifier.protein  - defaultMod.protein
    fat      += modifier.fat      - defaultMod.fat
    carbs    += modifier.carbs    - defaultMod.carbs
  } else {
    // Необязательная группа — обычная добавка
    calories += modifier.calories
    protein  += modifier.protein
    fat      += modifier.fat
    carbs    += modifier.carbs
  }
}

  // Мультиселект добавки
  for (const group of item.modifierGroups ?? []) {
    if (group.allowCustomGrams) continue
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
      protein: total.protein + item.resolvedProtein * item.quantity,
      fat: total.fat + item.resolvedFat * item.quantity,
      carbs: total.carbs + item.resolvedCarbs * item.quantity,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )
}

/**
 * Recursively resolve the per-100g nutrition for an IngredientRef.
 * For mono ingredients returns stored values unchanged.
 * For composite ingredients sums component contributions and normalises to 100g.
 * `visited` guards against circular dependencies.
 */
export function resolveIngredientPer100(
  ref: IngredientRef,
  allRefs: IngredientRef[],
  visited: Set<string> = new Set()
): { caloriesPer100: number; proteinPer100: number; fatPer100: number; carbsPer100: number } {
  if (ref.type !== 'composite' || !ref.composition?.length) {
    return {
      caloriesPer100: ref.caloriesPer100,
      proteinPer100:  ref.proteinPer100,
      fatPer100:      ref.fatPer100,
      carbsPer100:    ref.carbsPer100,
    }
  }

  if (visited.has(ref.id)) {
    // Circular dependency — return zeros to break the cycle
    return { caloriesPer100: 0, proteinPer100: 0, fatPer100: 0, carbsPer100: 0 }
  }

  const next = new Set(visited).add(ref.id)
  let cal = 0, pro = 0, fat = 0, car = 0, totalWeight = 0

  for (const row of ref.composition) {
    if (!row.amount) continue
    const component = allRefs.find(r => r.id === row.ingredientId)
    if (!component) continue
    const n = resolveIngredientPer100(component, allRefs, next)
    const effectiveGrams = (row.unit === 'шт' && component.weightPerUnit)
      ? row.amount * component.weightPerUnit
      : row.amount
    const ratio = effectiveGrams / 100
    cal += n.caloriesPer100 * ratio
    pro += n.proteinPer100  * ratio
    fat += n.fatPer100      * ratio
    car += n.carbsPer100    * ratio
    totalWeight += effectiveGrams
  }

  if (totalWeight === 0) return { caloriesPer100: 0, proteinPer100: 0, fatPer100: 0, carbsPer100: 0 }

  const norm = 100 / totalWeight
  return {
    caloriesPer100: Math.round(cal * norm),
    proteinPer100:  Math.round(pro * norm * 10) / 10,
    fatPer100:      Math.round(fat * norm * 10) / 10,
    carbsPer100:    Math.round(car * norm * 10) / 10,
  }
}

/**
 * Эффективный «вклад» строки состава в итоговое блюдо с учётом обработки.
 * Возвращает калории/БЖУ, который ингредиент приносит в блюдо, и его вклад в финальный вес.
 *
 * Математика:
 *  - brutto = effective grams (с учётом weightPerUnit для шт)
 *  - netto  = brutto × (1 − coldLoss%)
 *  - yieldFactor = коэффициент выхода по способу обработки
 *  - finalGrams = netto × yieldFactor (масса, которая попадёт в готовое блюдо)
 *  - Калории «не теряются» при тепловой обработке (вода нейтральна), поэтому считаются от netto.
 *  - Исключение: масло. Для категории oil + жарка → в блюдо попадает только oilAbsorption доля
 *    и массы, и калорий (остальное остаётся на сковороде).
 */
export function resolveCompositionRowContribution(
  row: CompositionRow,
  ref: IngredientRef,
  per100: { caloriesPer100: number; proteinPer100: number; fatPer100: number; carbsPer100: number }
): { calories: number; protein: number; fat: number; carbs: number; finalGrams: number } {
  const brutto = (row.unit === 'шт' && ref.weightPerUnit)
    ? row.amount * ref.weightPerUnit
    : row.amount

  const category = asCategory(ref.category)
  const processing = row.processing ?? 'raw'

  // Особый случай: масло при жарке/фритюре — в блюдо идёт только впитанная часть
  if (category === 'oil' && (processing === 'fry' || processing === 'deep_fry' || processing === 'bake')) {
    const absorb = row.oilAbsorption ?? row.yieldOverride
      ?? ref.yieldCoefficients?.[processing]
      ?? getYieldCoef(processing, undefined, undefined, 'oil')
    const ratio = (brutto * absorb) / 100
    return {
      calories: per100.caloriesPer100 * ratio,
      protein:  per100.proteinPer100  * ratio,
      fat:      per100.fatPer100      * ratio,
      carbs:    per100.carbsPer100    * ratio,
      finalGrams: brutto * absorb,
    }
  }

  const coldLoss = getColdLossPercent(row.coldLossOverride, ref.coldLossPercent, category)
  const netto = brutto * (1 - coldLoss / 100)
  const yieldFactor = processing === 'raw'
    ? 1
    : getYieldCoef(processing, row.yieldOverride, ref.yieldCoefficients, category)

  const ratio = netto / 100
  return {
    calories: per100.caloriesPer100 * ratio,
    protein:  per100.proteinPer100  * ratio,
    fat:      per100.fatPer100      * ratio,
    carbs:    per100.carbsPer100    * ratio,
    finalGrams: netto * yieldFactor,
  }
}

/**
 * Оценить финальный вес блюда по составу (для подсказки «≈ X г» в форме).
 */
export function expectedDishYield(
  composition: CompositionRow[],
  ingredientRefs: IngredientRef[]
): number {
  let total = 0
  for (const row of composition) {
    const ref = ingredientRefs.find(r => r.id === row.ingredientId)
    if (!ref || !row.amount) continue
    const per100 = resolveIngredientPer100(ref, ingredientRefs)
    total += resolveCompositionRowContribution(row, ref, per100).finalGrams
  }
  return Math.round(total)
}

/**
 * Себестоимость блюда (руб) и порции по pricePerKg ингредиентов.
 * Считается от веса БРУТТО — ресторан платит за грязный продукт.
 */
export function resolveCostOfDish(
  composition: CompositionRow[],
  ingredientRefs: IngredientRef[]
): { totalCost: number; missingPrices: string[] } {
  let totalCost = 0
  const missingPrices: string[] = []
  for (const row of composition) {
    const ref = ingredientRefs.find(r => r.id === row.ingredientId)
    if (!ref || !row.amount) continue
    if (ref.pricePerKg === undefined || ref.pricePerKg === null) {
      missingPrices.push(ref.name)
      continue
    }
    const brutto = (row.unit === 'шт' && ref.weightPerUnit)
      ? row.amount * ref.weightPerUnit
      : row.amount
    totalCost += (brutto / 1000) * ref.pricePerKg
  }
  return { totalCost: Math.round(totalCost * 100) / 100, missingPrices }
}

// Расчёт КБЖУ из состава с учётом замен ингредиентов
export function resolveNutriFromComposition(
  composition: CompositionRow[],
  ingredientRefs: IngredientRef[],
  modifierGroups: ModifierGroup[],
  selectedModifiers: SelectedModifiers,
  options?: { finalWeight?: number }
): { calories: number; protein: number; fat: number; carbs: number } {
  // Строим карту замен: replacesIngredientId → modifier
  const replacements = new Map<string, { modifier: Modifier; amount: number; unit: 'г' | 'мл' | 'шт' | 'кг' | 'л' }>()

  for (const group of modifierGroups) {
    if (group.type !== 'replace' || !group.replacesIngredientId) continue
    const selectedId = selectedModifiers[group.id]
    if (!selectedId || selectedId === true) continue
    const modifier = group.modifiers.find(m => m.id === selectedId)
    if (!modifier) continue

    const originalRow = composition.find(c => c.ingredientId === group.replacesIngredientId)
    if (originalRow) {
      replacements.set(group.replacesIngredientId, {
        modifier,
        amount: originalRow.amount,
        unit: originalRow.unit,
      })
    }
  }

  // options.finalWeight зарезервирован для будущих сценариев нормализации
  // (например, отображение КБЖУ на 100 г готового блюда), здесь же возвращаем
  // абсолютные значения — нормализацию делает форма через item.weight.
  void options
  let calories = 0, protein = 0, fat = 0, carbs = 0

  for (const row of composition) {
    const replacement = replacements.get(row.ingredientId)
    if (replacement) {
      const ratio = replacement.amount / 100
      calories += replacement.modifier.calories * ratio
      protein  += replacement.modifier.protein  * ratio
      fat      += replacement.modifier.fat      * ratio
      carbs    += replacement.modifier.carbs    * ratio
      continue
    }

    const ref = ingredientRefs.find(r => r.id === row.ingredientId)
    if (!ref || !row.amount) continue
    const per100 = resolveIngredientPer100(ref, ingredientRefs)
    const contribution = resolveCompositionRowContribution(row, ref, per100)
    calories += contribution.calories
    protein  += contribution.protein
    fat      += contribution.fat
    carbs    += contribution.carbs
  }

  return {
    calories: Math.round(calories),
    protein:  Math.round(protein  * 10) / 10,
    fat:      Math.round(fat      * 10) / 10,
    carbs:    Math.round(carbs    * 10) / 10,
  }
}