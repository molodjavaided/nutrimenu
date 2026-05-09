import { describe, it, expect } from 'vitest'
import {
  roundNutri,
  resolveNutri,
  calcNutriTotal,
  resolveIngredientPer100,
  resolveNutriFromComposition,
} from '@/lib/utils'
import type { MenuItem, IngredientRef, TrackerItem } from '@/types'

const baseItem: MenuItem = {
  id: 'test-item',
  name: 'Test',
  description: '',
  categoryId: 'hot',
  venueId: 'venue-1',
  calories: 300,
  protein: 20,
  fat: 10,
  carbs: 30,
  weight: 250,
  weightUnit: 'г',
  variantGroups: [],
  modifierGroups: [],
  composition: [],
  isAvailable: true,
}

describe('roundNutri', () => {
  it('rounds to one decimal place', () => {
    expect(roundNutri(10.15)).toBe(10.2)
    expect(roundNutri(10.14)).toBe(10.1)
  })

  it('handles integers', () => {
    expect(roundNutri(300)).toBe(300)
  })
})

describe('resolveNutri — base item no variants', () => {
  it('returns base nutrition when no variants or modifiers selected', () => {
    const result = resolveNutri(baseItem, {}, {})
    expect(result.calories).toBe(300)
    expect(result.protein).toBe(20)
    expect(result.fat).toBe(10)
    expect(result.carbs).toBe(30)
  })
})

describe('resolveNutri — variant groups', () => {
  const itemWithVariants: MenuItem = {
    ...baseItem,
    variantGroups: [
      {
        id: 'size',
        label: 'Размер',
        required: true,
        options: [
          { id: 'small', label: 'Маленький', calories: 200, protein: 12, fat: 7, carbs: 20, weight: 180, weightUnit: 'г' },
          { id: 'large', label: 'Большой', calories: 400, protein: 28, fat: 14, carbs: 40, weight: 350, weightUnit: 'г' },
        ],
      },
    ],
  }

  it('applies selected variant nutrition', () => {
    const result = resolveNutri(itemWithVariants, { size: 'large' }, {})
    expect(result.calories).toBe(400)
    expect(result.weight).toBe(350)
  })

  it('keeps base nutrition when variant not found', () => {
    const result = resolveNutri(itemWithVariants, { size: 'unknown' }, {})
    expect(result.calories).toBe(300)
  })

  it('keeps base nutrition when variant has calories 0 (no override)', () => {
    const itemZeroCalVariant: MenuItem = {
      ...baseItem,
      variantGroups: [
        {
          id: 'size',
          label: 'Размер',
          required: false,
          options: [
            { id: 'small', label: 'Маленький', calories: 0, protein: 0, fat: 0, carbs: 0, weight: 180, weightUnit: 'г' },
          ],
        },
      ],
    }
    const result = resolveNutri(itemZeroCalVariant, { size: 'small' }, {})
    expect(result.calories).toBe(300)
  })
})

describe('resolveNutri — modifier groups addon', () => {
  const itemWithAddon: MenuItem = {
    ...baseItem,
    modifierGroups: [
      {
        id: 'extras',
        label: 'Добавки',
        type: 'addon',
        multi: true,
        required: false,
        modifiers: [
          { id: 'cheese', label: 'Сыр', calories: 50, protein: 3, fat: 4, carbs: 1, weight: 20, weightUnit: 'г' },
          { id: 'sauce', label: 'Соус', calories: 30, protein: 0, fat: 3, carbs: 2, weight: 30, weightUnit: 'мл' },
        ],
      },
    ],
  }

  it('adds multi-select addon nutrition', () => {
    const result = resolveNutri(itemWithAddon, {}, { extras: ['cheese', 'sauce'] as unknown as string })
    expect(result.calories).toBe(380)
    expect(result.protein).toBe(23)
  })

  it('handles empty multi-select', () => {
    const result = resolveNutri(itemWithAddon, {}, { extras: [] as unknown as string })
    expect(result.calories).toBe(300)
  })
})

