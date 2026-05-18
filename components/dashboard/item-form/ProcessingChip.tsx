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

export default function ProcessingChip({ processing, yieldOverride, ingredientRef, onChangeProcessing, onChangeYieldOverride }: Props) {
  const [open, setOpen] = useState(false)
  const effective = processing ?? 'raw'
  const category = asCategory(ingredientRef?.category)
  const refCoefs = ingredientRef?.yieldCoefficients
  const gostCoef = effective === 'raw' ? 1 : getYieldCoef(effective, undefined, refCoefs, category)
  const currentCoef = effective === 'raw' ? 1 : getYieldCoef(effective, yieldOverride, refCoefs, category)
  const isManual = yieldOverride !== undefined && yieldOverride > 0 && Math.abs(yieldOverride - gostCoef) > 0.001

  const chipLabel = effective === 'raw'
    ? '+ обработка'
    : `${processingIcon(effective)} ${PROCESSING_LABELS[effective]} ×${currentCoef.toFixed(2)}`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
        style={{
          background: effective === 'raw' ? 'transparent' : '#FEFEF2',
          border: effective === 'raw' ? '0.5px dashed rgba(176,166,223,0.6)' : '0.5px solid rgba(176,166,223,0.5)',
          color: effective === 'raw' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
        }}
        title="Обработка ингредиента"
      >
        {chipLabel}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-20 w-72 p-3 rounded-xl space-y-3 shadow-lg"
            style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.5)' }}
          >
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Способ обработки</label>
              <select
                value={effective}
                onChange={e => onChangeProcessing(e.target.value as ProcessingType)}
                className="w-full h-9 px-2 rounded-lg text-sm outline-none"
                style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
              >
                {PROCESSING_OPTIONS.map(p => (
                  <option key={p} value={p}>{PROCESSING_LABELS[p]}</option>
                ))}
              </select>
            </div>

            {effective !== 'raw' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Коэффициент выхода
                  </label>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={
                      isManual
                        ? { background: '#F2D965', color: '#635200' }
                        : { background: '#EAE7F8', color: '#534AB7' }
                    }
                  >
                    {isManual ? 'вручную' : 'ГОСТ'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    value={yieldOverride ?? gostCoef}
                    onChange={e => {
                      const v = e.target.value === '' ? undefined : parseFloat(e.target.value)
                      onChangeYieldOverride(v === undefined || Number.isNaN(v) ? undefined : v)
                    }}
                    className="flex-1 h-9 px-2 rounded-lg text-sm outline-none"
                    style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
                  />
                  {isManual && (
                    <button
                      type="button"
                      onClick={() => onChangeYieldOverride(undefined)}
                      className="text-xs px-2 py-1.5 rounded-lg"
                      style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
                      title="Сбросить к ГОСТ"
                    >
                      ↺
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {category
                    ? <>ГОСТ {gostCoef.toFixed(2)} · {CATEGORY_LABELS[category]}</>
                    : <>Категория не задана — дефолт {gostCoef.toFixed(2)}. {hasCategoryHint(refCoefs) ? '' : 'Укажите категорию в справочнике для точности.'}</>
                  }
                </p>
              </div>
            )}
          </div>
        </>
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

function hasCategoryHint(refCoefs: { boil?: number; fry?: number; stew?: number; bake?: number; steam?: number; deep_fry?: number } | undefined): boolean {
  if (!refCoefs) return false
  return Object.values(refCoefs).some(v => v && v > 0)
}

