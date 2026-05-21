'use client'

import { useState } from 'react'
import { CATEGORY_LABELS, PROCESSING_LABELS, asCategory, getYieldCoef } from '@/lib/cooking-coefficients'
import type { IngredientRef, ProcessingType } from '@/types'
import { NutriPill } from '@/components/ui-kit'

const PROCESSING_OPTIONS: ProcessingType[] = ['raw', 'boil', 'fry', 'stew', 'bake', 'steam', 'deep_fry']

interface Props {
  processing: ProcessingType | undefined
  yieldOverride: number | undefined
  ingredientRef?: IngredientRef
  onChangeProcessing: (p: ProcessingType | undefined) => void
  onChangeYieldOverride: (v: number | undefined) => void
}

export default function ProcessingChip({
  processing,
  yieldOverride,
  ingredientRef,
  onChangeProcessing,
  onChangeYieldOverride,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [coefEditing, setCoefEditing] = useState(false)
  const effective = processing ?? 'raw'
  const category = asCategory(ingredientRef?.category)
  const refCoefs = ingredientRef?.yieldCoefficients
  const gostCoef = effective === 'raw' ? 1 : getYieldCoef(effective, undefined, refCoefs, category)
  const currentCoef = effective === 'raw' ? 1 : getYieldCoef(effective, yieldOverride, refCoefs, category)
  const isManual = yieldOverride !== undefined && yieldOverride > 0 && Math.abs(yieldOverride - gostCoef) > 0.001

  const currentLabel = effective === 'raw'
    ? '+ обработка'
    : `${PROCESSING_LABELS[effective]} ×${currentCoef.toFixed(2)}`

  function pick(p: ProcessingType) {
    onChangeProcessing(p) // сброс ручного коэффициента происходит внутри updateIngredientProcessing
    setCoefEditing(false)
    // expanded оставляем открытым: пользователь видит выбранный вариант подсвеченным
    // и может сразу переключиться. Закрытие — повторным тапом по чипу-заголовку.
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Current selection + toggle expand */}
      <button
        type="button"
        onClick={() => setExpanded(o => !o)}
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
        {currentLabel}
      </button>

      {expanded && (
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 py-1" style={{ scrollbarWidth: 'thin' }}>
          {PROCESSING_OPTIONS.map(p => {
            const isActive = p === effective
            return (
              <button
                key={p}
                type="button"
                onClick={() => pick(p)}
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
      )}

      {/* Manual coefficient */}
      {effective !== 'raw' && (coefEditing || isManual) && (
        <div className="flex items-center gap-2 text-[11px] flex-wrap">
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
              background: 'rgba(255,255,255,0.6)',
              border: '0.5px solid rgba(139,92,246,0.25)',
              color: 'var(--color-text-primary)',
            }}
          />
          <NutriPill tone={isManual ? 'warning' : 'neutral'} size="xs">
            {isManual ? 'вручную' : 'ГОСТ'}
          </NutriPill>
          {isManual && (
            <button
              type="button"
              onClick={() => { onChangeYieldOverride(undefined); setCoefEditing(false) }}
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
          <span style={{ color: 'var(--color-text-muted)' }}>
            {category ? CATEGORY_LABELS[category] : 'без категории'}
          </span>
        </div>
      )}
      {effective !== 'raw' && !coefEditing && !isManual && (
        <button
          type="button"
          onClick={() => setCoefEditing(true)}
          className="inline-flex items-center gap-1 text-[11px] self-start transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M7 1.5l1.5 1.5-5 5H2v-1.5l5-5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          изменить коэф. (ГОСТ {gostCoef.toFixed(2)})
        </button>
      )}
    </div>
  )
}