describe('resolveNutri — required modifier group (ingredient replacement)', () => {
  const itemWithRequired: MenuItem = {
    ...baseItem,
    modifierGroups: [
      {
        id: 'milk',
        label: 'Молоко',
        type: 'addon',
        multi: false,
        required: true,
        modifiers: [
          { id: 'cow', label: 'Коровье', calories: 100, protein: 5, fat: 6, carbs: 8, weight: 200, weightUnit: 'мл' },
          { id: 'oat', label: 'Овсяное', calories: 120, protein: 4, fat: 5, carbs: 14, weight: 200, weightUnit: 'мл' },
        ],
      },
    ],
  }

  it('applies delta from default (first) modifier', () => {
    // base 300 cal + delta(120 - 100) = 320
    const result = resolveNutri(itemWithRequired, {}, { milk: 'oat' })
    expect(result.calories).toBe(320)
  })

  it('keeps base when default modifier selected', () => {
    const result = resolveNutri(itemWithRequired, {}, { milk: 'cow' })
    expect(result.calories).toBe(300)
  })
})

describe('resolveNutri — bowl special logic', () => {
  const bowl: MenuItem = { ...baseItem, id: 'bowl', calories: 0, protein: 0, fat: 0, carbs: 0 }

  it('returns bowl nutrition for valid filling+grain combo', () => {
    const result = resolveNutri(bowl, { filling: 'chicken', grain: 'bulgur' }, {})
    expect(result.calories).toBe(332)
    expect(result.weight).toBe(400)
  })

  it('returns zeros when filling or grain missing', () => {
    const result = resolveNutri(bowl, { filling: 'chicken' }, {})
    expect(result.calories).toBe(0)
  })
})

describe('calcNutriTotal', () => {
  it('sums tracker items by quantity', () => {
    const items: TrackerItem[] = [
      {
        menuItem: { ...baseItem, id: 'a' },
        quantity: 2,
        selectedVariants: {},
        selectedModifiers: {},
        resolvedCalories: 100,
        resolvedProtein: 10,
        resolvedFat: 5,
        resolvedCarbs: 15,
        resolvedWeight: 250,
        resolvedWeightUnit: 'г',
      },
      {
        menuItem: { ...baseItem, id: 'b' },
        quantity: 1,
        selectedVariants: {},
        selectedModifiers: {},
        resolvedCalories: 200,
        resolvedProtein: 20,
        resolvedFat: 8,
        resolvedCarbs: 30,
        resolvedWeight: 300,
        resolvedWeightUnit: 'г',
      },
    ]
    const total = calcNutriTotal(items)
    expect(total.calories).toBe(400)
    expect(total.protein).toBe(40)
    expect(total.fat).toBe(18)
    expect(total.carbs).toBe(60)
  })

  it('returns zeros for empty tracker', () => {
    const total = calcNutriTotal([])
    expect(total.calories).toBe(0)
  })
})

