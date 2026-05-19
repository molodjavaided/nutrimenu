'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { IngredientLibrary, IngredientRef } from '@/types'
import { resolveIngredientPer100 } from '@/lib/utils'
import { CATEGORY_LABELS, asCategory } from '@/lib/cooking-coefficients'

// Загружаем динамически — избегаем циклической зависимости IngredientFormModal ↔ IngredientPickerModal
const IngredientFormModal = dynamic(() => import('./IngredientFormModal'), { ssr: false })

interface Props {
  libraries: IngredientLibrary[]
  alreadyAddedIds: string[]
  onSelect: (ref: IngredientRef) => void
  onClose: () => void
  allRefs?: IngredientRef[]
  onIngredientCreated?: (ref: IngredientRef) => void
}

export default function IngredientPickerModal({ libraries, alreadyAddedIds, onSelect, onClose, allRefs, onIngredientCreated }: Props) {
  const [activeLibId, setActiveLibId] = useState<string>(libraries[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Не автофокусим поиск — клавиатура на мобильном перекрывает контент
  useEffect(() => { setSearch('') }, [activeLibId])

  const activeLib = libraries.find(l => l.id === activeLibId)
  const ingredients = activeLib?.ingredients ?? []

  const filtered = search.trim()
    ? ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : ingredients

  const categoryOrder: string[] = []
  const grouped: Record<string, IngredientRef[]> = {}
  for (const ing of filtered) {
    const enumCat = asCategory(ing.category) ?? 'other'
    const cat = CATEGORY_LABELS[enumCat]
    if (!grouped[cat]) { grouped[cat] = []; categoryOrder.push(cat) }
    grouped[cat].push(ing)
  }

  async function handleCreateFromForm(ing: IngredientRef) {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ing),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        alert(err?.error ?? 'Не удалось создать ингредиент')
        return
      }
      const created: IngredientRef = await res.json()
      onIngredientCreated?.(created)
      onSelect(created)
      setCreating(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch sm:items-center justify-center"
      style={{ background: 'rgba(44,41,80,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col w-full sm:max-w-[560px] overflow-hidden h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4"
          style={{ borderBottom: '0.5px solid rgba(176,166,223,0.2)' }}>
          <p className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Выбрать ингредиент
          </p>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'rgba(139,92,246,0.08)', color: '#7C3AED' }}
            aria-label="Закрыть"
          >✕</button>
        </div>

        {/* Library tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-2 flex-wrap"
              style={{ borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
              {libraries.map(lib => (
                <button
                  key={lib.id}
                  onClick={() => setActiveLibId(lib.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg whitespace-nowrap shrink-0 transition-colors"
                  style={{
                    background: activeLibId === lib.id ? 'rgba(139,92,246,0.1)' : 'transparent',
                    color: activeLibId === lib.id ? '#7C3AED' : 'var(--color-text-muted)',
                    fontWeight: activeLibId === lib.id ? 500 : 400,
                    boxShadow: activeLibId === lib.id ? 'inset 0 -2px 0 0 #8B5CF6' : 'none',
                  }}
                >
                  {lib.isSystem && (
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ color: '#B0A6DF' }}>
                      <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  )}
                  {lib.name}
                  <span className="text-xs" style={{ color: '#C8C3F0' }}>{lib.ingredients.length}</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
              <div className="flex items-center gap-2 px-3 h-9 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.5)' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="4.5" stroke="#9D99B8" strokeWidth="1.3"/>
                  <path d="M11 11L14 14" stroke="#9D99B8" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--color-text-primary)' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>✕</button>
                )}
              </div>
            </div>

            {/* Ingredient list */}
            <div className="overflow-y-auto flex-1 px-4 py-3">
              {categoryOrder.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                  {search ? 'Ничего не найдено' : 'Справочник пуст'}
                </p>
              )}
              {categoryOrder.map(cat => (
                <div key={cat} className="mb-4">
                  <p className="text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#C8C3F0' }}>{cat}</p>
                  <div className="space-y-0.5">
                    {grouped[cat].map(ref => {
                      const added = alreadyAddedIds.includes(ref.id)
                      const isComposite = ref.type === 'composite'
                      const resolved = isComposite && allRefs
                        ? resolveIngredientPer100(ref, allRefs)
                        : { caloriesPer100: ref.caloriesPer100, proteinPer100: ref.proteinPer100, fatPer100: ref.fatPer100, carbsPer100: ref.carbsPer100 }
                      return (
                        <button
                          key={ref.id}
                          onClick={() => !added && onSelect(ref)}
                          disabled={added}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-colors"
                          style={{ color: added ? '#C8C3F0' : 'var(--color-text-primary)', cursor: added ? 'default' : 'pointer' }}
                          onMouseEnter={e => { if (!added) (e.currentTarget as HTMLButtonElement).style.background = '#EAE7F8' }}
                          onMouseLeave={e => { if (!added) (e.currentTarget as HTMLButtonElement).style.background = '' }}
                        >
                          <span className="flex items-center gap-1.5 font-medium min-w-0">
                            {isComposite && (
                              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
                                <rect x="1" y="9" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="1" y="5.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="1" y="1.5" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                              </svg>
                            )}
                            <span className="truncate">{ref.name}</span>
                          </span>
                          <span className="flex items-center gap-3 text-xs shrink-0 ml-3" style={{ color: added ? '#C8C3F0' : 'var(--color-text-muted)' }}>
                            <span>{resolved.caloriesPer100} ккал</span>
                            <span>Б {resolved.proteinPer100}г</span>
                            <span>Ж {resolved.fatPer100}г</span>
                            <span>У {resolved.carbsPer100}г</span>
                            {added && <span style={{ color: '#B0A6DF' }}>✓</span>}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.4)' }}>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
            style={{ color: '#7C3AED', background: 'rgba(139,92,246,0.08)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Новый ингредиент
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}
          >
            Готово
          </button>
        </div>
      </div>

      {/* Создание нового ингредиента — делегируем в IngredientFormModal (поддерживает mono + composite + штрихкод-сканер + AI lookup) */}
      {creating && (
        <IngredientFormModal
          libraries={libraries}
          allRefs={allRefs ?? []}
          initialName={search}
          onSave={handleCreateFromForm}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  )
}
