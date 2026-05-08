'use client'

import { useEffect, useState, useMemo } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { IngredientRef, MenuItem, ModifierGroup, SelectedModifiers, SelectedVariants } from '@/types'
import { buildVariantLabel, resolveNutri, resolveNutriFromComposition } from '@/lib/utils'
import { getAllIngredients, initLibraries } from '@/lib/store'
import { systemLibraries } from '@/lib/mock-data'
import { QuantityControl } from '@/components/ui/QuantityControl'

interface Props {
  item: MenuItem | null
  open: boolean
  onClose: () => void
  onAdd: (item: MenuItem, quantity: number, variants: SelectedVariants, modifiers: SelectedModifiers, label: string) => void
}

function getDefaultVariants(item: MenuItem): SelectedVariants {
  const result: SelectedVariants = {}
  // for (const g of item.variantGroups ?? []) {
  //   if (g.options[0]) result[g.id] = g.options[0].id
  // }
  return result
}

function getDefaultModifiers(item: MenuItem): SelectedModifiers {
  const result: SelectedModifiers = {}
  // Только обязательные добавки/замены
  for (const g of item.modifierGroups ?? []) {
    if (!g.multi && g.required && g.modifiers[0]) {
      result[g.id] = g.modifiers[0].id
    }
  }
  return result
}

