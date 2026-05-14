'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { IngredientRef, MenuItem, ModifierGroup, SelectedModifiers, SelectedVariants, VariantGroup } from '@/types'
import { buildVariantLabel, resolveNutriFromComposition } from '@/lib/utils'
import { getAllergenById } from '@/lib/allergens'
import { initLibraries } from '@/lib/store'
import { systemLibraries } from '@/lib/mock-data'

interface Props {
  item: MenuItem
  onClose: () => void
  onAdd: (item: MenuItem, quantity: number, variants: SelectedVariants, modifiers: SelectedModifiers, label: string) => void
  venueIngredientRefs?: IngredientRef[]
}

const BG_CHIP = 'rgba(255,255,255,0.10)'
const BG_CHIP_ACTIVE = '#7C3AED'
const GLASS_DARK = 'rgba(0,0,0,0.52)'
const TEXT = 'rgba(255,255,255,0.92)'
const TEXT_MUTED = 'rgba(255,255,255,0.45)'

function getDefaultModifiers(item: MenuItem): SelectedModifiers {
  const result: SelectedModifiers = {}
  for (const g of item.modifierGroups ?? []) {
    if (!g.multi && g.required && g.modifiers[0]) result[g.id] = g.modifiers[0].id
  }
  return result
}

export default function DishSheetContent({ item, onClose, onAdd, venueIngredientRefs = [] }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [variants, setVariants] = useState<SelectedVariants>({})
  const [modifiers, setModifiers] = useState<SelectedModifiers>(() => getDefaultModifiers(item))
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(item.sizes?.[0]?.id ?? null)
  const [gramAmounts, setGramAmounts] = useState<Record<string, Record<string, number>>>({})
  const [compositionOpen, setCompositionOpen] = useState(false)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [sizePickerOpen, setSizePickerOpen] = useState(false)

  const ingredientRefs = useMemo<IngredientRef[]>(() => {
    const libs = initLibraries(systemLibraries)
    const systemRefs = libs.flatMap(l => l.ingredients)
    const map = new Map<string, IngredientRef>()
    for (const r of systemRefs) map.set(r.id, r)
    for (const r of venueIngredientRefs) map.set(r.id, r)
    return [...map.values()]
  }, [venueIngredientRefs])

  const resolvedNutri = useMemo(() => {
    const activeSize = item.sizes && item.sizes.length > 0
      ? (item.sizes.find(s => s.id === selectedSizeId) ?? item.sizes[0])
      : null

    const total = {
      calories: activeSize?.calories ?? item.calories,
      protein: activeSize?.protein ?? item.protein,
      fat: activeSize?.fat ?? item.fat,
      carbs: activeSize?.carbs ?? item.carbs,
    }

    for (const group of item.variantGroups ?? []) {
      const selectedId = variants[group.id]
      const option = group.options.find(o => o.id === selectedId)
      if (!option) continue
      if (group.replacesIngredientRefId) {
        const composition = activeSize?.composition ?? []
        const originalRow = composition.find(c => c.ingredientId === group.replacesIngredientRefId)
        const originalRef = ingredientRefs.find(r => r.id === group.replacesIngredientRefId)
        const replacementRef = option.ingredientRefId ? ingredientRefs.find(r => r.id === option.ingredientRefId) : undefined
        if (originalRow && originalRow.amount > 0 && originalRef) {
          const ratio = originalRow.amount / 100
          const origCal = Math.round(originalRef.caloriesPer100 * ratio)
          const origProt = Math.round(originalRef.proteinPer100 * ratio * 10) / 10
          const origFat = Math.round(originalRef.fatPer100 * ratio * 10) / 10
          const origCarb = Math.round(originalRef.carbsPer100 * ratio * 10) / 10
          const replCal = replacementRef ? Math.round(replacementRef.caloriesPer100 * ratio) : option.calories
          const replProt = replacementRef ? Math.round(replacementRef.proteinPer100 * ratio * 10) / 10 : option.protein
          const replFat = replacementRef ? Math.round(replacementRef.fatPer100 * ratio * 10) / 10 : option.fat
          const replCarb = replacementRef ? Math.round(replacementRef.carbsPer100 * ratio * 10) / 10 : option.carbs
          total.calories += replCal - origCal
          total.protein += replProt - origProt
          total.fat += replFat - origFat
          total.carbs += replCarb - origCarb
        } else {
          total.calories += option.calories
          total.protein += option.protein
          total.fat += option.fat
          total.carbs += option.carbs
        }
      } else if (option.calories > 0) {
        total.calories = option.calories
        total.protein = option.protein
        total.fat = option.fat
        total.carbs = option.carbs
      }
    }

    for (const group of item.modifierGroups ?? []) {
      if (group.type === 'replace') {
        const as = item.sizes?.find(s => s.id === selectedSizeId) ?? item.sizes?.[0]
        if (as?.composition) {
          const r = resolveNutriFromComposition(as.composition, ingredientRefs, item.modifierGroups ?? [], modifiers)
          total.calories = r.calories; total.protein = r.protein; total.fat = r.fat; total.carbs = r.carbs
        }
        continue
      }
      if (group.allowCustomGrams) {
        const groupGrams = gramAmounts[group.id] ?? {}
        for (const modifier of group.modifiers) {
          const grams = groupGrams[modifier.id] ?? 0
          if (grams > 0) {
            const ratio = grams / 100
            total.calories += Math.round(modifier.calories * ratio)
            total.protein += Math.round(modifier.protein * ratio * 10) / 10
            total.fat += Math.round(modifier.fat * ratio * 10) / 10
            total.carbs += Math.round(modifier.carbs * ratio * 10) / 10
          }
        }
        continue
      }
      if (group.multi) {
        const selected = modifiers[group.id]
        if (!Array.isArray(selected)) continue
        for (const id of selected) {
          const m = group.modifiers.find(x => x.id === id)
          if (m) { total.calories += m.calories; total.protein += m.protein; total.fat += m.fat; total.carbs += m.carbs }
        }
        continue
      }
      const selectedId = modifiers[group.id]
      if (!selectedId || typeof selectedId !== 'string') continue
      const modifier = group.modifiers.find(m => m.id === selectedId)
      if (!modifier) continue
      if (group.calcByMl && group.mlPerVariant && group.linkedVariantGroupId) {
        const linkedVariantId = variants[group.linkedVariantGroupId]
        const mlAmount = linkedVariantId ? (group.mlPerVariant[linkedVariantId] ?? 0) : 0
        if (mlAmount > 0) {
          const ratio = mlAmount / 100
          total.calories += Math.round(modifier.calories * ratio)
          total.protein += Math.round(modifier.protein * ratio * 10) / 10
          total.fat += Math.round(modifier.fat * ratio * 10) / 10
          total.carbs += Math.round(modifier.carbs * ratio * 10) / 10
        }
      } else if (group.required) {
        const defaultMod = group.modifiers[0]
        total.calories += modifier.calories - defaultMod.calories
        total.protein += modifier.protein - defaultMod.protein
        total.fat += modifier.fat - defaultMod.fat
        total.carbs += modifier.carbs - defaultMod.carbs
      } else {
        total.calories += modifier.calories
        total.protein += modifier.protein
        total.fat += modifier.fat
        total.carbs += modifier.carbs
      }
    }

    return {
      calories: total.calories * quantity,
      protein: Math.round(total.protein * quantity * 10) / 10,
      fat: Math.round(total.fat * quantity * 10) / 10,
      carbs: Math.round(total.carbs * quantity * 10) / 10,
      weight: activeSize?.weight ?? item.weight,
      weightUnit: (activeSize?.weightUnit ?? item.weightUnit) as 'г' | 'мл',
    }
  }, [item, variants, modifiers, gramAmounts, quantity, ingredientRefs, selectedSizeId])

  const priceExtra = useMemo(() => {
    let extra = 0
    for (const group of item.variantGroups ?? []) {
      const selId = variants[group.id]
      const opt = group.options.find(o => o.id === selId)
      if (opt?.price) extra += opt.price
    }
    for (const group of item.modifierGroups ?? []) {
      if (group.multi) {
        const sel = Array.isArray(modifiers[group.id]) ? modifiers[group.id] as unknown as string[] : []
        for (const id of sel) {
          const m = group.modifiers.find(x => x.id === id)
          if (m?.price) extra += m.price
        }
      } else {
        const selId = modifiers[group.id]
        if (typeof selId === 'string') {
          const m = group.modifiers.find(x => x.id === selId)
          if (m?.price) extra += m.price
        }
      }
    }
    return extra * quantity
  }, [item, variants, modifiers, quantity])

  const activeSize = item.sizes && item.sizes.length > 0
    ? (item.sizes.find(s => s.id === selectedSizeId) ?? item.sizes[0])
    : null

  function getOptionCalories(group: { replacesIngredientRefId?: string }, opt: { ingredientRefId?: string; calories: number }): number {
    if (!group.replacesIngredientRefId) return opt.calories
    const composition = activeSize?.composition ?? []
    const originalRow = composition.find(c => c.ingredientId === group.replacesIngredientRefId)
    if (!originalRow?.amount) return opt.calories
    const replacementRef = opt.ingredientRefId ? ingredientRefs.find(r => r.id === opt.ingredientRefId) : undefined
    if (!replacementRef) return opt.calories
    return Math.round(replacementRef.caloriesPer100 * originalRow.amount / 100)
  }

  const isValid = (item.variantGroups ?? []).filter(g => g.required).every(g => variants[g.id])

  function handleAdd() {
    if (!isValid) return
    onAdd(item, quantity, variants, modifiers, buildVariantLabel(item, variants, modifiers))
  }

  const compRows = activeSize?.composition ?? item.composition ?? []
  const hasComposition = compRows.length > 0
  const hasAllergens = (item.allergens ?? []).length > 0

  type GroupEntry =
    | { id: string; label: string; type: 'variant'; group: VariantGroup }
    | { id: string; label: string; type: 'modifier'; group: ModifierGroup }

  const allGroups: GroupEntry[] = [
    ...(item.variantGroups ?? []).map(g => ({ id: g.id, label: g.label, type: 'variant' as const, group: g })),
    ...(item.modifierGroups ?? []).map(g => ({ id: g.id, label: g.label, type: 'modifier' as const, group: g })),
  ]

  function chipLabel(entry: GroupEntry): string {
    if (entry.type === 'variant') {
      const sel = entry.group.options.find((o: { id: string; label: string }) => o.id === variants[entry.group.id])
      return sel ? `${entry.group.label}: ${sel.label}` : entry.group.label
    } else {
      const g = entry.group
      if (g.multi) {
        const selIds = Array.isArray(modifiers[g.id]) ? (modifiers[g.id] as unknown as string[]) : []
        if (selIds.length === 0) return g.label
        const names = selIds.map(id => g.modifiers.find(m => m.id === id)?.label).filter(Boolean)
        return `${g.label}: ${names.join(', ')}`
      }
      const sel = g.modifiers.find(m => m.id === modifiers[g.id])
      return sel ? `${g.label}: ${sel.label}` : g.label
    }
  }

  function chipIcon(entry: GroupEntry): string {
    if (entry.type === 'variant') return '⇄'
    return entry.group.type === 'replace' ? '⇄' : '+'
  }

  function isChipSelected(entry: GroupEntry): boolean {
    if (entry.type === 'variant') return !!variants[entry.group.id]
    const g = entry.group
    if (g.multi) return Array.isArray(modifiers[g.id]) && (modifiers[g.id] as unknown as string[]).length > 0
    return !!modifiers[g.id]
  }

  const displayPrice = activeSize?.price ?? item.price

  return (
    <div className="relative w-full h-full">
      {item.photo
        ? <Image src={item.photo} alt={item.name} fill className="object-cover" sizes="(max-width: 512px) 100vw, 512px" priority style={{ objectPosition: item.photoPosition === 'top' ? 'center top' : item.photoPosition === 'bottom' ? 'center bottom' : 'center center' }} />
        : <div className="w-full h-full flex items-center justify-center text-7xl" style={{ background: '#1a1426' }}>🍽️</div>
      }

      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: '40%',
          background: `linear-gradient(to bottom, rgba(28,23,38,0.85) 0%, rgba(28,23,38,0.6) 50%, transparent 100%)`,
          pointerEvents: 'none',
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: '40%',
          background: `linear-gradient(to top, rgba(28,23,38,0.95) 0%, rgba(28,23,38,0.7) 50%, transparent 100%)`,
          pointerEvents: 'none',
        }}
      />

      <div className="absolute inset-x-0 top-0 px-5 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-[17px] font-semibold leading-snug flex-1" style={{ color: TEXT, fontFamily: 'Stolzl, sans-serif' }}>
            {item.name}
          </h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full shrink-0 active:opacity-70"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            aria-label="Закрыть"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1 1l9 9M10 1L1 10" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1 mb-3">
          {item.sizes && item.sizes.length > 1 ? (
            <button
              onClick={() => setSizePickerOpen(o => !o)}
              className="text-center active:opacity-70 transition-opacity"
            >
              <p className="text-[15px] font-semibold flex items-center justify-center gap-0.5" style={{ color: sizePickerOpen ? '#A78BFA' : TEXT }}>
                {activeSize?.name || `${resolvedNutri.weight}${resolvedNutri.weightUnit}`}
                <svg width="7" height="7" viewBox="0 0 7 7" fill="none"
                  style={{ transform: sizePickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M1 2.5l2.5 2.5L6 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: TEXT_MUTED }}>
                {resolvedNutri.weight}{resolvedNutri.weightUnit}
              </p>
            </button>
          ) : (
            <div className="text-center">
              <p className="text-[15px] font-semibold" style={{ color: TEXT }}>
                {activeSize?.name || `${resolvedNutri.weight}${resolvedNutri.weightUnit}`}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: TEXT_MUTED }}>
                {activeSize?.name ? `${resolvedNutri.weight}${resolvedNutri.weightUnit}` : 'объём'}
              </p>
            </div>
          )}

          {[
            { val: Math.round(resolvedNutri.calories), label: 'ккал' },
            { val: `${Math.round(resolvedNutri.protein)}г`, label: 'белки' },
            { val: `${Math.round(resolvedNutri.fat)}г`, label: 'жиры' },
            { val: `${Math.round(resolvedNutri.carbs)}г`, label: 'углеводы' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <p className="text-[15px] font-semibold" style={{ color: TEXT }}>{val}</p>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_MUTED }}>{label}</p>
            </div>
          ))}
        </div>

        {sizePickerOpen && item.sizes && item.sizes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {item.sizes.map(size => {
              const isActive = (selectedSizeId ?? item.sizes![0].id) === size.id
              return (
                <button
                  key={size.id}
                  onClick={() => setSelectedSizeId(size.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:opacity-70"
                  style={isActive
                    ? { background: '#7C3AED', color: '#fff' }
                    : { background: GLASS_DARK, backdropFilter: 'blur(12px)', color: '#fff' }
                  }
                >
                  {size.name || `${size.weight} ${size.weightUnit}`}
                  <span className="ml-1 opacity-60">{size.calories} ккал</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {item.description && (
            <button
              onClick={() => setDescriptionOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:opacity-70"
              style={{ background: GLASS_DARK, backdropFilter: 'blur(12px)', color: '#fff' }}
            >
              Описание
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"
                style={{ transform: descriptionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M1.5 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {hasComposition && (
            <button
              onClick={() => setCompositionOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:opacity-70"
              style={{ background: GLASS_DARK, backdropFilter: 'blur(12px)', color: '#fff' }}
            >
              Состав
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"
                style={{ transform: compositionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M1.5 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {hasAllergens && (item.allergens ?? []).map(id => {
            const a = getAllergenById(id)
            if (!a) return null
            return (
              <span key={id} className="text-[10px] px-2 py-1 rounded-full font-medium"
                style={{ background: 'rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
                {a.emoji} {a.label}
              </span>
            )
          })}
        </div>

        {descriptionOpen && item.description && (
          <p className="mt-2 text-xs leading-relaxed px-3 py-2 rounded-xl"
            style={{ background: GLASS_DARK, backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,0.9)' }}>
            {item.description}
          </p>
        )}

        {compositionOpen && hasComposition && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {compRows.map((row, i) => {
              const ref = ingredientRefs.find(r => r.id === row.ingredientId)
              if (!ref) return null
              return (
                <span key={i} className="text-[11px] px-2 py-1 rounded-full"
                  style={{ background: GLASS_DARK, backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,0.9)' }}>
                  {ref.name}{row.amount > 0 ? ` ${row.amount}${row.unit}` : ''}
                </span>
              )
            })}
            <span className="text-[11px] px-2 py-1 rounded-full font-medium"
              style={{ background: BG_CHIP_ACTIVE, color: '#fff' }}>
              Итого: {resolvedNutri.weight}{resolvedNutri.weightUnit}
            </span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0">
        {activeGroupId && (() => {
          const entry = allGroups.find(e => e.id === activeGroupId)
          if (!entry) return null
          return (
            <div className="px-5 py-3">
              {(() => {
                if (entry.type === 'variant') {
                  const group = entry.group as VariantGroup
                  return (
                    <div className="flex flex-wrap gap-2">
                      {group.options.map(opt => {
                        const isActive = variants[group.id] === opt.id
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setVariants(prev => {
                              if (!group.required && prev[group.id] === opt.id) {
                                const next = { ...prev }; delete next[group.id]; return next
                              }
                              return { ...prev, [group.id]: opt.id }
                            })}
                            className="px-3 py-2 rounded-full text-sm transition-all active:opacity-70"
                            style={isActive
                              ? { background: BG_CHIP_ACTIVE, color: '#fff' }
                              : { background: GLASS_DARK, backdropFilter: 'blur(12px)', color: '#fff' }
                            }
                          >
                            {opt.label}
                            {opt.price != null && opt.price > 0 && (
                              <span className="ml-1 text-xs opacity-80">+{opt.price} ₽</span>
                            )}
                            {opt.calories > 0 && (
                              <span className="ml-1 text-xs opacity-60">{getOptionCalories(group, opt)} ккал</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                }
                const group = entry.group as ModifierGroup
                if (group.allowCustomGrams) {
                  return (
                    <div className="flex flex-col gap-2">
                      {group.modifiers.map(mod => {
                        const grams = gramAmounts[group.id]?.[mod.id] ?? 0
                        const kcal = grams > 0 ? Math.round(mod.calories * grams / 100) : 0
                        return (
                          <div key={mod.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                            style={{ background: GLASS_DARK, backdropFilter: 'blur(12px)' }}>
                            <span className="flex-1 text-sm" style={{ color: TEXT }}>{mod.label}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setGramAmounts(prev => ({ ...prev, [group.id]: { ...prev[group.id], [mod.id]: Math.max(0, (prev[group.id]?.[mod.id] ?? 0) - 5) } }))}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>−</button>
                              <input type="number" inputMode="decimal" value={grams || ''} placeholder="0"
                                onChange={e => setGramAmounts(prev => ({ ...prev, [group.id]: { ...prev[group.id], [mod.id]: Math.max(0, Number(e.target.value) || 0) } }))}
                                className="w-12 text-center text-sm outline-none rounded-lg h-8"
                                style={{ background: 'rgba(255,255,255,0.1)', color: TEXT }} />
                              <button onClick={() => setGramAmounts(prev => ({ ...prev, [group.id]: { ...prev[group.id], [mod.id]: (prev[group.id]?.[mod.id] ?? 0) + 5 } }))}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>+</button>
                              <span className="text-xs w-6" style={{ color: TEXT_MUTED }}>г</span>
                            </div>
                            {kcal > 0 && <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#A78BFA' }}>+{kcal} ккал</span>}
                          </div>
                        )
                      })}
                    </div>
                  )
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {group.modifiers.map(mod => {
                      const isSelected = group.multi
                        ? Array.isArray(modifiers[group.id]) && (modifiers[group.id] as unknown as string[]).includes(mod.id)
                        : modifiers[group.id] === mod.id
                      return (
                        <button
                          key={mod.id}
                          onClick={() => {
                            if (group.multi) {
                              setModifiers(m => {
                                const cur = Array.isArray(m[group.id]) ? m[group.id] as unknown as string[] : []
                                return { ...m, [group.id]: (cur.includes(mod.id) ? cur.filter(x => x !== mod.id) : [...cur, mod.id]) as unknown as string }
                              })
                            } else {
                              setModifiers(m => ({ ...m, [group.id]: mod.id }))
                            }
                          }}
                          className="px-3 py-2 rounded-full text-sm transition-all active:opacity-70"
                          style={isSelected
                            ? { background: BG_CHIP_ACTIVE, color: '#fff' }
                            : { background: BG_CHIP, color: 'rgba(255,255,255,0.85)' }
                          }
                        >
                          {mod.label}
                          {mod.price != null && mod.price > 0 && (
                            <span className="ml-1 text-xs opacity-80">+{mod.price} ₽</span>
                          )}
                          {mod.calories > 0 && group.type !== 'replace' && (
                            <span className="ml-1 text-xs opacity-60">+{mod.calories} ккал</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )
        })()}

        {allGroups.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto px-5 py-3"
            style={{ scrollbarWidth: 'none' }}
          >
            {allGroups.map(entry => {
              const active = activeGroupId === entry.id
              const selected = isChipSelected(entry)
              return (
                <button
                  key={entry.id}
                  onClick={() => setActiveGroupId(active ? null : entry.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all active:opacity-70 whitespace-nowrap"
                  style={active || selected
                    ? { background: BG_CHIP_ACTIVE, color: '#fff' }
                    : { background: GLASS_DARK, backdropFilter: 'blur(12px)', color: '#fff' }
                  }
                >
                  {!selected && <span className="text-sm leading-none opacity-70">{chipIcon(entry)}</span>}
                  {chipLabel(entry)}
                </button>
              )
            })}
          </div>
        )}

        <div
          className="px-4 pt-2 flex items-center gap-2"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {displayPrice != null && (
            <div className="flex flex-col shrink-0">
              <span className="text-sm font-semibold leading-tight" style={{ color: TEXT }}>
                {(displayPrice * quantity) + priceExtra} ₽
              </span>
              {priceExtra > 0 && (
                <span className="text-[10px] leading-tight" style={{ color: TEXT_MUTED }}>
                  {displayPrice * quantity} + {priceExtra} доп.
                </span>
              )}
            </div>
          )}

          <div className="flex items-center shrink-0 rounded-full overflow-hidden"
            style={{ background: BG_CHIP }}>
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center text-lg font-light active:opacity-60"
              style={{ color: TEXT }}
            >−</button>
            <span className="min-w-[1.75rem] text-center text-sm font-medium" style={{ color: TEXT }}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(q => q + 1)}
              className="w-10 h-10 flex items-center justify-center text-lg font-light active:opacity-60"
              style={{ color: TEXT }}
            >+</button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!isValid}
            className="ml-auto w-11 h-11 shrink-0 flex items-center justify-center rounded-full transition-all active:scale-[0.93]"
            style={isValid
              ? { background: '#7C3AED', color: '#fff', boxShadow: '0 6px 16px rgba(124,58,237,0.45)' }
              : { background: 'rgba(124,58,237,0.25)', color: 'rgba(255,255,255,0.35)' }
            }
            aria-label="Добавить в рацион"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
