import type { IngredientRef, ProcessingType } from '@/types'
import type { AddonGroup, AmountCell, ApiModifierGroup, ApiVariantGroup, IngredientItem, Size, VariantOption } from './useItemFormState'
import type { ManualNutri } from './composition-reducer'

interface ApiCompositionRow {
  id?: string
  ingredientId: string
  unit?: string
  amount: number
  processing?: ProcessingType
  yieldOverride?: number
  removable?: boolean
  parentRowId?: string
  companionKind?: 'oil' | 'water' | 'ice'
  companionRatio?: number
}

interface ApiSize {
  id: string
  name?: string
  weight: number
  weightUnit: string
  price?: number
  calories: number
  protein: number
  fat: number
  carbs: number
  composition?: ApiCompositionRow[]
}

interface ApiItem {
  id: string
  name: string
  price?: number
  isAvailable?: boolean
  description?: string
  photo?: string
  photoPosition?: 'top' | 'center' | 'bottom'
  categoryId: string
  allergens?: string[]
  creationMode?: 'quick' | 'composition' | 'ttk'
  finalWeight?: number
  servingSize?: number
  weight?: number
  weightUnit?: string
  calories?: number
  protein?: number
  fat?: number
  carbs?: number
  composition?: ApiCompositionRow[]
  sizes?: ApiSize[]
  variantGroups?: ApiVariantGroup[]
  modifierGroups?: ApiModifierGroup[]
}

export interface LoadedItemState {
  mode: 'quick' | 'composition' | 'ttk'
  name: string
  price: string
  isAvailable: boolean
  description: string
  photo: string
  photoPosition: 'top' | 'center' | 'bottom'
  categoryId: string
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
  // composition
  ingredients: IngredientItem[]
  amounts: AmountCell[]
  sizes: Size[]
  hasMultipleSizes: boolean
  manualNutri: ManualNutri
  // extras
  variantGroups: VariantOption[]
  addonGroups: AddonGroup[]
}

function loadCompositionRows(
  rows: ApiCompositionRow[],
  ingredientRefs: IngredientRef[],
): { ingredients: IngredientItem[]; ingredientIdMap: Map<string, string> } {
  const rowIdMap = new Map<string, string>()
  for (const comp of rows) {
    if (comp.id) rowIdMap.set(comp.id, crypto.randomUUID())
  }
  const ingredientIdMap = new Map<string, string>()
  const ingredients = rows.map(comp => {
    const newId = (comp.id && rowIdMap.get(comp.id)) || crypto.randomUUID()
    if (comp.id) rowIdMap.set(comp.id, newId)
    const ref = ingredientRefs.find(r => r.id === comp.ingredientId)
    ingredientIdMap.set(comp.ingredientId, newId)
    return {
      id: newId,
      ingredientRefId: comp.ingredientId,
      name: ref?.name || `Неизвестный ингредиент (${comp.ingredientId})`,
      unit: (ref?.unit || comp.unit || 'г') as IngredientItem['unit'],
      processing: comp.processing,
      yieldOverride: comp.yieldOverride,
      locked: comp.removable !== true,
      parentIngredientId: comp.parentRowId ? rowIdMap.get(comp.parentRowId) : undefined,
      companionKind: comp.companionKind,
      companionRatio: comp.companionRatio,
    } satisfies IngredientItem
  })
  return { ingredients, ingredientIdMap }
}

/**
 * Чистый билдер: превращает API-ответ блюда в плоский объект состояния формы.
 * Без сайд-эффектов и React — легко тестировать.
 */
