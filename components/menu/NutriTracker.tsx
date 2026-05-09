'use client'

import { useState } from 'react'
import { NutriTotal, TrackerItem } from '@/types'

interface Props {
  items: TrackerItem[]
  nutri: NutriTotal
  onRemove: (key: string) => void
}

export default function NutriTracker({ items, nutri, onRemove }: Props) {
  const [expanded, setExpanded] = useState(true)
  const dailyNorm = 2000
  const percent = Math.min(100, Math.round((nutri.calories / dailyNorm) * 100))

  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '0.5px solid rgba(255,255,255,0.6)',
        boxShadow: '0 8px 32px rgba(139,92,246,0.12), 0 1px 0 rgba(255,255,255,0.8) inset',
      }}
    >
      {/* Заголовок */}
      <div
        className="flex justify-between items-center mb-2 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-sm font-medium" style={{ color: '#7C3AED' }}>Мой рацион</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {Math.round(nutri.calories)} ккал
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Прогресс бар */}
      <div className="h-1.5 rounded-full mb-2" style={{ background: 'rgba(139,92,246,0.1)' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${percent}%`, background: '#8B5CF6' }}
        />
      </div>

      {/* БЖУ */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { val: Math.round(nutri.protein), label: 'белки', unit: 'г' },
          { val: Math.round(nutri.fat), label: 'жиры', unit: 'г' },
          { val: Math.round(nutri.carbs), label: 'углеводы', unit: 'г' },
          { val: percent, label: 'нормы', unit: '%' },
        ].map(({ val, label, unit }) => (
          <div key={label}>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{val}{unit}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Список блюд */}
      {expanded && (
        <div className="mt-3 pt-2" style={{ borderTop: '0.5px solid rgba(139,92,246,0.12)' }}>
          {items.map((trackerItem) => {
            const { menuItem, quantity, variantLabel, resolvedCalories } = trackerItem
            const key = `${menuItem.id}-${variantLabel ?? ''}`
            const totalKcal = Math.round(resolvedCalories * quantity)
            const fullName = variantLabel ? `${menuItem.name} · ${variantLabel}` : menuItem.name

            return (
              <div key={key} className="flex items-center justify-between py-1.5">
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {fullName}
                  {quantity > 1 && (
                    <span className="ml-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      ×{quantity}
                    </span>
                  )}
                </span>
                <span className="text-xs font-medium mx-2 flex-shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                  {totalKcal} ккал
                </span>
                <button
                  onClick={() => onRemove(key)}
                  className="text-xs w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.08)', color: 'var(--color-text-muted)' }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