describe('resolveIngredientPer100', () => {
  const flour: IngredientRef = {
    id: 'flour', name: 'Мука', type: 'mono', unit: 'г',
    caloriesPer100: 340, proteinPer100: 11, fatPer100: 1.5, carbsPer100: 70,
  }
  const butter: IngredientRef = {
    id: 'butter', name: 'Масло', type: 'mono', unit: 'г',
    caloriesPer100: 750, proteinPer100: 0.5, fatPer100: 82, carbsPer100: 1,
  }

  it('returns stored values for mono ingredient', () => {
    const result = resolveIngredientPer100(flour, [flour])
    expect(result.caloriesPer100).toBe(340)
  })

  it('computes composite ingredient per-100g correctly', () => {
    const dough: IngredientRef = {
      id: 'dough', name: 'Тесто', type: 'composite', unit: 'г',
      caloriesPer100: 0, proteinPer100: 0, fatPer100: 0, carbsPer100: 0,
      composition: [
        { ingredientId: 'flour', amount: 200, unit: 'г' },
        { ingredientId: 'butter', amount: 100, unit: 'г' },
      ],
    }
    const result = resolveIngredientPer100(dough, [flour, butter, dough])
    // Total weight = 300g
    // calories = (340 * 2 + 750 * 1) / 3 = 1430/3 ≈ 477
    expect(result.caloriesPer100).toBe(477)
  })

  it('handles circular dependency without infinite loop', () => {
    const circularA: IngredientRef = {
      id: 'a', name: 'A', type: 'composite', unit: 'г',
      caloriesPer100: 0, proteinPer100: 0, fatPer100: 0, carbsPer100: 0,
      composition: [{ ingredientId: 'b', amount: 100, unit: 'г' }],
    }
    const circularB: IngredientRef = {
      id: 'b', name: 'B', type: 'composite', unit: 'г',
      caloriesPer100: 0, proteinPer100: 0, fatPer100: 0, carbsPer100: 0,
      composition: [{ ingredientId: 'a', amount: 100, unit: 'г' }],
    }
    expect(() => resolveIngredientPer100(circularA, [circularA, circularB])).not.toThrow()
  })
})

describe('resolveNutriFromComposition', () => {
  const chicken: IngredientRef = {
    id: 'chicken', name: 'Курица', type: 'mono', unit: 'г',
    caloriesPer100: 165, proteinPer100: 31, fatPer100: 3.6, carbsPer100: 0,
  }
  const rice: IngredientRef = {
    id: 'rice', name: 'Рис', type: 'mono', unit: 'г',
    caloriesPer100: 130, proteinPer100: 2.7, fatPer100: 0.3, carbsPer100: 28,
  }

  it('computes nutrition from composition rows', () => {
    const result = resolveNutriFromComposition(
      [
        { ingredientId: 'chicken', amount: 150, unit: 'г' },
        { ingredientId: 'rice', amount: 100, unit: 'г' },
      ],
      [chicken, rice],
      [],
      {}
    )
    // chicken: 165*1.5=247.5 cal, rice: 130*1=130 cal → 378
    expect(result.calories).toBe(378)
  })

  it('applies ingredient replacement from modifiers', () => {
    const tofu: IngredientRef = {
      id: 'tofu', name: 'Тофу', type: 'mono', unit: 'г',
      caloriesPer100: 76, proteinPer100: 8, fatPer100: 4.2, carbsPer100: 1.9,
    }
    const result = resolveNutriFromComposition(
      [
        { ingredientId: 'chicken', amount: 150, unit: 'г' },
        { ingredientId: 'rice', amount: 100, unit: 'г' },
      ],
      [chicken, rice, tofu],
      [
        {
          id: 'protein-swap',
          label: 'Замена белка',
          type: 'replace',
          replacesIngredientId: 'chicken',
          multi: false,
          required: false,
          modifiers: [
            { id: 'tofu', label: 'Тофу', calories: 76, protein: 8, fat: 4.2, carbs: 1.9, weight: 150, weightUnit: 'г' },
          ],
        },
      ],
      { 'protein-swap': 'tofu' }
    )
    // tofu 150g at per-100g: 76*1.5=114 cal, rice 130 cal → 244
    expect(result.calories).toBe(244)
  })

  it('handles шт unit with weightPerUnit', () => {
    const egg: IngredientRef = {
      id: 'egg', name: 'Яйцо', type: 'mono', unit: 'шт',
      caloriesPer100: 155, proteinPer100: 13, fatPer100: 11, carbsPer100: 1.1,
      weightPerUnit: 60,
    }
    const result = resolveNutriFromComposition(
      [{ ingredientId: 'egg', amount: 2, unit: 'шт' }],
      [egg],
      [],
      {}
    )
    // 2 eggs * 60g each = 120g → 155 * 1.2 = 186
    expect(result.calories).toBe(186)
  })
})
