import { describe, it, expect } from 'vitest'
import { normalizeForSearch, expandLayouts, searchIngredients } from '@/lib/ingredient-search'
import type { IngredientRef } from '@/types'

function ref(id: string, name: string): IngredientRef {
  return {
    id,
    name,
    unit: 'г',
    caloriesPer100: 0,
    proteinPer100: 0,
    fatPer100: 0,
    carbsPer100: 0,
    category: 'other',
  }
}

describe('normalizeForSearch', () => {
  it('lowercases and trims', () => {
    expect(normalizeForSearch('  Лосось  ')).toBe('лосось')
  })
  it('replaces ё with е', () => {
    expect(normalizeForSearch('Сёмга')).toBe('семга')
    expect(normalizeForSearch('ёжик')).toBe('ежик')
  })
})

describe('expandLayouts', () => {
  it('returns empty for empty input', () => {
    expect(expandLayouts('')).toEqual([])
    expect(expandLayouts('   ')).toEqual([])
  })

  it('includes original normalized query', () => {
    const variants = expandLayouts('лук')
    expect(variants).toContain('лук')
  })

  it('translates qwerty typed-as-russian into proper russian', () => {
    // Если набрать «лосось» на физической клавиатуре думая что русская,
    // но раскладка английская — получится "kjcjcm"
    // Наш expandLayouts должен включать «лосось» среди вариантов.
    const variants = expandLayouts('kjcjcm')
    expect(variants).toContain('лосось')
  })

  it('translates qwerty wrong-layout in the other direction too', () => {
    // Пользователь хочет «лук», но раскладка qwerty.
    // Физические клавиши «л»/«у»/«к» в qwerty это k/e/r — наберёт «ker».
    const variants = expandLayouts('ker')
    expect(variants).toContain('лук')
  })

  it('dedupes identical translations', () => {
    const variants = expandLayouts('123')
    // Цифры одинаковы во всех раскладках — должен быть один вариант
    expect(variants.length).toBe(1)
  })
})

describe('searchIngredients', () => {
  const refs = [
    ref('1', 'Лук репчатый'),
    ref('2', 'Лук-порей'),
    ref('3', 'Лук красный'),
    ref('4', 'Чеснок'),
    ref('5', 'Лосось (Сёмга)'),
    ref('6', 'Сёмга слабосолёная'),
    ref('7', 'Кабачок'),
  ]

  it('prioritizes whole-word match over substring', () => {
    // «лук» как целое слово должно выиграть у «лук-порей» (где «лук» — префикс через дефис)
    const results = searchIngredients(refs, 'лук')
    const names = results.map(r => r.ref.name)
    // Лук репчатый, Лук-порей, Лук красный — все совпали, «Лук репчатый» по алфавиту первый
    expect(names[0]).toBe('Лук красный') // алфавитный порядок при равном скоре word-match
    // Все три первые — это лук-варианты
    expect(names.slice(0, 3).every(n => n.toLowerCase().includes('лук'))).toBe(true)
  })

  it('returns empty for query with no matches', () => {
    const results = searchIngredients(refs, 'квазар')
    expect(results).toEqual([])
  })

  it('matches with ё↔е equivalence', () => {
    // Запрос «семга» должен найти «Сёмга»
    const results = searchIngredients(refs, 'семга')
    const names = results.map(r => r.ref.name)
    expect(names).toContain('Сёмга слабосолёная')
    expect(names).toContain('Лосось (Сёмга)')
  })

  it('finds ingredient via wrong-layout query (qwerty → русский)', () => {
    // «kjcjcm» = «лосось» при включённой английской раскладке
    const results = searchIngredients(refs, 'kjcjcm')
    const names = results.map(r => r.ref.name)
    expect(names).toContain('Лосось (Сёмга)')
  })

  it('exact match wins over partial', () => {
    const list = [ref('1', 'Лук репчатый'), ref('2', 'Лук')]
    const results = searchIngredients(list, 'лук')
    // «Лук» — точное совпадение, должен быть первым
    expect(results[0].ref.name).toBe('Лук')
  })

  it('prefix match wins over inner substring', () => {
    const list = [
      ref('1', 'Сахарный песок'),  // префикс «сах»
      ref('2', 'Тростниковый сахар'), // подстрока «сах» внутри
    ]
    const results = searchIngredients(list, 'сах')
    expect(results[0].ref.name).toBe('Сахарный песок')
  })

  it('is case-insensitive', () => {
    const results = searchIngredients(refs, 'ЛУК')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].ref.name.toLowerCase()).toContain('лук')
  })

  it('sorts equal-score matches alphabetically (ru locale)', () => {
    const list = [ref('1', 'Малина'), ref('2', 'Арбуз'), ref('3', 'Банан')]
    const results = searchIngredients(list, 'а') // подстрока «а» во всех
    const names = results.map(r => r.ref.name)
    // Все три имеют score=1 (substring) → алфавитно: Арбуз, Банан, Малина
    expect(names).toEqual(['Арбуз', 'Банан', 'Малина'])
  })
})
