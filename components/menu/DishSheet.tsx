'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet'
import { IngredientRef, MenuItem, ModifierGroup, SelectedModifiers, SelectedVariants, VariantGroup } from '@/types'
import { buildVariantLabel, resolveNutriFromComposition } from '@/lib/utils'
import { getAllergenById } from '@/lib/allergens'
import { initLibraries } from '@/lib/store'
import { systemLibraries } from '@/lib/mock-data'

interface Props {
  item: MenuItem | null
  open: boolean
  onClose: () => void
  onAdd: (item: MenuItem, quantity: number, variants: SelectedVariants, modifiers: SelectedModifiers, label: string) => void
  venueIngredientRefs?: IngredientRef[]
}

const BG = '#1C1726'
const BG_CHIP = 'rgba(255,255,255,0.10)'
const BG_CHIP_ACTIVE = '#7C3AED'
const GLASS_DARK = 'rgba(0,0,0,0.52)'   // контрастное тёмное стекло для оверлея на фото
const TEXT = 'rgba(255,255,255,0.92)'
const TEXT_MUTED = 'rgba(255,255,255,0.45)'
const DIVIDER = 'rgba(255,255,255,0.07)'

function getDefaultModifiers(item: MenuItem): SelectedModifiers {
  const result: SelectedModifiers = {}
  for (const g of item.modifierGroups ?? []) {
    if (!g.multi && g.required && g.modifiers[0]) result[g.id] = g.modifiers[0].id
  }
  return result
}

