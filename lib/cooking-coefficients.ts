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
  'крупа': 'grain',
  'крупы и Мука': 'grain',
  'паста': 'grain',
  'бобовые': 'grain',
  'бакалея': 'grain',
  'хлеб и выпечка': 'grain',
  'растительные протеины': 'grain',
  'мясо': 'meat',
  'мясо и рыба': 'meat',
  'мясо и птица': 'meat',
  'мясо, птица и кролик': 'meat',
  'птица': 'poultry',
  'рыба': 'fish',
  'рыба / морепродукты': 'fish',
  'рыба и морепродукты': 'fish',
  'морепродукты': 'fish',
  'овощи': 'vegetable',
  'зелень': 'vegetable',
  'грибы': 'vegetable',
  'зелень и капуста': 'vegetable',
  'луковичные и корнеплоды': 'vegetable',
  'пасленовые, тыквенные и бахчевые': 'vegetable',
  'фрукты': 'fruit',
  'фрукты / ягоды': 'fruit',
  'фрукты и ягоды': 'fruit',
  'ягоды': 'fruit',
  'орехи и ореховые пасты': 'fruit',
  'яйца и молочное': 'dairy',
  'яйца и молочные продукты': 'dairy',
  'молочка': 'dairy',
  'молоко': 'dairy',
  'молочные': 'dairy',
  'сыры': 'dairy',
  'масла': 'oil',
  'масло / жиры': 'oil',
  'жидкости': 'liquid',
  'напитки и бар': 'liquid',
  'соусы': 'other',
  'соусы, специи и добавки': 'other',
  'выпечка': 'other',
  'прочее': 'other',
}

export function asCategory(value: string | undefined): IngredientCategory | undefined {
  if (!value) return undefined
  if ((VALID_CATEGORIES as string[]).includes(value)) return value as IngredientCategory
  return RU_CATEGORY_ALIAS[value.trim().toLowerCase()]
}

// ── Auto-detect category by ingredient name (no AI, just substring patterns) ──
// Порядок важен: специфичные паттерны выше более общих.
const NAME_PATTERNS: Array<{ patterns: RegExp; category: IngredientCategory }> = [
  // Сливочное масло — это молочка, а не растительное масло. Должно быть выше 'масло'.
  { patterns: /сливочн.*масл|масло сливочн|топлён.*масл|топлен.*масл|гхи/i, category: 'dairy' },
  // Растительные масла и жиры
  { patterns: /масло|oil|маргарин|сало|жир\b/i, category: 'oil' },
  // Птица (раньше мяса, потому что «курица» содержит «кур»)
  { patterns: /куриц|кур(\b|[ -])|индейк|индюш|утк|утин|гус(ь|и|ын)|цыпл|бройлер|перепел/i, category: 'poultry' },
  // Мясо
  { patterns: /мясо|говяд|свин|телятин|баранин|конин|оленин|кролик|бекон|ветчин|колбас|фарш|стейк|вырезк/i, category: 'meat' },
  // Рыба и морепродукты
  { patterns: /рыб|лосось|сёмг|семг|форель|треск|минтай|скумбри|тунец|горбуш|сельд|килька|кета|нерка|судак|щука|карп|окунь|креветк|кальмар|мидии|морепрод|икр(а|у|ы)|анчоус|сардин/i, category: 'fish' },
  // Молочка
  { patterns: /молок|сливк|сметан|кефир|йогурт|ряженк|творог|сыр|брынз|моцарелл|фет(а|у)|маскарпоне|рикотт|пармез|чеддер|яйц|яиц/i, category: 'dairy' },
  // Крупы / мука / бобовые / паста / хлеб
  { patterns: /круп|\bрис\b|рисов|греч|овсян|перлов|пшен|ячмен|манн|кускус|булгур|киноа|паста\b|макарон|спагетт|лапш|муч|мука|хлеб|тесто|пшениц|рож|отруб|фасол|нут\b|чечевиц|горох|боб/i, category: 'grain' },
  // Зелень / овощи / грибы
  { patterns: /овощ|картоф|морков|\bлук\b|чеснок|помидор|томат|огурец|капуст|перец|кабач|баклажан|тыкв|свёкл|свекл|редис|зелен|укроп|петрушк|кинз|базилик|шпинат|салат|руккол|грибы|шампиньон|вёшенк|вешенк|спарж|брокколи|фасоль струч/i, category: 'vegetable' },
  // Фрукты / ягоды / орехи
  { patterns: /фрукт|яблок|груш|банан|апельсин|мандарин|лимон|лайм|киви|ягод|клубник|малин|черник|голубик|смородин|вишн|череш|виноград|ананас|манго|авокадо|дын|арбуз|персик|абрикос|слив(а|ы|у)|инжир|финик|изюм|курага|чернослив|орех|миндал|фундук|кешью|фисташ|кедров|арахис/i, category: 'fruit' },
  // Жидкости (без молочки и масел, они выше)
  { patterns: /вода|бульон|сок\b|уксус|вино\b|пиво|компот/i, category: 'liquid' },
]

export function inferCategoryFromName(name: string | undefined): IngredientCategory | undefined {
  if (!name) return undefined
  const trimmed = name.trim()
  if (!trimmed) return undefined
  for (const { patterns, category } of NAME_PATTERNS) {
    if (patterns.test(trimmed)) return category
  }
  return undefined
}

/**
 * Финальный резолв категории: явная категория → авто-детект по имени → undefined.
 */
export function resolveCategory(rawCategory: string | undefined, name: string | undefined): IngredientCategory | undefined {
  const explicit = asCategory(rawCategory)
  if (explicit && explicit !== 'other') return explicit
  const inferred = inferCategoryFromName(name)
  return inferred ?? explicit
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
