import { describe, it, expect } from 'vitest'
import { resolveCompositionWeights } from '@/lib/utils'
import type { CompositionRow, IngredientRef } from '@/types'

const pasta: IngredientRef = {
  id: 'pasta', name: 'Паста (тв. сорта)', type: 'mono', unit: 'г', category: 'grain',
  caloriesPer100: 350, proteinPer100: 12, fatPer100: 1.5, carbsPer100: 70,
}
const water: IngredientRef = {
  id: 'water', name: 'Вода', type: 'mono', unit: 'г', category: 'liquid',
  caloriesPer100: 0, proteinPer100: 0, fatPer100: 0, carbsPer100: 0,
}
const bacon: IngredientRef = {
  id: 'bacon', name: 'Бекон', type: 'mono', unit: 'г', category: 'meat',
  caloriesPer100: 500, proteinPer100: 12, fatPer100: 50, carbsPer100: 0,
}
const yolk: IngredientRef = {
  id: 'yolk', name: 'Желток', type: 'mono', unit: 'г', category: 'dairy',
  caloriesPer100: 320, proteinPer100: 16, fatPer100: 27, carbsPer100: 3,
}
const refs = [pasta, water, bacon, yolk]

describe('resolveCompositionWeights — варка пасты', () => {
  it('паста без воды: коэффициент выхода крупы даёт 2.5×', () => {
    const rows: CompositionRow[] = [{ id: 'p', ingredientId: 'pasta', amount: 100, unit: 'г', processing: 'boil' }]
    expect(resolveCompositionWeights(rows, refs).total).toBe(250)
  })

  it('паста + вода-компаньон: НЕ двойной счёт (100 пасты + 150 воды = 250)', () => {
    const rows: CompositionRow[] = [
      { id: 'p', ingredientId: 'pasta', amount: 100, unit: 'г', processing: 'boil' },
      { id: 'w', ingredientId: 'water', amount: 150, unit: 'г', parentRowId: 'p', companionKind: 'water' },
    ]
    const { perRow, total } = resolveCompositionWeights(rows, refs)
    expect(perRow['p']).toBe(100) // выход крупы сброшен до 1.0 — массу даёт вода
    expect(perRow['w']).toBe(150) // вся вода впитывается (absorption 1.0)
    expect(total).toBe(250)
  })

  it('полная карбонара: 100 пасты + 150 воды + 30 бекона + 36 желтка = 316', () => {
    const rows: CompositionRow[] = [
      { id: 'p', ingredientId: 'pasta', amount: 100, unit: 'г', processing: 'boil' },
      { id: 'w', ingredientId: 'water', amount: 150, unit: 'г', parentRowId: 'p', companionKind: 'water' },
      { id: 'b', ingredientId: 'bacon', amount: 30, unit: 'г' },
      { id: 'y', ingredientId: 'yolk', amount: 36, unit: 'г' },
    ]
    expect(resolveCompositionWeights(rows, refs).total).toBe(316)
  })
})
