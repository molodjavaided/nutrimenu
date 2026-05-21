'use client'

import { PROCESSING_LABELS, asCategory, getYieldCoef } from '@/lib/cooking-coefficients'
import type { IngredientRef, ProcessingType } from '@/types'

const PROCESSING_OPTIONS: ProcessingType[] = ['raw', 'boil', 'fry', 'stew', 'bake', 'steam', 'deep_fry']

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
}: {
  processing: ProcessingType | undefined
  yieldOverride: number | undefined
  ingredientRef?: IngredientRef
  expanded: boolean
  onToggle: () => void
}) {
  const { effective, currentCoef } = computeCoefs(processing, yieldOverride, ingredientRef)
  const label = effective === 'raw'
    ? '+ обработка'
    : `${PROCESSING_LABELS[effective]} ×${currentCoef.toFixed(2)}`

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="text-xs px-3 py-1.5 rounded-lg transition-all active:scale-[0.97] whitespace-nowrap self-start"
      style={
        effective === 'raw'
          ? {
            background: 'transparent',
            border: '0.5px dashed rgba(139,92,246,0.40)',
            color: 'var(--color-text-secondary)',
          }
          : {
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '0.5px solid rgba(139,92,246,0.30)',
            color: 'var(--color-text-primary)',
            boxShadow: '0 2px 6px rgba(139,92,246,0.10)',
            fontWeight: 500,
          }
      }
    >
      {label}
    </button>
  )
}

// ─── Panel: лента вариантов + поле коэффициента, выезжает снизу ─────────────

export function ProcessingPanel({
  processing,
  yieldOverride,
  ingredientRef,
  onChangeProcessing,
  onChangeYieldOverride,
}: {
  processing: ProcessingType | undefined
  yieldOverride: number | undefined
  ingredientRef?: IngredientRef
  onChangeProcessing: (p: ProcessingType | undefined) => void
  onChangeYieldOverride: (v: number | undefined) => void
}) {
  const { effective, gostCoef, isManual } = computeCoefs(processing, yieldOverride, ingredientRef)

  return (
    <div className="flex flex-col gap-2">
      {/* Лента вариантов — горизонтальный скролл */}
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 py-1" style={{ scrollbarWidth: 'thin' }}>
        {PROCESSING_OPTIONS.map(p => {
          const isActive = p === effective
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChangeProcessing(p)}
              className="text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all active:scale-95"
              style={isActive
                ? {
                  background: '#B0A6DF',
                  color: 'var(--color-text-primary)',
                  fontWeight: 500,
                  border: '0.5px solid rgba(139,92,246,0.6)',
                  boxShadow: '0 2px 6px rgba(176,166,223,0.30)',
                }
                : {
                  background: 'rgba(176,166,223,0.18)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 400,
                  border: '0.5px solid rgba(139,92,246,0.12)',
                }
              }
            >
              {PROCESSING_LABELS[p]}
            </button>
          )
        })}
      </div>

      {/* Коэффициент — всегда доступен для правки, цвет = ГОСТ / вручную */}
      {effective !== 'raw' && (
        <div className="flex items-center gap-2 text-[11px]">
          <span style={{ color: 'var(--color-text-muted)' }}>Коэф.</span>
          <input
            type="number"
            step={0.01}
            min={0}
            value={yieldOverride ?? gostCoef}
            onChange={e => {
              const v = e.target.value === '' ? undefined : parseFloat(e.target.value)
              onChangeYieldOverride(v === undefined || Number.isNaN(v) ? undefined : v)
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
