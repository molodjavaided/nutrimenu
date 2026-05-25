import { describe, it, expect } from 'vitest'
import {
  roundNutri,
  resolveNutri,
  calcNutriTotal,
  resolveIngredientPer100,
  resolveNutriFromComposition,
  resolveCompositionRowContribution,
} from '@/lib/utils'
import { buildMenuItem, type FormSnapshot } from '@/components/dashboard/item-form/buildMenuItem'
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
            // modifier.calories хранится за modifier.weight грамм (как сохраняет buildMenuItem):
            // 76 ккал/100г × 1.5 = 114 ккал на 150 г
            { id: 'tofu', label: 'Тофу', calories: 114, protein: 12, fat: 6.3, carbs: 2.85, weight: 150, weightUnit: 'г' },
          ],
        },
      ],
      { 'protein-swap': 'tofu' }
    )
    // tofu занимает 150 г (как и оригинальная курица): 114 ккал + rice 130 ккал → 244
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

// ─────────────────────────────────────────────────────────────────────────────
// Регрессии на 7 кейсов синхронизации owner ↔ guest (PR 07627dc, d35a5d7)
// ─────────────────────────────────────────────────────────────────────────────

describe('regression — 7 owner↔guest nutri sync fixes', () => {
  const chicken: IngredientRef = {
    id: 'chicken', name: 'Курица', type: 'mono', unit: 'г', category: 'poultry',
    caloriesPer100: 165, proteinPer100: 31, fatPer100: 3.6, carbsPer100: 0,
  }
  const sunflowerOil: IngredientRef = {
    id: 'oil', name: 'Масло', type: 'mono', unit: 'мл', category: 'oil',
    caloriesPer100: 884, proteinPer100: 0, fatPer100: 100, carbsPer100: 0,
  }

  // #1 — Oil at fry: только впитанная часть попадает в КБЖУ блюда (не полное брутто).
  it('#1 oil + fry processing → only absorbed fraction counted', () => {
    const composition = [
      { id: 'r1', ingredientId: 'chicken', amount: 200, unit: 'г' as const, processing: 'fry' as const },
      { id: 'r2', ingredientId: 'oil', amount: 20, unit: 'мл' as const, processing: 'fry' as const, oilAbsorption: 0.15 },
    ]
    const result = resolveNutriFromComposition(composition, [chicken, sunflowerOil], [], {})
    // Курица: 165 × 2 = 330. Масло (впитано 15%): 884 × 0.2 × 0.15 = 26.52 → 27.
    // Итого 357 (а не 330 + 177 = 507, как при подсчёте по полному брутто).
    expect(result.calories).toBe(357)
  })

  // #2 — Composite ингредиент: агрегаты пересчитываются из composition, даже если
  // сохранённые caloriesPer100 у composite устарели.
  it('#2 composite ingredient: per100 recomputed from sub-recipe, ignoring stale stored values', () => {
    const sauceComposite: IngredientRef = {
      id: 'sauce', name: 'Соус (с устаревшими КБЖУ)', type: 'composite', unit: 'г',
      // Намеренно «битые» агрегаты — должны быть проигнорированы:
      caloriesPer100: 0, proteinPer100: 0, fatPer100: 0, carbsPer100: 0,
      composition: [
        { ingredientId: 'oil', amount: 50, unit: 'мл' },     // 884 × 0.5 = 442 ккал
        { ingredientId: 'chicken', amount: 50, unit: 'г' },  // 165 × 0.5 = 82.5 ккал
      ],
    }
    const result = resolveNutriFromComposition(
      [{ id: 'r1', ingredientId: 'sauce', amount: 100, unit: 'г' }],
      [chicken, sunflowerOil, sauceComposite],
      [], {}
    )
    // Per100 соуса = (442 + 82.5) / 100 г × 100 = 525 ккал/100г → 100 г × 5.25 = 525.
    expect(result.calories).toBe(525)
  })

  // #3 — Replace-модификатор должен применяться как дельта, не затирая variant-дельты.
  // На уровне утилит проверяем, что resolveNutriFromComposition корректно даёт
  // (а) baseline без модификатора и (б) результат с модификатором — чтобы caller мог
  // посчитать дельту = withReplace − baseline.
  it('#3 replace modifier yields baseline+delta math (no clobber of upstream additions)', () => {
    const tofu: IngredientRef = {
      id: 'tofu', name: 'Тофу', type: 'mono', unit: 'г', category: 'other',
      caloriesPer100: 76, proteinPer100: 8, fatPer100: 4.2, carbsPer100: 1.9,
    }
    const comp = [{ id: 'r1', ingredientId: 'chicken', amount: 150, unit: 'г' as const }]
    const replaceGroup = {
      id: 'swap', label: '', type: 'replace' as const, replacesIngredientId: 'chicken',
      multi: false, required: false,
      modifiers: [{ id: 'tofu', label: 'Тофу', calories: 114, protein: 12, fat: 6.3, carbs: 2.85, weight: 150, weightUnit: 'г' as const }],
    }
    const baseline = resolveNutriFromComposition(comp, [chicken, tofu], [replaceGroup], {})
    const withRepl = resolveNutriFromComposition(comp, [chicken, tofu], [replaceGroup], { swap: 'tofu' })
    expect(baseline.calories).toBe(248)  // 165 × 1.5
    expect(withRepl.calories).toBe(114)  // tofu 114 ккал на 150 г
    // Дельта замены = -134. Накладывается на любое исходное total в caller'е.
    expect(withRepl.calories - baseline.calories).toBe(-134)
  })

  // #4 — Excluded ingredient: вычитание идёт через resolveCompositionRowContribution,
  // так что для масла при жарке отнимается ровно впитавшаяся часть.
  it('#4 excluded oil at fry: subtraction uses absorbed amount, not brutto', () => {
    const oilRow = { id: 'r1', ingredientId: 'oil', amount: 20, unit: 'мл' as const, processing: 'fry' as const, oilAbsorption: 0.15 }
    const per100 = resolveIngredientPer100(sunflowerOil, [sunflowerOil])
    const contrib = resolveCompositionRowContribution(oilRow, sunflowerOil, per100)
    // Впитано: 20 × 0.15 = 3 мл → 884 × 0.03 = 26.52 ккал.
    expect(Math.round(contrib.calories)).toBe(27)
    // Если бы вычитали по брутто — было бы 884 × 0.2 = 176.8 ккал. Дельта почти 7×.
  })

  // #6 — processing/yieldOverride сохраняются всегда, не только в режиме ttk.
  it('#6 buildMenuItem persists processing/yieldOverride in composition mode (not only ttk)', () => {
    const snapshot: FormSnapshot = {
      mode: 'composition',
      name: 'Стейк жареный', description: '', photo: '', photoPosition: 'center',
      price: '', categoryId: 'hot', isAvailable: true, allergens: [],
      quickWeight: 0, quickWeightUnit: 'г', quickCalories: 0, quickProtein: 0, quickFat: 0, quickCarbs: 0,
      ingredients: [
        { id: 'i1', ingredientRefId: 'chicken', name: 'Курица', unit: 'г', processing: 'fry', yieldOverride: 0.7 },
      ],
      amounts: [{ ingredientId: 'i1', sizeId: 's1', amount: 200 }],
      sizes: [{ id: 's1', name: '', unit: 'г' }],
      variantGroups: [], addonGroups: [],
      ingredientRefs: [chicken],
      calculateNutriForSize: () => ({ calories: 330, protein: 62, fat: 7.2, carbs: 0 }),
    }
    const item = buildMenuItem(snapshot, { id: 'test' })
    const row = item.sizes?.[0]?.composition?.[0]
    expect(row?.processing).toBe('fry')
    expect(row?.yieldOverride).toBe(0.7)
  })

  // #7 — modifier.weight учитывается в формуле замены (нет двойного масштабирования).
  it('#7 replace modifier with weight ≠ 100: no double-scaling', () => {
    // Сценарий: оригинал 50 г, модификатор представлен как «100 ккал на 200 г»
    // (т.е. реально 0.5 ккал/г). Ожидаем 50 г × 0.5 = 25 ккал.
    const ing: IngredientRef = {
      id: 'a', name: 'A', type: 'mono', unit: 'г',
      caloriesPer100: 200, proteinPer100: 0, fatPer100: 0, carbsPer100: 0,
    }
    const result = resolveNutriFromComposition(
      [{ id: 'r1', ingredientId: 'a', amount: 50, unit: 'г' }],
      [ing],
      [{
        id: 'g', label: '', type: 'replace', replacesIngredientId: 'a',
        multi: false, required: false,
        modifiers: [{ id: 'b', label: 'B', calories: 100, protein: 0, fat: 0, carbs: 0, weight: 200, weightUnit: 'г' }],
      }],
      { g: 'b' }
    )
    expect(result.calories).toBe(25)
    // Старая формула: 100 × (50/100) = 50 — двойное масштабирование, неверно.
  })
})
