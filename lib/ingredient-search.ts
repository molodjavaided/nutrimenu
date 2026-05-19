import type { IngredientRef } from '@/types'

// Маппинг физических клавиш: позиция qwerty → позиция йцукен.
// Используется чтобы найти ингредиент когда пользователь набрал на неправильной раскладке.
const QWERTY = "qwertyuiop[]asdfghjkl;'zxcvbnm,./`"
const JCUKEN = "йцукенгшщзхъфывапролджэячсмитьбю.ё"

const QWERTY_TO_JCUKEN: Record<string, string> = {}
const JCUKEN_TO_QWERTY: Record<string, string> = {}
for (let i = 0; i < QWERTY.length; i++) {
  QWERTY_TO_JCUKEN[QWERTY[i]] = JCUKEN[i]
  JCUKEN_TO_QWERTY[JCUKEN[i]] = QWERTY[i]
}

function translateLayout(s: string, map: Record<string, string>): string {
  let out = ''
  for (const ch of s) out += map[ch] ?? ch
  return out
}

/** lowercase + ё→е + trim. Для согласования сравнения. */
export function normalizeForSearch(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').trim()
}

/**
 * Возвращает варианты запроса для поиска: оригинал + перевод раскладки в обе стороны.
 * Если все три совпадают (что бывает для цифр/латиницы) — дедуплицируем.
 */
export function expandLayouts(query: string): string[] {
  const base = normalizeForSearch(query)
  if (!base) return []
  const asRu = translateLayout(base, QWERTY_TO_JCUKEN)
  const asEn = translateLayout(base, JCUKEN_TO_QWERTY)
  return Array.from(new Set([base, asRu, asEn]))
}

/**
 * Скоринг совпадения: 4=точное, 3=совпадение слова, 2=префикс, 1=подстрока, 0=нет.
 * Запрос уже должен быть нормализован.
 */
function scoreFor(name: string, q: string): number {
  if (!q) return 0
  if (name === q) return 4
  // Совпадение целого слова (по границе пробела/дефиса)
  const words = name.split(/[\s\-/(),.]+/).filter(Boolean)
  if (words.includes(q)) return 3
  if (name.startsWith(q)) return 2
  if (words.some(w => w.startsWith(q))) return 2
  if (name.includes(q)) return 1
  return 0
}

export interface ScoredRef<T extends IngredientRef = IngredientRef> {
  ref: T
  score: number
}

/**
 * Поиск ингредиента с раскладкой-агностиком и приоритизацией.
 * Возвращает сортированный список (лучшие совпадения сверху).
 */
export function searchIngredients<T extends IngredientRef>(refs: T[], query: string): ScoredRef<T>[] {
  const queries = expandLayouts(query)
  if (queries.length === 0) return refs.map(ref => ({ ref, score: 0 }))

  const out: ScoredRef<T>[] = []
  for (const ref of refs) {
    const name = normalizeForSearch(ref.name)
    let best = 0
    for (const q of queries) {
      const s = scoreFor(name, q)
      if (s > best) best = s
      if (best === 4) break
    }
    if (best > 0) out.push({ ref, score: best })
  }

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.ref.name.localeCompare(b.ref.name, 'ru')
  })
  return out
}
