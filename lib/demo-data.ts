/**
 * Демо-данные для /demo — категории и ингредиенты с корректными КБЖУ + yieldCoefficients,
 * чтобы режим «По сложному проценту» (TTK) показывал все возможности:
 * жарку с маслом-ловушкой, увар крупы с водой, фуд-кост.
 */

import type { IngredientRef } from '@/types'

export const DEMO_CATEGORIES = [
  { id: 'demo-cat-hot', name: 'Горячее', icon: '🔥', sortOrder: 0 },
  { id: 'demo-cat-side', name: 'Гарниры', icon: '🍚', sortOrder: 1 },
  { id: 'demo-cat-soup', name: 'Супы', icon: '🍲', sortOrder: 2 },
]

export const DEMO_INGREDIENTS: IngredientRef[] = [
  // Птица
  {
    id: 'demo-ing-chicken-fillet', name: 'Куриное филе', type: 'mono', unit: 'г',
    caloriesPer100: 165, proteinPer100: 31, fatPer100: 3.6, carbsPer100: 0,
    category: 'poultry', pricePerKg: 420, isSystem: true,
    yieldCoefficients: { fry: 0.75, boil: 0.8, bake: 0.8, stew: 0.85 },
  },
  // Мясо
  {
    id: 'demo-ing-beef', name: 'Говядина (вырезка)', type: 'mono', unit: 'г',
    caloriesPer100: 250, proteinPer100: 26, fatPer100: 17, carbsPer100: 0,
    category: 'meat', pricePerKg: 1100, isSystem: true,
    yieldCoefficients: { fry: 0.62, boil: 0.6, bake: 0.65, stew: 0.6 },
  },
  // Рыба
  {
    id: 'demo-ing-salmon', name: 'Лосось', type: 'mono', unit: 'г',
    caloriesPer100: 208, proteinPer100: 20, fatPer100: 13, carbsPer100: 0,
    category: 'fish', pricePerKg: 1450, isSystem: true,
    yieldCoefficients: { fry: 0.82, bake: 0.8, steam: 0.88 },
  },
  // Крупы / паста
  {
    id: 'demo-ing-rice', name: 'Рис', type: 'mono', unit: 'г',
    caloriesPer100: 333, proteinPer100: 6.7, fatPer100: 0.7, carbsPer100: 78,
    category: 'grain', pricePerKg: 110, isSystem: true,
    yieldCoefficients: { boil: 2.5 },
  },
  {
    id: 'demo-ing-pasta', name: 'Паста', type: 'mono', unit: 'г',
    caloriesPer100: 350, proteinPer100: 12, fatPer100: 1.5, carbsPer100: 71,
    category: 'grain', pricePerKg: 180, isSystem: true,
    yieldCoefficients: { boil: 2.2 },
  },
  // Овощи
  {
    id: 'demo-ing-onion', name: 'Лук репчатый', type: 'mono', unit: 'г',
    caloriesPer100: 41, proteinPer100: 1.4, fatPer100: 0, carbsPer100: 8.2,
    category: 'vegetable', pricePerKg: 60, isSystem: true, coldLossPercent: 16,
    yieldCoefficients: { fry: 0.5, stew: 0.65 },
  },
  {
    id: 'demo-ing-tomato', name: 'Помидор', type: 'mono', unit: 'г',
    caloriesPer100: 20, proteinPer100: 0.6, fatPer100: 0.2, carbsPer100: 4.2,
    category: 'vegetable', pricePerKg: 180, isSystem: true, coldLossPercent: 5,
  },
  {
    id: 'demo-ing-potato', name: 'Картофель', type: 'mono', unit: 'г',
    caloriesPer100: 80, proteinPer100: 2, fatPer100: 0.4, carbsPer100: 17,
    category: 'vegetable', pricePerKg: 50, isSystem: true, coldLossPercent: 25,
    yieldCoefficients: { fry: 0.7, boil: 0.93, bake: 0.85, deep_fry: 0.6 },
  },
  // Масло (категория oil — масло-ловушка)
  {
    id: 'demo-ing-oil-sunflower', name: 'Масло подсолнечное', type: 'mono', unit: 'мл',
    caloriesPer100: 884, proteinPer100: 0, fatPer100: 100, carbsPer100: 0,
    category: 'oil', pricePerKg: 130, isSystem: true,
  },
  {
    id: 'demo-ing-butter', name: 'Масло сливочное', type: 'mono', unit: 'г',
    caloriesPer100: 717, proteinPer100: 0.9, fatPer100: 81, carbsPer100: 0.1,
    category: 'oil', pricePerKg: 720, isSystem: true,
  },
  // Жидкость
  {
    id: 'demo-ing-water', name: 'Вода', type: 'mono', unit: 'мл',
    caloriesPer100: 0, proteinPer100: 0, fatPer100: 0, carbsPer100: 0,
    category: 'liquid', isSystem: true,
  },
  {
    id: 'demo-ing-cream', name: 'Сливки 20%', type: 'mono', unit: 'мл',
    caloriesPer100: 205, proteinPer100: 2.8, fatPer100: 20, carbsPer100: 3.7,
    category: 'dairy', pricePerKg: 380, isSystem: true,
  },
  // Соль/специи (нулевые КБЖУ, для реализма)
  {
    id: 'demo-ing-salt', name: 'Соль', type: 'mono', unit: 'г',
    caloriesPer100: 0, proteinPer100: 0, fatPer100: 0, carbsPer100: 0,
    category: 'other', pricePerKg: 20, isSystem: true,
  },
]

export const DEMO_LIBRARY = {
  id: 'demo-library',
  name: 'Демо ингредиенты',
  isSystem: true,
  ingredients: DEMO_INGREDIENTS,
}
