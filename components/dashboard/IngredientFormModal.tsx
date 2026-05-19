'use client'

import { useState, useCallback } from 'react'
import { IngredientLibrary, IngredientRef, CompositionRow, IngredientCategory } from '@/types'
import { resolveIngredientPer100 } from '@/lib/utils'
import { CATEGORY_LABELS, asCategory } from '@/lib/cooking-coefficients'
import IngredientPickerModal from './IngredientPickerModal'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  /** Existing ingredient being edited — undefined means "create new" */
  editing?: IngredientRef
  /** All user-editable libraries for the picker modal */
  libraries: IngredientLibrary[]
  /** Flat list of all refs across all libs (for composite nutrition resolution) */
  allRefs: IngredientRef[]
  /** ID of the ingredient being edited (prevents self-reference in composite) */
  selfId?: string
  onSave: (ing: IngredientRef) => void
  onClose: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function IngredientFormModal({ editing, libraries, allRefs, selfId, onSave, onClose }: Props) {
  // ── Form state ──
  const [mode, setMode] = useState<'mono' | 'composite'>(editing?.type ?? 'mono')
  const [name, setName] = useState(editing?.name ?? '')
  const [category, setCategory] = useState<IngredientCategory>(asCategory(editing?.category) ?? 'other')
  const [unit, setUnit] = useState<'г' | 'мл' | 'шт'>(editing?.unit ?? 'г')
  const [weightPerUnit, setWeightPerUnit] = useState<number>(editing?.weightPerUnit ?? 0)

  // Mono fields
  const [calories, setCalories] = useState(editing?.caloriesPer100 ?? 0)
  const [protein, setProtein] = useState(editing?.proteinPer100 ?? 0)
  const [fat, setFat] = useState(editing?.fatPer100 ?? 0)
  const [carbs, setCarbs] = useState(editing?.carbsPer100 ?? 0)

  // Composite fields
  const [composition, setComposition] = useState<CompositionRow[]>(editing?.composition ?? [])
  const [instructions, setInstructions] = useState(editing?.instructions ?? '')
  const [compositionText, setCompositionText] = useState(editing?.compositionText ?? '')
  const [pickerOpen, setPickerOpen] = useState(false)

  // ── Live-computed КБЖУ for composite mode ──
  const computedNutri = useCallback((): { cal: number; pro: number; fat: number; car: number; weight: number } => {
    if (!composition.length) return { cal: 0, pro: 0, fat: 0, car: 0, weight: 0 }
    let cal = 0, pro = 0, f = 0, car = 0, totalWeight = 0
    for (const row of composition) {
      if (!row.amount) continue
      const ref = allRefs.find(r => r.id === row.ingredientId)
      if (!ref) continue
      const n = resolveIngredientPer100(ref, allRefs)
      const ratio = row.amount / 100
      cal += n.caloriesPer100 * ratio
      pro += n.proteinPer100  * ratio
      f   += n.fatPer100      * ratio
      car += n.carbsPer100    * ratio
      totalWeight += row.amount
    }
    if (totalWeight === 0) return { cal: 0, pro: 0, fat: 0, car: 0, weight: 0 }
    const norm = 100 / totalWeight
    return {
      cal:    Math.round(cal * norm),
      pro:    Math.round(pro * norm * 10) / 10,
      fat:    Math.round(f   * norm * 10) / 10,
      car:    Math.round(car * norm * 10) / 10,
      weight: Math.round(totalWeight),
    }
  }, [composition, allRefs])

  const nutri = computedNutri()

  // ── Circular dependency check ──
  function wouldCreateCycle(candidateId: string): boolean {
    if (!selfId) return false
    if (candidateId === selfId) return true
    // Walk the candidate's composition transitively
    const visited = new Set<string>()
    function hasSelf(id: string): boolean {
      if (visited.has(id)) return false
      visited.add(id)
      const ref = allRefs.find(r => r.id === id)
      if (!ref?.composition) return false
      for (const row of ref.composition) {
        if (row.ingredientId === selfId) return true
        if (hasSelf(row.ingredientId)) return true
      }
      return false
    }
    return hasSelf(candidateId)
  }

  // ── Composition helpers ──
  function addComponent(ref: IngredientRef) {
    if (wouldCreateCycle(ref.id)) return // silently blocked (button is disabled in picker)
    setComposition(prev => [...prev, { ingredientId: ref.id, amount: 100, unit: ref.unit }])
  }

  function updateAmount(ingredientId: string, amount: number) {
    setComposition(prev => prev.map(r => r.ingredientId === ingredientId ? { ...r, amount } : r))
  }

  function removeComponent(ingredientId: string) {
    setComposition(prev => prev.filter(r => r.ingredientId !== ingredientId))
  }

  // ── Save ──
  function handleSave() {
    if (!name.trim()) return

    const base = {
      id: editing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      unit,
      ...(unit === 'шт' && weightPerUnit > 0 ? { weightPerUnit } : {}),
      category,
      isSystem: false as const,
      type: mode,
      ...(editing?.barcode ? { barcode: editing.barcode } : {}),
      ...(editing?.pricePerKg !== undefined && editing.pricePerKg > 0 ? { pricePerKg: editing.pricePerKg } : {}),
      ...(editing?.coldLossPercent !== undefined ? { coldLossPercent: editing.coldLossPercent } : {}),
      ...(editing?.yieldCoefficients && Object.keys(editing.yieldCoefficients).length > 0 ? { yieldCoefficients: editing.yieldCoefficients } : {}),
    }

    const trimmedComposition = compositionText.trim() || undefined

    if (mode === 'composite') {
      const n = computedNutri()
      onSave({
        ...base,
        caloriesPer100: n.cal,
        proteinPer100:  n.pro,
        fatPer100:      n.fat,
        carbsPer100:    n.car,
        composition,
        compositionText: trimmedComposition,
        instructions: instructions.trim() || undefined,
      })
    } else {
      onSave({
        ...base,
        caloriesPer100: calories,
        proteinPer100:  protein,
        fatPer100:      fat,
        carbsPer100:    carbs,
        compositionText: trimmedComposition,
      })
    }
  }

  // IDs already in composition (prevents duplicates)
  const alreadyAddedIds = [
    ...composition.map(r => r.ingredientId),
    ...(selfId ? [selfId] : []),
  ]

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center"
        style={{ background: 'rgba(44,41,80,0.45)', backdropFilter: 'blur(3px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        {/* Sheet */}
        <div
          className="w-full sm:max-w-lg sm:rounded-2xl flex flex-col overflow-hidden h-[100dvh] sm:h-auto sm:max-h-[92dvh]"
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3"
            style={{ borderBottom: '0.5px solid rgba(176,166,223,0.2)' }}>
            <p className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {editing ? 'Редактировать' : 'Новый ингредиент'}
            </p>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'rgba(176,166,223,0.2)', color: 'var(--color-text-secondary)' }}
            >
              ✕
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

            {/* ── Segmented control ── */}
            <div
              className="flex p-1 rounded-xl"
              style={{ background: 'rgba(176,166,223,0.15)' }}
            >
              {(['mono', 'composite'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: mode === m ? '#fff' : 'transparent',
                    color: mode === m ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    boxShadow: mode === m ? '0 1px 4px rgba(139,92,246,0.12)' : 'none',
                  }}
                >
                  {m === 'composite' && (
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="9" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                      <rect x="1" y="5.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                      <rect x="1" y="1.5" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    </svg>
                  )}
                  {m === 'mono' ? 'Простой' : 'Составной'}
                </button>
              ))}
            </div>

            {/* ── Name + Category + Unit ── */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Название *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={mode === 'composite' ? 'Соус тартар' : 'Молоко классическое'}
                  className="h-11 px-3 rounded-xl text-sm outline-none"
                  style={{ fontSize: 16, background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-[1fr_88px] gap-3">
                {/* Category */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Категория</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as IngredientCategory)}
                    className="h-11 px-2 rounded-xl text-sm outline-none"
                    style={{ fontSize: 16, background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
                  >
                    {(Object.keys(CATEGORY_LABELS) as IngredientCategory[]).map(c => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Единица</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as 'г' | 'мл' | 'шт')}
                    className="h-11 px-2 rounded-xl text-sm outline-none"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="г">г</option>
                    <option value="мл">мл</option>
                    <option value="шт">шт</option>
                  </select>
                </div>
              </div>

              {/* Weight per piece — shown only when unit = шт */}
              {unit === 'шт' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Вес 1 шт (г)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weightPerUnit || ''}
                    onChange={e => setWeightPerUnit(Number(e.target.value))}
                    placeholder="60"
                    className="h-11 px-3 rounded-xl text-sm outline-none"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
                  />
                </div>
              )}
            </div>

            {/* ══ MONO: manual КБЖУ ══ */}
            {mode === 'mono' && (
              <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Ккал / 100 г</label>
                  <input type="number" inputMode="decimal" value={calories || ''} onChange={e => setCalories(Number(e.target.value))}
                    placeholder="0" className="h-11 px-3 rounded-xl text-sm outline-none text-center"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Белки г</label>
                  <input type="number" inputMode="decimal" value={protein || ''} onChange={e => setProtein(Number(e.target.value))}
                    placeholder="0" className="h-11 px-3 rounded-xl text-sm outline-none text-center"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Жиры г</label>
                  <input type="number" inputMode="decimal" value={fat || ''} onChange={e => setFat(Number(e.target.value))}
                    placeholder="0" className="h-11 px-3 rounded-xl text-sm outline-none text-center"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Углеводы г</label>
                  <input type="number" inputMode="decimal" value={carbs || ''} onChange={e => setCarbs(Number(e.target.value))}
                    placeholder="0" className="h-11 px-3 rounded-xl text-sm outline-none text-center"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }} />
                </div>
              </div>

              {/* Состав с упаковки (текст) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Состав</label>
                <textarea
                  value={compositionText}
                  onChange={e => setCompositionText(e.target.value)}
                  placeholder="молоко нормализованное, сахар, закваска..."
                  rows={3}
                  className="px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)', lineHeight: 1.5 }}
                />
              </div>
              </>
            )}

            {/* ══ COMPOSITE: composition builder ══ */}
            {mode === 'composite' && (
              <>
                {/* Live КБЖУ preview */}
                <div
                  className="rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(176,166,223,0.12)', border: '0.5px solid rgba(176,166,223,0.3)' }}
                >
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    КБЖУ на 100 г · {composition.length > 0 ? `итого ~${nutri.weight} г` : 'добавьте компоненты'}
                  </p>
                  <div className="flex gap-4">
                    {[
                      { label: 'Ккал', value: nutri.cal,  color: '#534AB7' },
                      { label: 'Б',    value: nutri.pro,  color: 'var(--color-text-secondary)' },
                      { label: 'Ж',    value: nutri.fat,  color: 'var(--color-text-secondary)' },
                      { label: 'У',    value: nutri.car,  color: 'var(--color-text-secondary)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex flex-col items-center">
                        <span className="text-base font-semibold" style={{ color }}>{value}</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Component list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Состав</p>
                    <button
                      onClick={() => setPickerOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: '#EAE7F8', color: 'var(--color-text-primary)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Добавить компонент
                    </button>
                  </div>

                  {composition.length === 0 && (
                    <div
                      className="rounded-xl px-4 py-6 text-center"
                      style={{ background: 'rgba(176,166,223,0.08)', border: '0.5px dashed rgba(176,166,223,0.4)' }}
                    >
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Нет компонентов</p>
                      <p className="text-xs mt-1" style={{ color: '#C8C3F0' }}>Нажмите «Добавить компонент»</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {composition.map(row => {
                      const ref = allRefs.find(r => r.id === row.ingredientId)
                      if (!ref) return null
                      const isComp = ref.type === 'composite'
                      const n = resolveIngredientPer100(ref, allRefs)
                      const contribution = row.amount
                        ? {
                            cal: Math.round(n.caloriesPer100 * row.amount / 100),
                            pro: Math.round(n.proteinPer100  * row.amount / 100 * 10) / 10,
                          }
                        : null
                      return (
                        <div
                          key={row.ingredientId}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl"
                          style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.25)' }}
                        >
                          {/* Composite badge icon */}
                          {isComp && (
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
                              <rect x="1" y="9" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                              <rect x="1" y="5.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                              <rect x="1" y="1.5" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                            </svg>
                          )}

                          {/* Name + contribution preview */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{ref.name}</p>
                            {contribution && (
                              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {contribution.cal} ккал · Б {contribution.pro}г
                              </p>
                            )}
                          </div>

                          {/* Amount input */}
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={row.amount || ''}
                              onChange={e => updateAmount(row.ingredientId, Number(e.target.value))}
                              className="w-20 h-10 px-2 rounded-lg text-sm text-center outline-none"
                              style={{ background: 'rgba(176,166,223,0.15)', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                            />
                            <span className="text-xs w-4" style={{ color: 'var(--color-text-muted)' }}>{row.unit}</span>
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => removeComponent(row.ingredientId)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(226,75,74,0.08)', color: '#E24B4A' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                              <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"
                                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Instructions */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Технология приготовления</label>
                  <textarea
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="Опишите шаги приготовления..."
                    rows={3}
                    className="px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)', lineHeight: 1.5 }}
                  />
                </div>
              </>
            )}

          </div>

          {/* ── Footer ── */}
          <div
            className="flex gap-2 px-5 py-4"
            style={{ borderTop: '0.5px solid rgba(176,166,223,0.2)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || (mode === 'composite' && composition.length === 0)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{
                background: name.trim() && (mode !== 'composite' || composition.length > 0)
                  ? '#B0A6DF' : '#C8C3F0',
                color: 'var(--color-text-primary)',
              }}
            >
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </div>

      {/* Ingredient picker for composition */}
      {pickerOpen && (
        <IngredientPickerModal
          libraries={libraries}
          alreadyAddedIds={alreadyAddedIds}
          allRefs={allRefs}
          onSelect={ref => addComponent(ref)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
