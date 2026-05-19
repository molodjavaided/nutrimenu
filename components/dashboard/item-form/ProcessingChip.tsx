'use client'

import { useState } from 'react'
import { CATEGORY_LABELS, PROCESSING_LABELS, asCategory, getYieldCoef } from '@/lib/cooking-coefficients'
import type { IngredientRef, ProcessingType } from '@/types'

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
    : `${processingIcon(effective)} ${PROCESSING_LABELS[effective]} ×${currentCoef.toFixed(2)}`

  function pick(p: ProcessingType) {
    onChangeProcessing(p)
    onChangeYieldOverride(undefined) // сброс ручного коэффициента
    setExpanded(false)
    setCoefEditing(false)
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Current selection + toggle expand */}
      <button
        type="button"
        onClick={() => setExpanded(o => !o)}
        className="text-xs px-3 py-1.5 rounded-lg transition-all whitespace-nowrap self-start"
        style={{
          background: effective === 'raw' ? 'transparent' : '#FEFEF2',
          border: effective === 'raw' ? '0.5px dashed rgba(176,166,223,0.6)' : '0.5px solid rgba(176,166,223,0.5)',
          color: effective === 'raw' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
        }}
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
                style={{
                  background: isActive ? '#B0A6DF' : '#EAE7F8',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontWeight: isActive ? 500 : 400,
                  border: isActive ? '0.5px solid #8B5CF6' : '0.5px solid transparent',
                }}
              >
                {p === 'raw' ? '🥩' : processingIcon(p)} {PROCESSING_LABELS[p]}
              </button>
            )
          })}
        </div>
      )}

      {/* Manual coefficient — отдельный аккуратный inline-блок, только если выбрана не-сырая обработка */}
      {effective !== 'raw' && (coefEditing || isManual) && (
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
            style={{ fontSize: 16, background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
          />
          <span className="px-1.5 py-0.5 rounded-full" style={isManual ? { background: '#F2D965', color: '#635200' } : { background: '#EAE7F8', color: '#534AB7' }}>
            {isManual ? 'вручную' : 'ГОСТ'}
          </span>
          {isManual && (
            <button
              type="button"
              onClick={() => { onChangeYieldOverride(undefined); setCoefEditing(false) }}
              className="px-1.5 py-0.5 rounded-md"
              style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
              title="Сбросить к ГОСТ"
            >
              ↺
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
          className="text-[11px] self-start"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ✎ изменить коэф. (ГОСТ {gostCoef.toFixed(2)})
        </button>
      )}
    </div>
  )
}

function processingIcon(p: ProcessingType): string {
  switch (p) {
    case 'boil': return '💧'
    case 'fry': return '🔥'
    case 'stew': return '🥘'
    case 'bake': return '🍞'
    case 'steam': return '♨️'
    case 'deep_fry': return '🍤'
    default: return ''
  }
}
