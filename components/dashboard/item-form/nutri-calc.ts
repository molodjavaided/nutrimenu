import type { CompositionRow, IngredientRef } from '@/types'
import { resolveNutriFromComposition } from '@/lib/utils'
import type { AmountCell, IngredientItem } from './useItemFormState'
import type { ManualNutri } from './composition-reducer'

/**
 * Чистая функция расчёта КБЖУ для одного размера блюда.
 * Если manualNutri[sizeId].isManual — возвращает ручные значения как есть.
 * Иначе строит CompositionRow[] и зовёт общий resolveNutriFromComposition,
 * который сам учтёт oil absorption, composite refs, компаньонов.
 */
export function calcNutriForSize(
  sizeId: string,
  ingredients: IngredientItem[],
  amounts: AmountCell[],
  ingredientRefs: IngredientRef[],
  manualNutri: ManualNutri,
): { calories: number; protein: number; fat: number; carbs: number } {
  if (manualNutri[sizeId]?.isManual) {
    return {
      calories: manualNutri[sizeId].calories,
      protein: manualNutri[sizeId].protein,
      fat: manualNutri[sizeId].fat,
      carbs: manualNutri[sizeId].carbs,
    }
  }

  const composition: CompositionRow[] = ingredients.flatMap(ingredient => {
    const cell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === sizeId)
    if (!cell || !cell.amount) return []
    return [{
      id: ingredient.id,
      ingredientId: ingredient.ingredientRefId,
      unit: ingredient.unit,
      amount: cell.amount,
      ...(ingredient.processing && ingredient.processing !== 'raw' ? { processing: ingredient.processing } : {}),
      ...(ingredient.yieldOverride !== undefined && ingredient.yieldOverride > 0 ? { yieldOverride: ingredient.yieldOverride } : {}),
      ...(ingredient.parentIngredientId ? { parentRowId: ingredient.parentIngredientId } : {}),
      ...(ingredient.companionKind ? { companionKind: ingredient.companionKind } : {}),
    }]
  })

  return resolveNutriFromComposition(composition, ingredientRefs, [], {})
}
