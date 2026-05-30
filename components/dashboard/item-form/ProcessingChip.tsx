'use client'

import { useEffect, useState } from 'react'
import { PROCESSING_LABELS, asCategory, getYieldCoef } from '@/lib/cooking-coefficients'
import type { IngredientCategory, IngredientRef, ProcessingType } from '@/types'

function computeCoefs(processing: ProcessingType | undefined, yieldOverride: number | undefined, ingredientRef?: IngredientRef) {
  const effective = processing ?? 'raw'
  const category = asCategory(ingredientRef?.category)
  const refCoefs = ingredientRef?.yieldCoefficients
  const gostCoef = effective === 'raw' ? 1 : getYieldCoef(effective, undefined, refCoefs, category)
  const currentCoef = effective === 'raw' ? 1 : getYieldCoef(effective, yieldOverride, refCoefs, category)
  const isManual = yieldOverride !== undefined && yieldOverride > 0 && Math.abs(yieldOverride - gostCoef) > 0.001
  return { effective, gostCoef, currentCoef, isManual }
}

// ─── Anchor: top-row toggle, остаётся «как вкопанный» ───────────────────────

export function ProcessingAnchor({
  processing,
  yieldOverride,
  ingredientRef,
  expanded,
  onToggle,
  dataTour,
}: {
  processing: ProcessingType | undefined
  yieldOverride: number | undefined
  ingredientRef?: IngredientRef
  expanded: boolean
  onToggle: () => void
  dataTour?: string
}) {
  const { effective, currentCoef } = computeCoefs(processing, yieldOverride, ingredientRef)
  const isRaw = effective === 'raw'
  const label = isRaw ? 'Обработка' : `${PROCESSING_LABELS[effective]} ×${currentCoef.toFixed(2)}`

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      data-tour={dataTour}
      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all active:scale-[0.97] whitespace-nowrap self-start"
      style={
        isRaw
          ? { background: 'rgba(139,92,246,0.06)', border: '0.5px solid rgba(139,92,246,0.18)', color: 'var(--color-text-muted)' }
          : { background: 'rgba(176,166,223,0.22)', border: '0.5px solid rgba(139,92,246,0.35)', color: 'var(--color-text-primary)', fontWeight: 500 }
      }
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        {/* пламя */}
        <path d="M6 1.5c1.2 1.6.4 2.6-.2 3.4-.5.7-.3 1.6.5 2 .8-.3 1.2-1 1.2-1 .7 1.2.2 3.1-1.5 3.6C4 10.6 2.5 9.2 2.5 7.3c0-2 1.9-3 2.4-4.4.2-.5.7-.9 1.1-1.4z"
          stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      {label}
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden
        style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
        <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

// ─── Panel: релевантные по категории чипы одним рядом, выезжает снизу ───────

const KITCHEN: ProcessingType[] = ['boil', 'fry', 'stew', 'bake', 'steam', 'deep_fry']
const COFFEE: ProcessingType[] = ['steam_foam']
const BAR: ProcessingType[] = ['shake_ice', 'stir_ice']
const ALL_PROCESSINGS: ProcessingType[] = [...KITCHEN, ...COFFEE, ...BAR]

/** Показываем только обработки, осмысленные для категории ингредиента — меньше шума.
 *  Полный набор доступен по «Ещё…». */
function relevantProcessings(category: IngredientCategory | undefined): ProcessingType[] {
  switch (category) {
    case 'dairy': return [...KITCHEN, ...COFFEE] // молоко вспенивают, сыр жарят/запекают
    case 'liquid': return ['boil', ...BAR]
    case 'fruit': return ['boil', 'bake', ...BAR]
    default: return KITCHEN
  }
}

export function ProcessingPanel({
  processing,
  yieldOverride,
  ingredientRef,
  onChangeProcessing,
  onChangeYieldOverride,
  refId,
}: {
  processing: ProcessingType | undefined
  yieldOverride: number | undefined
  ingredientRef?: IngredientRef
  onChangeProcessing: (p: ProcessingType | undefined) => void
  onChangeYieldOverride: (v: number | undefined) => void
  refId?: string
}) {
  const { effective, gostCoef, isManual } = computeCoefs(processing, yieldOverride, ingredientRef)
  const category = asCategory(ingredientRef?.category)
  const [showAll, setShowAll] = useState(false)

  const base = showAll ? ALL_PROCESSINGS : relevantProcessings(category)
  // текущая выбранная обработка всегда видна, даже если не в релевантном наборе
  const options = effective !== 'raw' && !base.includes(effective) ? [effective, ...base] : base

  const chipStyle = (active: boolean): React.CSSProperties => active
    ? { background: '#B0A6DF', color: 'var(--color-text-primary)', fontWeight: 500, border: '0.5px solid rgba(139,92,246,0.55)', boxShadow: 'var(--shadow-soft-xs)' }
    : { background: 'var(--surface-2)', color: 'var(--color-text-secondary)', fontWeight: 400, border: '0.5px solid rgba(139,92,246,0.15)' }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChangeProcessing(undefined)}
          className="text-xs px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
          style={chipStyle(effective === 'raw')}
        >
          Без обработки
        </button>
        {options.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onChangeProcessing(p)}
            data-tour={refId && (p === 'boil' || p === 'fry') ? `${p}-${refId}` : undefined}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
            style={chipStyle(p === effective)}
          >
            {PROCESSING_LABELS[p]}
          </button>
        ))}
        {!showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)', background: 'transparent' }}
          >
            Ещё…
          </button>
        )}
      </div>

      {/* Коэффициент выхода — только для приготовленных, цвет = ГОСТ / вручную */}
      {effective !== 'raw' && (
        <div className="flex items-center gap-2 text-[11px]">
          <span style={{ color: 'var(--color-text-muted)' }}>Коэффициент выхода</span>
          <CoefInput
            yieldOverride={yieldOverride}
            gostCoef={gostCoef}
            isManual={isManual}
            onChange={onChangeYieldOverride}
          />
          {isManual && (
            <button
              type="button"
              onClick={() => onChangeYieldOverride(undefined)}
              className="px-1.5 py-0.5 rounded-md transition-colors active:scale-95"
              style={{ background: 'rgba(139,92,246,0.10)', color: 'var(--color-text-secondary)' }}
              title="Сбросить к ГОСТ"
              aria-label="Сбросить к ГОСТ"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5a3.5 3.5 0 1 0 1-2.5L1.5 4M1.5 1.5v2.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Editable coefficient field ────────────────────────────────────────────
// Локальный текст, чтобы поле можно было свободно очистить и набрать своё
// (управляемый number-input снапается к gostCoef и не даёт стереть «1»).
// С внешним значением синхронизируемся только когда поле не в фокусе.
function CoefInput({
  yieldOverride,
  gostCoef,
  isManual,
  onChange,
}: {
  yieldOverride: number | undefined
  gostCoef: number
  isManual: boolean
  onChange: (v: number | undefined) => void
}) {
  const [text, setText] = useState(() => String(yieldOverride ?? gostCoef))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(String(yieldOverride ?? gostCoef))
  }, [yieldOverride, gostCoef, focused])

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={e => {
        const raw = e.target.value
        setText(raw)
        const v = parseFloat(raw.replace(',', '.'))
        if (raw.trim() === '' || Number.isNaN(v)) onChange(undefined)
        else onChange(v)
      }}
      onBlur={() => {
        setFocused(false)
        const v = parseFloat(text.replace(',', '.'))
        if (text.trim() === '' || Number.isNaN(v)) {
          onChange(undefined)
          setText(String(gostCoef))
        } else {
          setText(String(v))
        }
      }}
      className="w-16 h-8 px-2 rounded-md outline-none text-center"
      style={{
        fontSize: 16,
        background: isManual ? 'rgba(242,217,101,0.18)' : 'rgba(255,255,255,0.6)',
        border: isManual
          ? '0.5px solid rgba(242,217,101,0.65)'
          : '0.5px solid rgba(139,92,246,0.25)',
        color: 'var(--color-text-primary)',
      }}
    />
  )
}
