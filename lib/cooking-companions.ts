// Пресеты «сопутствующих» ингредиентов при выборе обработки.
// Подсказывают пользователю добавить воду/масло в композицию вместо
// создания отдельного ингредиента «вареная гречка».

import type { IngredientCategory, IngredientRef, ProcessingType } from '@/types'
import { asCategory } from './cooking-coefficients'

export type CompanionKind = 'water' | 'oil'

export interface CompanionSuggestion {
  kind: CompanionKind
  label: string         // «Добавить воду 200 г»
  ratio: number         // доля от brutto исходного ингредиента
  defaultGrams?: number // если хочется показать пример
}

/**
 * Подобрать ref воды/масла из справочника пользователя.
 * Ищем по категории (liquid/oil) + предпочтительные имена.
 */
export function findCompanionRef(refs: IngredientRef[], kind: CompanionKind): IngredientRef | undefined {
  const preferredNames = kind === 'water'
    ? ['вода', 'water']
    : ['масло подсолнечное', 'подсолнечное масло', 'растительное масло', 'масло растительное', 'sunflower oil']

  const lowered = (s: string) => s.trim().toLowerCase()
  for (const name of preferredNames) {
    const hit = refs.find(r => lowered(r.name) === name)
    if (hit) return hit
  }
  for (const name of preferredNames) {
    const hit = refs.find(r => lowered(r.name).includes(name))
    if (hit) return hit
  }
  const wantCategory: IngredientCategory = kind === 'water' ? 'liquid' : 'oil'
  return refs.find(r => asCategory(r.category) === wantCategory)
}

/**
 * Вернуть подсказку для пары (processing, категория исходного ингредиента).
 * Пустой массив = ничего предлагать не нужно (например, на пару).
 */
export function suggestCompanions(
  processing: ProcessingType,
  sourceCategory: IngredientCategory | undefined,
): CompanionSuggestion[] {
  switch (processing) {
    case 'boil':
      if (sourceCategory === 'grain') {
        return [{ kind: 'water', label: 'Добавить воду', ratio: 2.0 }]
      }
      if (sourceCategory === 'vegetable' || sourceCategory === 'meat' || sourceCategory === 'poultry' || sourceCategory === 'fish') {
        return [{ kind: 'water', label: 'Добавить воду', ratio: 1.0 }]
      }
      return []
    case 'fry':
      if (sourceCategory === 'meat' || sourceCategory === 'poultry' || sourceCategory === 'fish' || sourceCategory === 'vegetable') {
        return [{ kind: 'oil', label: 'Добавить масло', ratio: 0.10 }]
      }
      return []
    case 'deep_fry':
      return [{ kind: 'oil', label: 'Добавить масло', ratio: 0.15 }]
    case 'bake':
      if (sourceCategory === 'meat' || sourceCategory === 'poultry' || sourceCategory === 'fish' || sourceCategory === 'vegetable') {
        return [{ kind: 'oil', label: 'Добавить масло', ratio: 0.05 }]
      }
      return []
    case 'stew':
      if (sourceCategory === 'meat' || sourceCategory === 'poultry' || sourceCategory === 'vegetable') {
        return [
          { kind: 'water', label: 'Добавить воду', ratio: 0.3 },
          { kind: 'oil', label: 'Добавить масло', ratio: 0.05 },
        ]
      }
      return []
    default:
      return []
  }
}