export function buildLoadedItemState(item: ApiItem, ingredientRefs: IngredientRef[]): LoadedItemState {
  const base = {
    name: item.name,
    price: item.price != null ? String(item.price) : '',
    isAvailable: item.isAvailable ?? true,
    description: item.description ?? '',
    photo: item.photo ?? '',
    photoPosition: item.photoPosition ?? 'center',
    categoryId: item.categoryId,
    allergens: item.allergens ?? [],
    finalWeight: typeof item.finalWeight === 'number' ? item.finalWeight : undefined,
    servingSize: typeof item.servingSize === 'number' ? item.servingSize : undefined,
  }

  const hasComposition =
    (item.sizes?.length ?? 0) > 0 && (item.sizes?.[0]?.composition?.length ?? 0) > 0
    || (item.composition?.length ?? 0) > 0

  if (!hasComposition) {
    return {
      ...base,
      mode: 'quick',
      quickWeight: item.weight ?? 0,
      quickWeightUnit: (item.weightUnit ?? 'г') as 'г' | 'мл',
      quickCalories: item.calories ?? 0,
      quickProtein: item.protein ?? 0,
      quickFat: item.fat ?? 0,
      quickCarbs: item.carbs ?? 0,
      ingredients: [], amounts: [], sizes: [], hasMultipleSizes: false, manualNutri: {},
      variantGroups: [], addonGroups: [],
    }
  }

  const mode: 'composition' | 'ttk' = item.creationMode === 'ttk' ? 'ttk' : 'composition'

  let ingredients: IngredientItem[] = []
  let amounts: AmountCell[] = []
  let sizes: Size[] = []
  let hasMultipleSizes = false
  let manualNutri: ManualNutri = {}

  if (item.sizes && item.sizes.length > 0) {
    const sizesData = item.sizes
    const firstSizeComp = sizesData[0].composition ?? []

    if (firstSizeComp.length > 0) {
      const loaded = loadCompositionRows(firstSizeComp, ingredientRefs)
      ingredients = loaded.ingredients
      const idMap = loaded.ingredientIdMap

      for (const size of sizesData) {
        for (const comp of size.composition ?? []) {
          const mappedId = idMap.get(comp.ingredientId)
          if (mappedId) amounts.push({ ingredientId: mappedId, sizeId: size.id, amount: comp.amount })
        }
      }
    }

    if (sizesData.length === 1) {
      hasMultipleSizes = false
      sizes = [{ id: sizesData[0].id, name: sizesData[0].name || '', unit: (sizesData[0].weightUnit || 'г') as 'г' | 'мл' }]
    } else {
      hasMultipleSizes = true
      sizes = sizesData.map(s => ({
        id: s.id,
        name: s.name || `${s.weight}${s.weightUnit}`,
        unit: (s.weightUnit || 'г') as 'г' | 'мл',
        price: s.price,
      }))
    }

    manualNutri = {}
    for (const size of sizesData) {
      manualNutri[size.id] = {
        calories: size.calories, protein: size.protein, fat: size.fat, carbs: size.carbs, isManual: true,
      }
    }
  } else if (item.composition && item.composition.length > 0) {
    const loaded = loadCompositionRows(item.composition, ingredientRefs)
    ingredients = loaded.ingredients
    const idMap = loaded.ingredientIdMap
    amounts = item.composition
      .map(comp => ({ ingredientId: idMap.get(comp.ingredientId) ?? '', sizeId: 'default', amount: comp.amount }))
      .filter(a => a.ingredientId)
    manualNutri = {
      default: {
        calories: item.calories ?? 0, protein: item.protein ?? 0, fat: item.fat ?? 0, carbs: item.carbs ?? 0,
        isManual: true,
      },
    }
  }

  const addonGroups: AddonGroup[] = (item.modifierGroups ?? []).map(mg => ({
    id: mg.id,
    label: mg.label ?? '',
    allowCustomGrams: mg.allowCustomGrams ?? false,
    addons: (mg.modifiers ?? []).map(m => ({
      id: m.id,
      ingredientRefId: m.ingredientRefId ?? '',
      label: m.label ?? '',
      price: m.price,
      weight: m.weight,
    })),
  }))

  const variantGroups: VariantOption[] = (item.variantGroups ?? []).map(vg => ({
    id: vg.id,
    label: vg.label ?? '',
    required: vg.required ?? false,
    replacesIngredientRefId: vg.replacesIngredientRefId,
    options: (vg.options ?? []).map(opt => {
      const ref = ingredientRefs.find(r => r.id === opt.ingredientRefId)
      return {
        id: opt.id,
        ingredientRefId: opt.ingredientRefId || '',
        label: ref?.name || opt.label || '',
        weight: opt.weight ?? 100,
        weightUnit: (opt.weightUnit ?? 'г') as 'г' | 'мл',
        calories: opt.calories ?? 0,
        protein: opt.protein ?? 0,
        fat: opt.fat ?? 0,
        carbs: opt.carbs ?? 0,
        price: opt.price,
        isManual: true,
      }
    }),
  }))

  return {
    ...base,
    mode,
    quickWeight: 0, quickWeightUnit: 'г', quickCalories: 0, quickProtein: 0, quickFat: 0, quickCarbs: 0,
    ingredients, amounts, sizes, hasMultipleSizes, manualNutri,
    variantGroups, addonGroups,
  }
}
