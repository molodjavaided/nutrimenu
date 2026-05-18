// Дефолтные коэффициенты выхода (готовый вес / сырой нетто) по категориям ингредиентов.
// Усреднённые значения ГОСТ Р 53104-2008 «Услуги общественного питания. Метод органолептической оценки».
// Используются как fallback, если у конкретного ингредиента не задан yieldCoefficients/coldLossPercent.

import type { IngredientCategory, ProcessingType, YieldCoefficients } from '@/types'

export const DEFAULT_YIELD_BY_CATEGORY: Record<IngredientCategory, YieldCoefficients> = {
  grain:     { boil: 2.5, steam: 2.2 },                                // крупы/паста впитывают воду
  meat:      { boil: 0.60, fry: 0.65, stew: 0.65, bake: 0.70 },         // ужарка
  poultry:   { boil: 0.70, fry: 0.70, stew: 0.70, bake: 0.75 },
  fish:      { boil: 0.80, fry: 0.80, bake: 0.85, steam: 0.90 },
  vegetable: { boil: 0.90, fry: 0.70, stew: 0.80, bake: 0.85, steam: 0.95 },
  fruit:     { bake: 0.85, stew: 0.85 },
  dairy:     {},
  oil:       { fry: 0.15, deep_fry: 0.10, bake: 0.30 },                 // «ловушка для масла»: впитывается ~15% при жарке
  liquid:    { boil: 0.50 },                                            // выкипает наполовину при варке (упрощение)
  other:     {},
}

// Дефолтные холодные потери (зачистка/чистка), %
export const DEFAULT_COLD_LOSS_BY_CATEGORY: Record<IngredientCategory, number> = {
  grain:     0,
  meat:      20,
  poultry:   25,
  fish:      30,
  vegetable: 25,
  fruit:     15,
  dairy:     0,
  oil:       0,
  liquid:    0,
  other:     0,
}

export const PROCESSING_LABELS: Record<ProcessingType, string> = {
  raw:      'Сырой',
  boil:     'Варка',
  fry:      'Жарка',
  stew:     'Тушение',
  bake:     'Запекание',
  deep_fry: 'Фритюр',
  steam:    'На пару',
}

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  grain:     'Крупы / Паста',
  meat:      'Мясо',
  poultry:   'Птица',
  fish:      'Рыба / Морепродукты',
  vegetable: 'Овощи',
  fruit:     'Фрукты / Ягоды',
  dairy:     'Молочка',
  oil:       'Масло / Жиры',
  liquid:    'Жидкости',
  other:     'Прочее',
}

const VALID_CATEGORIES: IngredientCategory[] = [
  'grain','meat','poultry','fish','vegetable','fruit','dairy','oil','liquid','other',
]

// Маппинг русских названий категорий (legacy mock-data, IngredientFormModal) → enum.
const RU_CATEGORY_ALIAS: Record<string, IngredientCategory> = {
  'крупы и мука': 'grain',
  'крупы': 'grain',
  'паста': 'grain',
  'бобовые': 'grain',
  'мясо': 'meat',
  'птица': 'poultry',
  'рыба': 'fish',
  'рыба / морепродукты': 'fish',
  'морепродукты': 'fish',
  'овощи': 'vegetable',
  'фрукты': 'fruit',
  'фрукты / ягоды': 'fruit',
  'ягоды': 'fruit',
  'яйца и молочное': 'dairy',
  'молочка': 'dairy',
  'масла': 'oil',
  'масло / жиры': 'oil',
  'жидкости': 'liquid',
  'прочее': 'other',
}

export function asCategory(value: string | undefined): IngredientCategory | undefined {
  if (!value) return undefined
  if ((VALID_CATEGORIES as string[]).includes(value)) return value as IngredientCategory
  return RU_CATEGORY_ALIAS[value.trim().toLowerCase()]
}

/**
 * Получить коэффициент выхода для строки: override → ref → дефолт по категории → 1.
 */
type CookingProcessing = Exclude<ProcessingType, 'raw'>

export function getYieldCoef(
  processing: ProcessingType,
  override: number | undefined,
  refCoefs: YieldCoefficients | undefined,
  category: IngredientCategory | undefined,
): number {
  if (processing === 'raw') return override ?? 1
  if (override !== undefined && override > 0) return override
  const key = processing as CookingProcessing
  const refValue = refCoefs?.[key]
  if (refValue !== undefined && refValue > 0) return refValue
  if (category) {
    const def = DEFAULT_YIELD_BY_CATEGORY[category]?.[key]
    if (def !== undefined && def > 0) return def
  }
  return 1
}

/**
 * Получить % холодных потерь: override → ref → дефолт по категории → 0.
 */
export function getColdLossPercent(
  override: number | undefined,
  refValue: number | undefined,
  category: IngredientCategory | undefined,
): number {
  if (override !== undefined && override >= 0) return override
  if (refValue !== undefined && refValue >= 0) return refValue
  if (category) return DEFAULT_COLD_LOSS_BY_CATEGORY[category] ?? 0
  return 0
}
