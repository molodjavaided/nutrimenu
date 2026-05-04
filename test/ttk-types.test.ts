import { describe, it, expect } from 'vitest'
import { normalizeIngredientName } from '@/lib/ttk-types'

describe('normalizeIngredientName', () => {
  it('strips п/ф prefix', () => {
    expect(normalizeIngredientName('п/ф Курица')).toBe('Курица')
  })

  it('strips пф suffix', () => {
    expect(normalizeIngredientName('Курица пф')).toBe('Курица')
  })

  it('strips parenthetical notes', () => {
    expect(normalizeIngredientName('Лосось (охл.)')).toBe('Лосось')
  })

  it('strips abbreviation охл', () => {
    expect(normalizeIngredientName('Говядина охл')).toBe('Говядина')
  })

  it('strips abbreviation зам', () => {
    expect(normalizeIngredientName('Рыба зам.')).toBe('Рыба')
  })

  it('strips чищен* words', () => {
    expect(normalizeIngredientName('Картофель чищеный')).toBe('Картофель')
  })

  it('normalizes multiple spaces', () => {
    expect(normalizeIngredientName('Масло   сливочное')).toBe('Масло сливочное')
  })

  it('strips trailing dots', () => {
    expect(normalizeIngredientName('Мука...')).toBe('Мука')
  })

  it('handles clean name without modification', () => {
    expect(normalizeIngredientName('Томаты черри')).toBe('Томаты черри')
  })

  it('handles combined stripping', () => {
    expect(normalizeIngredientName('п/ф Грудка куриная (охл) чищеная')).toBe('Грудка куриная')
  })
})