export default function DishSheet({ item, open, onClose, onAdd, venueIngredientRefs = [] }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [variants, setVariants] = useState<SelectedVariants>({})
  const [modifiers, setModifiers] = useState<SelectedModifiers>({})
  const [lastItemId, setLastItemId] = useState<string | null>(null)
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null)
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

  // Сброс при смене блюда
  if (item && item.id !== lastItemId) {
    setLastItemId(item.id)
    setQuantity(1)
    setVariants({})
    setModifiers(getDefaultModifiers(item))
    setSelectedSizeId(item.sizes?.[0]?.id ?? null)
    setGramAmounts({})
    setCompositionOpen(false)
    setDescriptionOpen(false)
    setActiveGroupId(null)
    setSizePickerOpen(false)
  }

  // ─── КБЖУ ────────────────────────────────────────────────────
  const resolvedNutri = useMemo(() => {
    if (!item) return { calories: 0, protein: 0, fat: 0, carbs: 0, weight: 0, weightUnit: 'г' as const }

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

  if (!item) return null

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
    if (!isValid || !item) return
    onAdd(item, quantity, variants, modifiers, buildVariantLabel(item, variants, modifiers))
  }

  const compRows = activeSize?.composition ?? item.composition ?? []
  const hasComposition = compRows.length > 0
  const hasAllergens = (item.allergens ?? []).length > 0

  type GroupEntry =
    | { id: string; label: string; type: 'variant'; group: VariantGroup }
    | { id: string; label: string; type: 'modifier'; group: ModifierGroup }

  // Все группы вариантов + модификаторов для чип-ряда
  const allGroups: GroupEntry[] = [
    ...(item.variantGroups ?? []).map(g => ({ id: g.id, label: g.label, type: 'variant' as const, group: g })),
    ...(item.modifierGroups ?? []).map(g => ({ id: g.id, label: g.label, type: 'modifier' as const, group: g })),
  ]

  // Чип-лейбл показывает выбранное значение
  function chipLabel(entry: GroupEntry): string {
    if (entry.type === 'variant') {
      const sel = entry.group.options.find((o: { id: string; label: string }) => o.id === variants[entry.group.id])
      return sel ? sel.label : entry.group.label
    } else {
      const g = entry.group
      if (g.multi) {
        const sel = Array.isArray(modifiers[g.id]) ? (modifiers[g.id] as unknown as string[]).length : 0
        return sel > 0 ? `${g.label} (${sel})` : g.label
      }
      const sel = g.modifiers.find(m => m.id === modifiers[g.id])
      return sel ? sel.label : g.label
    }
  }

  function isChipSelected(entry: GroupEntry): boolean {
    if (entry.type === 'variant') return !!variants[entry.group.id]
    const g = entry.group
    if (g.multi) return Array.isArray(modifiers[g.id]) && (modifiers[g.id] as unknown as string[]).length > 0
    return !!modifiers[g.id]
  }

  const displayPrice = activeSize?.price ?? item.price

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="dish-sheet max-w-full mx-auto p-0 flex flex-col overflow-hidden"
        style={{ background: BG, border: 'none', gap: 0 }}
      >
        {/* ── ФОТО + ХЕДЕР-ОВЕРЛЕЙ ────────────────────────────── */}
        <div className="relative w-full shrink-0" style={{ aspectRatio: '4/3' }}>
          {/* Фото */}
          {item.photo
            ? <Image src={item.photo} alt={item.name} fill className="object-cover" sizes="(max-width: 512px) 100vw, 512px" priority />
            : <div className="w-full h-full flex items-center justify-center text-7xl" style={{ background: '#1a1426' }}>🍽️</div>
          }

          {/* Градиент сверху: тёмный → прозрачный (только под текст) */}
          <div
            className="absolute inset-x-0 top-0"
            style={{
              height: '50%',
              background: `linear-gradient(to bottom, ${BG} 0%, ${BG} 10%, rgba(28,23,38,0.82) 40%, transparent 100%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Градиент снизу: прозрачный → тёмный */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: '35%',
              background: `linear-gradient(to top, ${BG} 0%, transparent 100%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Контент хедера поверх градиента */}
          <div className="absolute inset-x-0 top-0 px-5 pt-3 pb-4">
            {/* Drag handle */}
            <div className="flex justify-center mb-3">
              <div className="w-10 h-[5px] rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
            </div>

            {/* Название + крестик */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-[17px] font-semibold leading-snug flex-1" style={{ color: TEXT, fontFamily: 'Stolzl, sans-serif' }}>
                {item.name}
              </h2>
              <SheetClose
                className="w-11 h-11 flex items-center justify-center rounded-full shrink-0 active:opacity-70"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                aria-label="Закрыть"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1 1l9 9M10 1L1 10" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </SheetClose>
            </div>

            {/* КБЖУ + граммовка */}
            <div className="grid grid-cols-5 gap-1 mb-3">
              {/* Граммовка — кликабельна если есть размеры */}
              {item.sizes && item.sizes.length > 1 ? (
                <button
                  onClick={() => setSizePickerOpen(o => !o)}
                  className="text-center active:opacity-70 transition-opacity"
                >
                  <p className="text-[15px] font-semibold" style={{ color: sizePickerOpen ? '#A78BFA' : TEXT }}>
                    {resolvedNutri.weight}{resolvedNutri.weightUnit}
                  </p>
                  <p className="text-[10px] mt-0.5 flex items-center justify-center gap-0.5" style={{ color: TEXT_MUTED }}>
                    объём
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none"
                      style={{ transform: sizePickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M1 2.5l2.5 2.5L6 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </p>
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-[15px] font-semibold" style={{ color: TEXT }}>
                    {resolvedNutri.weight}{resolvedNutri.weightUnit}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: TEXT_MUTED }}>объём</p>
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

            {/* Выбор размера (раскрывается под КБЖУ) */}
            {sizePickerOpen && item.sizes && item.sizes.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {item.sizes.map(size => {
                  const isActive = (selectedSizeId ?? item.sizes![0].id) === size.id
                  return (
                    <button
                      key={size.id}
                      onClick={() => { setSelectedSizeId(size.id); setSizePickerOpen(false) }}
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

            {/* Кнопки: Описание + Состав + аллергены */}
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

            {/* Описание раскрытое */}
            {descriptionOpen && item.description && (
              <p className="mt-2 text-xs leading-relaxed px-3 py-2 rounded-xl"
                style={{ background: GLASS_DARK, backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,0.9)' }}>
                {item.description}
              </p>
            )}

            {/* Состав раскрытый */}
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
              </div>
            )}
          </div>
        </div>

        {/* ── СКРОЛЛИМАЯ ЧАСТЬ: добавки + количество ───────────── */}
        <div className="flex-1 overflow-y-auto" style={{ background: BG }}>

          {/* Горизонтальный ряд чипов: варианты + модификаторы */}
          {allGroups.length > 0 && (
            <div
              className="flex gap-2 overflow-x-auto px-5 py-3"
              style={{ scrollbarWidth: 'none', borderBottom: `0.5px solid ${DIVIDER}` }}
            >
              {/* Группы вариантов/модификаторов */}
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
                      : { background: BG_CHIP, color: 'rgba(255,255,255,0.75)' }
                    }
                  >
                    {!selected && <span className="text-base leading-none" style={{ marginTop: -1 }}>+</span>}
                    {chipLabel(entry)}
                  </button>
                )
              })}
            </div>
          )}

          {/* Раскрытая группа вариантов */}
          {activeGroupId && (() => {
            const entry = allGroups.find(e => e.id === activeGroupId)
            if (!entry) return null

            if (entry.type === 'variant') {
              const group = entry.group as VariantGroup
              return (
                <div className="px-5 py-3" style={{ borderBottom: `0.5px solid ${DIVIDER}` }}>
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
                            : { background: BG_CHIP, color: 'rgba(255,255,255,0.75)' }
                          }
                        >
                          {opt.label}
                          {opt.calories > 0 && (
                            <span className="ml-1 text-xs opacity-60">{getOptionCalories(group, opt)} ккал</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            }

            // Модификатор
            const group = entry.group as ModifierGroup

            if (group.allowCustomGrams) {
              return (
                <div className="px-5 py-3 flex flex-col gap-2" style={{ borderBottom: `0.5px solid ${DIVIDER}` }}>
                  {group.modifiers.map(mod => {
                    const grams = gramAmounts[group.id]?.[mod.id] ?? 0
                    const kcal = grams > 0 ? Math.round(mod.calories * grams / 100) : 0
                    return (
                      <div key={mod.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                        style={{ background: BG_CHIP }}>
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
                        {kcal > 0 && <span className="text-xs font-medium" style={{ color: '#A78BFA' }}>+{kcal}</span>}
                      </div>
                    )
                  })}
                </div>
              )
            }

            return (
              <div className="px-5 py-3" style={{ borderBottom: `0.5px solid ${DIVIDER}` }}>
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
                          : { background: BG_CHIP, color: 'rgba(255,255,255,0.75)' }
                        }
                      >
                        {mod.label}
                        {mod.calories > 0 && group.type !== 'replace' && (
                          <span className="ml-1 text-xs opacity-60">+{mod.calories} ккал</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

        </div>

        {/* ── ФУТЕР ─────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-4 pt-3 flex items-center gap-2"
          style={{
            background: BG,
            paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          }}
        >
          {/* Цена */}
          {displayPrice != null && (
            <span className="text-sm font-semibold shrink-0" style={{ color: TEXT }}>
              {displayPrice} ₽
            </span>
          )}

          {/* Счётчик − n + */}
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

          {/* Кнопка добавить — круглая, прижата вправо */}
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
      </SheetContent>
    </Sheet>
  )
}
