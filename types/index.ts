export interface Venue {
  id: string
  name: string
  slug: string
  logo?: string
  address?: string
  description?: string
  workingHours?: string
  tags?: string[]
}

export interface Category {
  id: string
  name: string
  venueId: string
  order: number
  items?: MenuItem[]
}

export interface VariantOption {
  id: string
  label: string
  required: boolean
  options: VariantChoice[]
}

export interface VariantChoice {
  id: string
  ingredientRefId?: string  // ← добавить это поле
  label: string
  weight: number
  weightUnit: 'г' | 'мл'
  calories: number
  protein: number
  fat: number
  carbs: number
}

export interface VariantGroup {
  id: string
  label: string
  required: boolean
  options: VariantChoice[]
  replacesIngredientRefId?: string  // ингредиент из состава, который заменяют все опции группы
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
  allowPortions?: boolean  // гость может выбрать количество порций
  maxPortions?: number     // максимум порций (по умолчанию 10)
  subOptions?: ModifierSubOption[]
}

export interface ModifierSubOption {
  id: string
  label: string
  calories: number
  protein: number
  fat: number
  carbs: number
}

export interface ModifierGroup {
  id: string
  label: string
  multi: boolean
  required: boolean
  modifiers: Modifier[]
  // 'addon' — добавляет КБЖУ (сироп, топпинг)
  // 'replace' — заменяет ингредиент (молоко)
  type?: 'addon' | 'replace'
  // Для replace — какой ингредиент заменяется
  replacesIngredientId?: string
  calcByMl?: boolean
  mlPerVariant?: Record<string, number>
  linkedVariantGroupId?: string
}

export interface MenuItem {
  id: string
  name: string
  description?: string
  photo?: string
  weight: number
  weightUnit: 'г' | 'мл'
  calories: number
  protein: number
  fat: number
  carbs: number
  categoryId: string
  venueId: string
  isAvailable: boolean
  composition?: CompositionRow[]
  variantGroups?: VariantGroup[]
  modifierGroups?: ModifierGroup[]
}

export interface SelectedVariants {
  [groupId: string]: string
}

export interface SelectedModifiers {
  [modifierId: string]: string | true | number  // number = количество порций для allowPortions
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

// Один объём/размер блюда со своими КБЖУ
export interface SizeOption {
  id: string
  name?: string
  weight: number
  weightUnit: 'г' | 'мл'
  calories: number
  protein: number
  fat: number
  carbs: number
  composition: CompositionRow[]
  ingredientAmounts: Record<string, { amount: number; unit: 'г' | 'мл' }>
}

// Ингредиент блюда
export interface Ingredient {
  id: string
  name: string
}

export interface MenuItem {
  id: string
  name: string
  description?: string
  photo?: string
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
  variantGroups?: VariantGroup[]
  modifierGroups?: ModifierGroup[]
}

// Библиотека ингредиентов
export interface IngredientLibrary {
  id: string
  name: string
  isSystem: boolean  // системная — только чтение для владельца
  ingredients: IngredientRef[]
}

// Справочник ингредиентов
export interface IngredientRef {
  id: string
  name: string
  unit: 'г' | 'мл'       // базовая единица измерения
  caloriesPer100: number
  proteinPer100: number
  fatPer100: number
  carbsPer100: number
  category?: string       // для группировки: 'молоко', 'крупа', 'мясо' и т.д.
}

// Строка состава блюда
export interface CompositionRow {
  ingredientId: string
  amount: number
  unit: 'г' | 'мл'
}

// Один объём/размер блюда
export interface SizeOption {
  id: string
  name?: string
  weight: number
  weightUnit: 'г' | 'мл'
  calories: number
  protein: number
  fat: number
  carbs: number
  composition: CompositionRow[]   // состав для этого объёма
}

export interface Ingredient {
  id: string
  name: string
}