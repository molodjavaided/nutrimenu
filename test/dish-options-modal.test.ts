import { describe, it, expect } from 'vitest'
import { buildMenuItem, type FormSnapshot } from '@/components/dashboard/item-form/buildMenuItem'
import type { IngredientRef } from '@/types'

/**
 * Регресс DishOptionsModal (29f71b5) — golden path.
 * Юзер собирает блюдо с 2 размерами, 1 replace-вариантом и 1 allowCustomGrams-аддоном.
 * Проверяем что buildMenuItem сериализует MenuItem без сюрпризов:
 *  - sizes[] с per-size composition
 *  - variantGroups[].replacesIngredientRefId сохранён
 *  - modifierGroups[].allowCustomGrams + type === 'addon' + multi
 *  - replace-варианту прописан weight = first-size brutto (для preview-display)
 */

const flour: IngredientRef = {
  id: 'flour', name: 'Мука пшеничная', unit: 'г',
  caloriesPer100: 340, proteinPer100: 10, fatPer100: 1, carbsPer100: 70,
  category: 'grain',
}
const milkCow: IngredientRef = {
  id: 'milk-cow', name: 'Молоко 3.2%', unit: 'мл',
  caloriesPer100: 60, proteinPer100: 3, fatPer100: 3.2, carbsPer100: 4.7,
  category: 'dairy',
}
const milkOat: IngredientRef = {
  id: 'milk-oat', name: 'Молоко овсяное', unit: 'мл',
  caloriesPer100: 45, proteinPer100: 1, fatPer100: 1.5, carbsPer100: 7,
  category: 'dairy',
}
const syrup: IngredientRef = {
  id: 'syrup', name: 'Сироп карамельный', unit: 'мл',
  caloriesPer100: 320, proteinPer100: 0, fatPer100: 0, carbsPer100: 80,
  category: 'other',
}

function makeSnapshot(): FormSnapshot {
  return {
    mode: 'composition',
    name: 'Блин',
    description: '',
    photo: '',
    photoPosition: 'center',
    price: '250',
    categoryId: 'cat-1',
    isAvailable: true,
    allergens: [],
    quickWeight: 0, quickWeightUnit: 'г',
    quickCalories: 0, quickProtein: 0, quickFat: 0, quickCarbs: 0,
    ingredients: [
      { id: 'row-flour', ingredientRefId: 'flour', name: 'Мука', unit: 'г' },
      { id: 'row-milk',  ingredientRefId: 'milk-cow', name: 'Молоко', unit: 'мл' },
    ],
    sizes: [
      { id: 'size-s', name: 'Маленький', unit: 'г' },
      { id: 'size-l', name: 'Большой',  unit: 'г' },
    ],
    amounts: [
      { ingredientId: 'row-flour', sizeId: 'size-s', amount: 100 },
      { ingredientId: 'row-flour', sizeId: 'size-l', amount: 150 },
      { ingredientId: 'row-milk',  sizeId: 'size-s', amount: 200 },
      { ingredientId: 'row-milk',  sizeId: 'size-l', amount: 300 },
    ],
    variantGroups: [
      {
        id: 'vg-milk',
        label: 'Молоко',
        required: true,
        replacesIngredientRefId: 'milk-cow',
        options: [
          {
            id: 'opt-cow',
            ingredientRefId: 'milk-cow',
            label: 'Обычное',
            weight: 0, weightUnit: 'мл',
            calories: 0, protein: 0, fat: 0, carbs: 0,
          },
          {
            id: 'opt-oat',
            ingredientRefId: 'milk-oat',
            label: 'Овсяное',
            weight: 0, weightUnit: 'мл',
            calories: 0, protein: 0, fat: 0, carbs: 0,
          },
        ],
      },
    ],
    addonGroups: [
      {
        id: 'ag-syrup',
        label: 'Сироп',
        allowCustomGrams: true,
        addons: [
          { id: 'a-caramel', ingredientRefId: 'syrup', label: 'Карамельный', price: 30, weight: 20 },
        ],
      },
    ],
    ingredientRefs: [flour, milkCow, milkOat, syrup],
    calculateNutriForSize: (sizeId) => {
      // Простой стуб: считаем линейно по brutto (без обработки).
      // Этого достаточно: buildMenuItem просто прокидывает результат.
      const map: Record<string, { calories: number; protein: number; fat: number; carbs: number }> = {
        'size-s': { calories: 460, protein: 16, fat: 7.4, carbs: 79.4 },
        'size-l': { calories: 690, protein: 24, fat: 11.1, carbs: 119.1 },
      }
      return map[sizeId] ?? { calories: 0, protein: 0, fat: 0, carbs: 0 }
    },
  }
}

describe('DishOptionsModal golden path → buildMenuItem', () => {
  const item = buildMenuItem(makeSnapshot(), { id: 'test' })

  it('создаёт 2 размера с per-size composition', () => {
    expect(item.sizes).toHaveLength(2)
    const s = item.sizes!.find(x => x.id === 'size-s')!
    const l = item.sizes!.find(x => x.id === 'size-l')!
    expect(s.composition?.find(c => c.ingredientId === 'flour')?.amount).toBe(100)
    expect(l.composition?.find(c => c.ingredientId === 'flour')?.amount).toBe(150)
    expect(s.composition?.find(c => c.ingredientId === 'milk-cow')?.amount).toBe(200)
    expect(l.composition?.find(c => c.ingredientId === 'milk-cow')?.amount).toBe(300)
  })

  it('сохраняет replacesIngredientRefId в variantGroups', () => {
    expect(item.variantGroups).toHaveLength(1)
    const vg = item.variantGroups![0]
    expect(vg.replacesIngredientRefId).toBe('milk-cow')
    expect(vg.options.map(o => o.ingredientRefId)).toEqual(['milk-cow', 'milk-oat'])
  })

  it('заполняет replace-варианту weight + калории из first-size brutto', () => {
    // Молока в size-s = 200 мл. Овсяное молоко 45 ккал/100 → 90 ккал на 200 мл.
    const oatOpt = item.variantGroups![0].options.find(o => o.ingredientRefId === 'milk-oat')!
    expect(oatOpt.weight).toBe(200)
    expect(oatOpt.calories).toBe(90)
    expect(oatOpt.fat).toBeCloseTo(3, 1)
  })

  it('сериализует allowCustomGrams аддон как modifierGroup type=addon, multi', () => {
    expect(item.modifierGroups).toHaveLength(1)
    const mg = item.modifierGroups![0]
    expect(mg.type).toBe('addon')
    expect(mg.allowCustomGrams).toBe(true)
    expect(mg.multi).toBe(true)
    expect(mg.modifiers).toHaveLength(1)
    const mod = mg.modifiers[0]
    // Cироп 320 ккал/100, weight=20 → 64 ккал на одну порцию.
    expect(mod.weight).toBe(20)
    expect(mod.calories).toBe(64)
    expect(mod.price).toBe(30)
  })
})
