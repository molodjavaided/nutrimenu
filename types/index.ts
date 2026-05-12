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

// Строка состава блюда
export interface CompositionRow {
  ingredientId: string
  amount: number
  unit: 'г' | 'мл' | 'шт' | 'кг' | 'л'
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
  category?: string
  isSystem?: boolean
  // Composite ingredient (sub-recipe) fields
  type?: 'mono' | 'composite'
  composition?: CompositionRow[]
  instructions?: string
}
