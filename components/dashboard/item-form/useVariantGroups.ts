import { useCallback } from 'react'
import type { VariantChoice, VariantOption } from './useItemFormState'

/**
 * 6 CRUD-операций над variantGroups. Принимает текущее состояние и сеттер из RHF.
 * Все колбэки — useCallback без зависимостей (сеттер стабилен через RHF).
 */
export function useVariantGroups(setVariantGroups: (updater: (prev: VariantOption[]) => VariantOption[]) => void) {
  const addVariantGroup = useCallback(() => {
    setVariantGroups(prev => [...prev, { id: crypto.randomUUID(), label: '', required: false, options: [] }])
  }, [setVariantGroups])

  const updateVariantGroup = useCallback((groupId: string, updates: Partial<VariantOption>) => {
    setVariantGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g))
  }, [setVariantGroups])

  const removeVariantGroup = useCallback((groupId: string) => {
    setVariantGroups(prev => prev.filter(g => g.id !== groupId))
  }, [setVariantGroups])

  const addVariantOption = useCallback((groupId: string) => {
    const newOption: VariantChoice = {
      id: crypto.randomUUID(), ingredientRefId: '', label: '',
      weight: 100, weightUnit: 'г',
      calories: 0, protein: 0, fat: 0, carbs: 0, isManual: false,
    }
    setVariantGroups(prev => prev.map(g => g.id === groupId ? { ...g, options: [...g.options, newOption] } : g))
  }, [setVariantGroups])

  const updateVariantOption = useCallback((groupId: string, optionId: string, updates: Partial<VariantChoice>) => {
    setVariantGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, options: g.options.map(o => o.id === optionId ? { ...o, ...updates, isManual: updates.calories !== undefined ? true : o.isManual } : o) }
        : g
    ))
  }, [setVariantGroups])

  const removeVariantOption = useCallback((groupId: string, optionId: string) => {
    setVariantGroups(prev => prev.map(g => g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optionId) } : g))
  }, [setVariantGroups])

  return { addVariantGroup, updateVariantGroup, removeVariantGroup, addVariantOption, updateVariantOption, removeVariantOption }
}
