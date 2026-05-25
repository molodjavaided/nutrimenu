import { useCallback } from 'react'
import type { AddonGroup, AddonItem } from './useItemFormState'

/**
 * 6 CRUD-операций над addonGroups. Та же идея, что useVariantGroups.
 */
export function useAddonGroups(setAddonGroups: (updater: (prev: AddonGroup[]) => AddonGroup[]) => void) {
  const addAddonGroup = useCallback(() => {
    setAddonGroups(prev => [...prev, { id: crypto.randomUUID(), label: '', allowCustomGrams: false, addons: [] }])
  }, [setAddonGroups])

  const updateAddonGroup = useCallback((groupId: string, updates: Partial<AddonGroup>) => {
    setAddonGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g))
  }, [setAddonGroups])

  const removeAddonGroup = useCallback((groupId: string) => {
    setAddonGroups(prev => prev.filter(g => g.id !== groupId))
  }, [setAddonGroups])

  const addAddonToGroup = useCallback((groupId: string) => {
    setAddonGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, addons: [...g.addons, { id: crypto.randomUUID(), ingredientRefId: '', label: '' }] }
        : g
    ))
  }, [setAddonGroups])

  const updateAddon = useCallback((groupId: string, addonId: string, updates: Partial<AddonItem>) => {
    setAddonGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, addons: g.addons.map(a => a.id === addonId ? { ...a, ...updates } : a) } : g
    ))
  }, [setAddonGroups])

  const removeAddon = useCallback((groupId: string, addonId: string) => {
    setAddonGroups(prev => prev.map(g => g.id === groupId ? { ...g, addons: g.addons.filter(a => a.id !== addonId) } : g))
  }, [setAddonGroups])

  return { addAddonGroup, updateAddonGroup, removeAddonGroup, addAddonToGroup, updateAddon, removeAddon }
}
