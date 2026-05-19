export interface Venue {
  id: string
  name: string
  slug: string
  logo?: string
  country?: string
  city?: string
  address?: string
  description?: string
  workingHours?: string
  tags?: string[]
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason?: string | null
  allowAdminEdit?: boolean
}

export interface Category {
  id: string
  name: string
  venueId: string
  order: number
  items?: MenuItem[]
}

export interface VariantChoice {
  id: string
  ingredientRefId?: string
  label: string
  weight: number
  weightUnit: 'г' | 'мл'
  calories: number
  protein: number
  fat: number
  carbs: number
  price?: number
}

export interface VariantGroup {
  id: string
  label: string
  required: boolean
  options: VariantChoice[]
  replacesIngredientRefId?: string
}

export interface ModifierSubOption {
  id: string
  label: string
  calories: number
  protein: number
  fat: number
  carbs: number
}

export interface Modifier {
  id: string
  label: string
  ingredientRefId?: string
  calories: number
  protein: number
  fat: number
  carbs: number
  weight: number
  weightUnit: 'г' | 'мл'
  price?: number
  allowPortions?: boolean
  maxPortions?: number
  subOptions?: ModifierSubOption[]
}

export interface ModifierGroup {
  id: string
  label: string
  multi: boolean
  required: boolean
  modifiers: Modifier[]
  type?: 'addon' | 'replace'
  replacesIngredientId?: string
  calcByMl?: boolean
  mlPerVariant?: Record<string, number>
  linkedVariantGroupId?: string
  allowCustomGrams?: boolean
}

// Способ тепловой/холодной обработки ингредиента в блюде
export type ProcessingType = 'raw' | 'boil' | 'fry' | 'stew' | 'bake' | 'deep_fry' | 'steam'

// Коэффициенты выхода (готовый вес / сырой нетто) по способам обработки
export interface YieldCoefficients {
  boil?: number       // варка (крупы ~2.5, мясо ~0.6, овощи ~0.9)
  fry?: number        // жарка (мясо ~0.65)
  stew?: number       // тушение (овощи ~0.8)
  bake?: number       // запекание
  deep_fry?: number   // фритюр
  steam?: number      // на пару
}

// Строка состава блюда
export interface CompositionRow {
  ingredientId: string
  amount: number              // основной вес (брутто, если используется ТТК-режим)
  unit: 'г' | 'мл' | 'шт' | 'кг' | 'л'
  // ТТК-поля (опциональны; работают, если заданы)
  processing?: ProcessingType        // способ обработки
  coldLossOverride?: number          // % холодных потерь (перебивает дефолт по ингредиенту)
  yieldOverride?: number             // коэффициент выхода (перебивает дефолт по ингредиенту)
  oilAbsorption?: number             // 0..1 — доля впитанного масла (для категории oil)
  removable?: boolean                // false = гость не может убрать (тесто, основа). По умолчанию (undefined) — можно убрать.
}

// Один объём/размер блюда
export interface SizeOption {
  id: string
  name?: string
  weight: number
  weightUnit: 'г' | 'мл'
  price?: number
  calories: number
  protein: number
  fat: number
  carbs: number
  composition: CompositionRow[]
  ingredientAmounts?: Record<string, { amount: number; unit: 'г' | 'мл' | 'шт' | 'кг' | 'л' }>
}

// Ингредиент блюда (простой, используется в ItemForm)
export interface Ingredient {
  id: string
  name: string
}

export interface MenuItem {
  id: string
  name: string
  description?: string
  photo?: string
  photoPosition?: 'top' | 'center' | 'bottom'
  price?: number
  weight: number
  weightUnit: 'г' | 'мл'
  calories: number
  protein: number
  fat: number
  carbs: number
  sizes?: SizeOption[]
  categoryId: string
  venueId: string
  isAvailable: boolean
  allergens?: string[]
  composition?: CompositionRow[]
  variantGroups?: VariantGroup[]
  modifierGroups?: ModifierGroup[]
  // ТТК-расширение
  creationMode?: 'quick' | 'composition' | 'ttk'  // как было создано (для UI-маршрутизации)
  finalWeight?: number       // финальный вес готового блюда, г. Если задан — КБЖУ/100г считается от него.
  servingSize?: number       // г на одну порцию (для расчёта количества порций и себестоимости порции)
}

export interface SelectedVariants {
  [groupId: string]: string
}

export interface SelectedModifiers {
  [modifierId: string]: string | true | number
}

export interface TrackerItem {
  menuItem: MenuItem
  quantity: number
  selectedVariants?: SelectedVariants
  selectedModifiers?: SelectedModifiers
  resolvedCalories: number
  resolvedProtein: number
  resolvedFat: number
  resolvedCarbs: number
  resolvedWeight: number
  resolvedWeightUnit: 'г' | 'мл'
  variantLabel?: string
}

export interface NutriTotal {
  calories: number
  protein: number
  fat: number
  carbs: number
}

// Библиотека ингредиентов
export interface IngredientLibrary {
  id: string
  name: string
  isSystem: boolean
  ingredients: IngredientRef[]
}

// Категория ингредиента — нужна для дефолтных коэффициентов и UI
export type IngredientCategory =
  | 'grain'      // крупы, паста (увеличиваются при варке)
  | 'meat'       // говядина, свинина, баранина
  | 'poultry'    // курица, индейка
  | 'fish'       // рыба, морепродукты
  | 'vegetable'  // овощи
  | 'fruit'      // фрукты, ягоды
  | 'dairy'      // молочка
  | 'oil'        // масла (используется «ловушка для масла»)
  | 'liquid'     // вода, бульон, сок
  | 'other'

// Справочник ингредиентов
export interface IngredientRef {
  id: string
  name: string
  unit: 'г' | 'мл' | 'шт'
  /** Grams per 1 piece — only relevant when unit = 'шт'. Used for КБЖУ calculation. */
  weightPerUnit?: number
  caloriesPer100: number  // always per 100 g, regardless of unit
  proteinPer100: number
  fatPer100: number
  carbsPer100: number
  category?: IngredientCategory
  isSystem?: boolean
  // ТТК-поля
  yieldCoefficients?: YieldCoefficients  // дефолтные коэффициенты выхода по способам обработки
  coldLossPercent?: number               // дефолт холодных потерь (зачистка): 0..100
  pricePerKg?: number                    // закупочная цена, руб/кг (брутто). Для расчёта фуд-коста.
  // Composite ingredient (sub-recipe) fields
  type?: 'mono' | 'composite'
  composition?: CompositionRow[]
  compositionText?: string
  instructions?: string
  barcode?: string
  manufacturer?: string
  packageSize?: string
}
