import { AlertTriangle, Check } from 'lucide-react'
import { type ParsedDish, dishKey } from '@/lib/importer'
import GlassCheckbox from '@/components/ui/GlassCheckbox'
import AiCorrectionsBlock from './AiCorrectionsBlock'
import { pluralBlud } from './utils'

interface Props {
  dishes: ParsedDish[]
  conflicts: Set<string>
  resolutions: Map<string, 'skip' | 'overwrite'>
  selectedIds: Set<string>
  aiCorrections: string[]
  onToggle: (key: string, val: 'skip' | 'overwrite') => void
  onSelectToggle: (id: string) => void
  onSelectAll: (visibleIds: string[]) => void
}

export default function PreviewStep({
  dishes, conflicts, resolutions, selectedIds, aiCorrections,
  onToggle, onSelectToggle, onSelectAll,
}: Props) {
  const conflictCount = conflicts.size

  const seenKeys = new Set<string>()
  const uniqueDishes = dishes.filter(d => {
    if (seenKeys.has(d.id)) return false
    seenKeys.add(d.id)
    return true
  })

  const visibleIds = uniqueDishes.map(d => d.id)
  const allSelected = visibleIds.length > 0 && selectedIds.size === visibleIds.length
  const someSelected = selectedIds.size > 0 && !allSelected

  return (
    <div className="p-6 space-y-4">
      {conflictCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,180,50,0.1)', border: '0.5px solid rgba(255,180,50,0.3)' }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: '#D4830A' }} />
          <p className="text-xs" style={{ color: '#8A5500' }}>
            <span className="font-medium">{conflictCount} {pluralBlud(conflictCount)}</span> уже существуют в меню.
            Выберите: перезаписать или пропустить.
          </p>
        </div>
      )}

      {aiCorrections.length > 0 && <AiCorrectionsBlock corrections={aiCorrections} />}

      <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid rgba(176,166,223,0.35)' }}>
        <div
          className="grid items-center text-xs font-medium px-4 py-2.5"
          style={{
            gridTemplateColumns: '28px 1fr 110px 72px 140px',
            background: 'rgba(234,231,248,0.8)',
            color: 'var(--color-text-secondary)',
            borderBottom: '0.5px solid rgba(176,166,223,0.3)',
          }}
        >
          <GlassCheckbox checked={allSelected} indeterminate={someSelected} onChange={() => onSelectAll(visibleIds)} />
          <span className="pl-1">Блюдо / Категория</span>
          <span>Ингредиенты</span>
          <span>Вес</span>
          <span>Статус</span>
        </div>

        <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.2)' }}>
          {uniqueDishes.map((dish) => {
            const key = dishKey(dish)
            const isConflict = conflicts.has(key)
            const resolution = resolutions.get(key)
            const totalWeight = dish.ingredients.filter(i => i.unit !== 'шт').reduce((s, i) => s + i.netWeight, 0)
            const isSelected = selectedIds.has(dish.id)
            const isSkipped = dish.kind === 'dish' && isConflict && resolution === 'skip'

            return (
              <div
                key={dish.id}
                onClick={() => onSelectToggle(dish.id)}
                className="grid items-center px-4 py-3 text-sm cursor-pointer"
                style={{
                  gridTemplateColumns: '28px 1fr 110px 72px 140px',
                  background: isSelected ? 'rgba(176,166,223,0.13)' : isSkipped ? 'rgba(0,0,0,0.02)' : 'transparent',
                  borderLeft: isSelected ? '2px solid #B0A6DF' : '2px solid transparent',
                  opacity: isSkipped && !isSelected ? 0.5 : 1,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
              >
                <GlassCheckbox checked={isSelected} onChange={() => onSelectToggle(dish.id)} />

                <div className="min-w-0 pl-1 pr-3">
                  <p className="font-medium truncate text-sm" style={{ color: 'var(--color-text-primary)' }}>{dish.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{dish.category}</p>
                </div>

                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {dish.ingredients.length > 0 ? `${dish.ingredients.length} ингр.` : '—'}
                </span>

                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {totalWeight > 0 ? `${Math.round(totalWeight)} г` : '—'}
                </span>

                {dish.kind === 'preparation' ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit"
                    style={{ background: 'rgba(176,166,223,0.2)', color: 'var(--color-text-secondary)', border: '0.5px solid rgba(176,166,223,0.4)' }}>
                    → Ингредиенты
                  </span>
                ) : isConflict ? (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => onToggle(key, 'overwrite')}
                      className="flex-1 h-7 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: resolution === 'overwrite' ? '#B0A6DF' : 'rgba(176,166,223,0.15)',
                        color: resolution === 'overwrite' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        border: resolution === 'overwrite' ? 'none' : '0.5px solid rgba(176,166,223,0.3)',
                      }}>
                      Заменить
                    </button>
                    <button onClick={() => onToggle(key, 'skip')}
                      className="flex-1 h-7 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: resolution === 'skip' ? '#EAE7F8' : 'rgba(176,166,223,0.08)',
                        color: resolution === 'skip' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        border: '0.5px solid rgba(176,166,223,0.3)',
                      }}>
                      Пропустить
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: '#2A9D5C' }}>
                    <Check size={13} />
                    Новое
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {uniqueDishes.some(d => d.ingredients.some(i => i.netWeight === 0)) && (
        <p className="text-xs px-1" style={{ color: 'var(--color-text-secondary)' }}>
          Ингредиенты с нулевым весом будут добавлены без учёта в состав.
        </p>
      )}
    </div>
  )
}