export default function DishSheet({ item, open, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [variants, setVariants] = useState<SelectedVariants>({})
  const [modifiers, setModifiers] = useState<SelectedModifiers>({})
  const [lastItemId, setLastItemId] = useState<string | null>(null)
  const [ingredientRefs, setIngredientRefs] = useState<IngredientRef[]>([])
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null)

  useEffect(() => {
    const libs = initLibraries(systemLibraries)
    setIngredientRefs(libs.flatMap(l => l.ingredients))
  }, [])

  // Сброс при смене блюда
  if (item && item.id !== lastItemId) {
    setLastItemId(item.id)
    setQuantity(1)
    setVariants(getDefaultVariants(item))
    setModifiers(getDefaultModifiers(item))
    setSelectedSizeId(item.sizes?.[0]?.id ?? null)
  }

  // ─── РАСЧЁТ КБЖУ С УЧЁТОМ ВАРИАНТОВ ──────────────────────
  const resolvedNutri = useMemo(() => {
  if (!item) return { calories: 0, protein: 0, fat: 0, carbs: 0, weight: 0, weightUnit: 'г' as const }

  // Если у блюда несколько sizes — берём КБЖУ выбранного размера как базу
  const activeSize = item.sizes && item.sizes.length > 0
    ? (item.sizes.find(s => s.id === selectedSizeId) ?? item.sizes[0])
    : null

  let total = {
    calories: activeSize?.calories ?? item.calories,
    protein: activeSize?.protein ?? item.protein,
    fat: activeSize?.fat ?? item.fat,
    carbs: activeSize?.carbs ?? item.carbs,
  }

  // Добавляем КБЖУ выбранных вариантов
  for (const group of item.variantGroups ?? []) {
    const selectedId = variants[group.id]
    const option = group.options.find(o => o.id === selectedId)
    if (!option) continue

    if (group.replacesIngredientRefId) {
      // Группа заменяет конкретный ингредиент в составе.
      // Берём количество заменяемого ингредиента из ТЕКУЩЕГО размера (не фиксированное).
      const composition = activeSize?.composition ?? []
      const originalRow = composition.find(c => c.ingredientId === group.replacesIngredientRefId)
      const originalRef = ingredientRefs.find(r => r.id === group.replacesIngredientRefId)
      // Справочник замены — для пересчёта под текущий объём
      const replacementRef = option.ingredientRefId
        ? ingredientRefs.find(r => r.id === option.ingredientRefId)
        : undefined

      if (originalRow && originalRow.amount > 0 && originalRef) {
        const ratio = originalRow.amount / 100  // количество в текущем размере
        const origCal  = Math.round(originalRef.caloriesPer100 * ratio)
        const origProt = Math.round(originalRef.proteinPer100  * ratio * 10) / 10
        const origFat  = Math.round(originalRef.fatPer100      * ratio * 10) / 10
        const origCarb = Math.round(originalRef.carbsPer100    * ratio * 10) / 10

        // Если знаем справочник замены — пересчитываем для текущего объёма
        const replCal  = replacementRef ? Math.round(replacementRef.caloriesPer100 * ratio) : option.calories
        const replProt = replacementRef ? Math.round(replacementRef.proteinPer100  * ratio * 10) / 10 : option.protein
        const replFat  = replacementRef ? Math.round(replacementRef.fatPer100      * ratio * 10) / 10 : option.fat
        const replCarb = replacementRef ? Math.round(replacementRef.carbsPer100    * ratio * 10) / 10 : option.carbs

        total.calories += replCal  - origCal
        total.protein  += replProt - origProt
        total.fat      += replFat  - origFat
        total.carbs    += replCarb - origCarb
      } else {
        // Нет данных по составу — добавляем как дельту (лучше чем ничего)
        total.calories += option.calories
        total.protein  += option.protein
        total.fat      += option.fat
        total.carbs    += option.carbs
      }
    } else if (option.calories > 0) {
      // Обычный вариант (объём, тип): полностью заменяет базовые КБЖУ
      total.calories = option.calories
      total.protein  = option.protein
      total.fat      = option.fat
      total.carbs    = option.carbs
    }
  }

    // Добавляем КБЖУ выбранных добавок/замен
    for (const group of item.modifierGroups ?? []) {
      if (group.type === 'replace') {
        // Замена через состав (ingredientRef-based)
        const activeSize = item.sizes?.find(s => s.id === selectedSizeId) ?? item.sizes?.[0]
        if (activeSize?.composition) {
          const replacedNutri = resolveNutriFromComposition(
            activeSize.composition,
            ingredientRefs,
            item.modifierGroups ?? [],
            modifiers
          )
          total.calories = replacedNutri.calories
          total.protein = replacedNutri.protein
          total.fat = replacedNutri.fat
          total.carbs = replacedNutri.carbs
        }
        continue
      }

      if (group.multi) {
        // Мультиселект — суммируем добавки
        const selected = modifiers[group.id]
        if (!Array.isArray(selected)) continue
        for (const id of selected) {
          const modifier = group.modifiers.find(m => m.id === id)
          if (modifier) {
            total.calories += modifier.calories
            total.protein  += modifier.protein
            total.fat      += modifier.fat
            total.carbs    += modifier.carbs
          }
        }
        continue
      }

      // Одиночная группа
      const selectedId = modifiers[group.id]
      if (!selectedId || typeof selectedId !== 'string') continue
      const modifier = group.modifiers.find(m => m.id === selectedId)
      if (!modifier) continue

      if (group.required) {
        // Обязательная = замена ингредиента: дельта от первого (эталонного) варианта
        const defaultMod = group.modifiers[0]
        total.calories += modifier.calories - defaultMod.calories
        total.protein  += modifier.protein  - defaultMod.protein
        total.fat      += modifier.fat      - defaultMod.fat
        total.carbs    += modifier.carbs    - defaultMod.carbs
      } else {
        // Необязательная = обычная добавка
        total.calories += modifier.calories
        total.protein  += modifier.protein
        total.fat      += modifier.fat
        total.carbs    += modifier.carbs
      }
    }

    // Умножаем на количество
    return {
    calories: total.calories * quantity,
    protein: Math.round((total.protein * quantity) * 10) / 10,
    fat: Math.round((total.fat * quantity) * 10) / 10,
    carbs: Math.round((total.carbs * quantity) * 10) / 10,
    weight: activeSize?.weight ?? item.weight,
    weightUnit: (activeSize?.weightUnit ?? item.weightUnit) as 'г' | 'мл',
  }
}, [item, variants, modifiers, quantity, ingredientRefs, selectedSizeId])

  function handleClose() {
    onClose()
  }

  if (!item) return null

  // Активный размер — нужен и в расчёте, и в отображении кнопок
  const activeSize = item.sizes && item.sizes.length > 0
    ? (item.sizes.find(s => s.id === selectedSizeId) ?? item.sizes[0])
    : null

  // Динамические ккал опции с учётом текущего размера
  function getOptionCalories(
    group: { replacesIngredientRefId?: string },
    opt: { ingredientRefId?: string; calories: number }
  ): number {
    if (!group.replacesIngredientRefId) return opt.calories
    const composition = activeSize?.composition ?? []
    const originalRow = composition.find(c => c.ingredientId === group.replacesIngredientRefId)
    if (!originalRow || !originalRow.amount) return opt.calories
    const replacementRef = opt.ingredientRefId
      ? ingredientRefs.find(r => r.id === opt.ingredientRefId)
      : undefined
    if (!replacementRef) return opt.calories
    return Math.round(replacementRef.caloriesPer100 * originalRow.amount / 100)
  }

  const isValid = (item.variantGroups ?? [])
  .filter(g => g.required)
  .every(g => variants[g.id])

  function handleAdd() {
    if (!isValid || !item) return
    const label = buildVariantLabel(item, variants, modifiers)
    onAdd(item, quantity, variants, modifiers, label)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-5 pt-3 max-w-lg mx-auto overflow-y-auto bg-background"
        style={{
          border: 'none',
          maxHeight: '90vh',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          boxShadow: '0 -8px 40px rgba(139,92,246,0.12), 0 1px 0 rgba(255,255,255,0.9) inset',
        }}
      >
        {/* Handle */}
        <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(139,92,246,0.25)' }} />

        {/* Фото */}
        <div
          className="w-full h-48 rounded-2xl flex items-center justify-center text-6xl mb-5 overflow-hidden"
          style={{
            background: 'rgba(139,92,246,0.06)',
            border: '0.5px solid rgba(255,255,255,0.5)',
          }}
        >
          {item.photo
            ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
            : '🍽️'
          }
        </div>

        {/* Название */}
        <h2 className="text-lg font-medium mb-1 text-text-primary">{item.name}</h2>
        {item.description && (
          <p className="text-sm mb-3 leading-relaxed text-text-secondary">{item.description}</p>
        )}

        {/* Состав */}
        {(item.composition ?? []).length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium mb-2 tracking-wide" style={{ color: '#9D99B8' }}>СОСТАВ</p>
            <div className="flex flex-wrap gap-1.5">
              {(item.composition ?? []).map((row, i) => {
                const ref = ingredientRefs.find(r => r.id === row.ingredientId)
                const name = ref?.name ?? null
                if (!name) return null
                return (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.5)',
                      border: '0.5px solid rgba(176,166,223,0.3)',
                      color: '#6B6490',
                    }}
                  >
                    {name}
                    {row.amount > 0 && (
                      <span style={{ color: '#9D99B8' }}>&thinsp;{row.amount}{row.unit}</span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* КБЖУ плитки */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { val: Math.round(resolvedNutri.calories), label: 'ккал', accent: true },
            { val: `${Math.round(resolvedNutri.protein)}г`, label: 'белки', accent: false },
            { val: `${Math.round(resolvedNutri.fat)}г`, label: 'жиры', accent: false },
            { val: `${Math.round(resolvedNutri.carbs)}г`, label: 'углеводы', accent: false },
          ].map(({ val, label, accent }) => (
            <div
              key={label}
              className="rounded-xl p-2 text-center"
              style={{
                background: accent ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.5)',
                border: '0.5px solid rgba(255,255,255,0.5)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: accent ? '#7C3AED' : '#2C2950' }}>{val}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9D99B8' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Выбор размера (из sizes) */}
        {item.sizes && item.sizes.length > 1 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 text-text-primary">Объём</p>
            <div className="flex flex-wrap gap-2">
              {item.sizes.map(size => {
                const isActive = (selectedSizeId ?? item.sizes![0].id) === size.id
                const label = size.name || `${size.weight} ${size.weightUnit}`
                return (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSizeId(size.id)}
                    className="px-4 rounded-full text-sm transition-all min-h-[44px] active:opacity-70"
                    style={
                      isActive
                        ? { background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }
                        : { background: 'rgba(255,255,255,0.55)', color: '#6B6490', border: '0.5px solid rgba(255,255,255,0.5)' }
                    }
                  >
                    {label}
                    <span className={`ml-1.5 text-xs ${isActive ? 'text-lavender-dark' : 'text-text-muted'}`}>
                      {size.calories} ккал
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Группы вариантов */}
        {item.variantGroups?.map(group => (
          <div key={group.id} className="mb-4">
            <p className="text-sm font-medium mb-2 text-text-primary">
              {group.label}
              {!group.required && <span className="text-xs ml-1 text-text-muted">(необязательно)</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setVariants(prev => {
                    if (!group.required && prev[group.id] === opt.id) {
                      const next = { ...prev }
                      delete next[group.id]
                      return next
                    }
                    return { ...prev, [group.id]: opt.id }
                  })}
                  className="px-4 rounded-full text-sm transition-all min-h-[44px] active:opacity-70"
                  style={
                    variants[group.id] === opt.id
                      ? { background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }
                      : { background: 'rgba(255,255,255,0.55)', color: '#6B6490', border: '0.5px solid rgba(255,255,255,0.5)' }
                  }
                >
                  {opt.label} — {getOptionCalories(group, opt)} ккал
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Группы добавок */}
        {(item.modifierGroups ?? []).map(group => (
          <ModifierGroupSection
            key={group.id}
            group={group}
            selected={modifiers[group.id]}
            onSelect={(modId, subId) => {
              if (group.multi) {
                setModifiers(m => {
                  const cur = Array.isArray(m[group.id]) ? m[group.id] as unknown as string[] : []
                  const next = cur.includes(modId)
                    ? cur.filter(x => x !== modId)
                    : [...cur, modId]
                  return { ...m, [group.id]: next as unknown as string }
                })
              } else {
                setModifiers(m => ({ ...m, [group.id]: subId ?? modId }))
              }
            }}
          />
        ))}

        {/* Количество */}
        <div className="flex items-center gap-3 mb-5 mt-2">
          <QuantityControl
            quantity={quantity}
            onAdd={() => setQuantity(q => q + 1)}
            onRemove={() => setQuantity(q => Math.max(1, q - 1))}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              {quantity > 1 ? `${quantity} × ` : ''}{resolvedNutri.weight} {resolvedNutri.weightUnit}
            </span>
            {item.price != null && (
              <span className="text-sm font-semibold" style={{ color: '#2C2950' }}>
                {item.price} ₽
              </span>
            )}
          </div>
        </div>

        {/* Кнопка */}
        <button
          onClick={handleAdd}
          disabled={!isValid}
          className="w-full py-4 rounded-xl text-base font-medium transition-all active:scale-[0.98]"
          style={
            isValid
              ? { background: '#8B5CF6', color: '#fff', boxShadow: '0 8px 24px rgba(139,92,246,0.35)' }
              : { background: 'rgba(139,92,246,0.08)', color: '#9D99B8' }
          }
        >
          {isValid ? 'Добавить в рацион' : 'Выберите параметры'}
        </button>
      </SheetContent>
    </Sheet>
  )
}

// Секция добавок
function ModifierGroupSection({ group, selected, onSelect }: {
  group: ModifierGroup
  selected: string | string[] | true | number | undefined
  onSelect: (modId: string, portionCount?: number) => void
}) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium mb-2 text-text-primary">
        {group.label}
        {!group.required && <span className="text-xs font-normal ml-1 text-text-muted">необязательно</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {group.modifiers.map(mod => {
          const isSelected = Array.isArray(selected)
            ? selected.includes(mod.id)
            : typeof selected === 'number'
              ? selected > 0 && group.modifiers.length === 1
              : selected === mod.id

          const portionCount = mod.allowPortions && typeof selected === 'number' ? selected : 1

          if (mod.allowPortions) {
            return (
              <div key={mod.id} className="flex items-center gap-1 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.55)', border: '0.5px solid rgba(176,166,223,0.4)' }}>
                {portionCount > 0 ? (
                  <>
                    <button
                      onClick={() => onSelect(mod.id, Math.max(0, portionCount - 1))}
                      className="w-8 h-8 flex items-center justify-center text-lg font-light transition-colors text-lavender-dark">
                      −
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm font-medium text-text-primary">
                      {portionCount}
                    </span>
                    <button
                      onClick={() => onSelect(mod.id, Math.min(portionCount + 1, mod.maxPortions ?? 10))}
                      className="w-8 h-8 flex items-center justify-center text-lg font-light transition-colors text-lavender-dark">
                      +
                    </button>
                    <span className="pr-3 text-xs text-text-secondary">
                      {mod.label}
                      {mod.calories > 0 && (
                        <span className="ml-1 text-lavender-dark">+{mod.calories * portionCount} ккал</span>
                      )}
                    </span>
                  </>
                ) : (
                  <button
                    onClick={() => onSelect(mod.id, 1)}
                    className="px-3 py-1.5 text-sm text-text-secondary">
                    {mod.label}
                    {mod.calories > 0 && (
                      <span className="ml-1 text-xs text-text-muted">+{mod.calories} ккал</span>
                    )}
                  </button>
                )}
              </div>
            )
          }

          return (
            <button
              key={mod.id}
              onClick={() => onSelect(mod.id)}
              className="px-4 rounded-full text-sm transition-all min-h-[44px] active:opacity-70"
              style={
                isSelected
                  ? { background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }
                  : { background: 'rgba(255,255,255,0.55)', color: '#6B6490', border: '0.5px solid rgba(255,255,255,0.5)' }
              }
            >
              {mod.label}
              {mod.calories > 0 && group.type !== 'replace' && (
                <span className={`ml-1 text-xs ${isSelected ? 'text-lavender-dark' : 'text-text-muted'}`}>
                  +{mod.calories} ккал
                </span>
              )}
              {group.type === 'replace' && mod.calories > 0 && (
                <span className={`ml-1 text-xs ${isSelected ? 'text-lavender-dark' : 'text-text-muted'}`}>
                  {mod.calories} ккал/100{mod.weightUnit}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}