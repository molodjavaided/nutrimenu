'use client'

import { useState, useEffect, useRef } from 'react'
import { IngredientLibrary, IngredientRef } from '@/types'
import { resolveIngredientPer100 } from '@/lib/utils'

interface Props {
  libraries: IngredientLibrary[]
  alreadyAddedIds: string[]
  onSelect: (ref: IngredientRef) => void
  onClose: () => void
  /** All refs across all libraries — needed to resolve composite nutrition on-the-fly */
  allRefs?: IngredientRef[]
}

export default function IngredientPickerModal({ libraries, alreadyAddedIds, onSelect, onClose, allRefs }: Props) {
  const [activeLibId, setActiveLibId] = useState<string>(libraries[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Autofocus search on open
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  // Focus search when switching library
  useEffect(() => {
    setSearch('')
    searchRef.current?.focus()
  }, [activeLibId])

  const activeLib = libraries.find(l => l.id === activeLibId)
  const ingredients = activeLib?.ingredients ?? []

  const filtered = search.trim()
    ? ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : ingredients

  // Group by category, preserving order
  const categoryOrder: string[] = []
  const grouped: Record<string, IngredientRef[]> = {}
  for (const ing of filtered) {
    const cat = ing.category ?? 'Прочее'
    if (!grouped[cat]) {
      grouped[cat] = []
      categoryOrder.push(cat)
    }
    grouped[cat].push(ing)
  }

  function handleSelect(ref: IngredientRef) {
    onSelect(ref)
    // Don't close — user may want to add multiple
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(44,41,80,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Panel */}
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: 560,
          maxHeight: '80vh',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '0.5px solid rgba(255,255,255,0.6)',
          boxShadow: '0 24px 64px rgba(139,92,246,0.18), 0 1px 0 rgba(255,255,255,0.9) inset',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
          <p className="text-base font-medium" style={{ color: '#2C2950' }}>
            Выбрать ингредиент
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'rgba(139,92,246,0.08)', color: '#7C3AED' }}
          >
            ✕
          </button>
        </div>

        {/* Library tabs */}
        <div
          className="flex gap-1 px-4 pt-3 pb-2 flex-wrap"
          style={{ borderBottom: '0.5px solid rgba(255,255,255,0.4)', scrollbarWidth: 'none' }}
        >
          {libraries.map(lib => (
            <button
              key={lib.id}
              onClick={() => setActiveLibId(lib.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg whitespace-nowrap shrink-0 flex-shrink-0 transition-colors"
              style={{
                background: activeLibId === lib.id ? 'rgba(139,92,246,0.1)' : 'transparent',
                color: activeLibId === lib.id ? '#7C3AED' : '#9D99B8',
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
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#2C2950' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-xs" style={{ color: '#9D99B8' }}>✕</button>
            )}
          </div>
        </div>

        {/* Ingredient list */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {categoryOrder.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: '#9D99B8' }}>
              {search ? 'Ничего не найдено' : 'Справочник пуст'}
            </p>
          )}

          {categoryOrder.map(cat => (
            <div key={cat} className="mb-4">
              <p className="text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#C8C3F0' }}>
                {cat}
              </p>
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
                      onClick={() => !added && handleSelect(ref)}
                      disabled={added}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-colors"
                      style={{
                        background: added ? 'transparent' : undefined,
                        color: added ? '#C8C3F0' : '#2C2950',
                        cursor: added ? 'default' : 'pointer',
                      }}
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
                      <span className="flex items-center gap-3 text-xs shrink-0 ml-3" style={{ color: added ? '#C8C3F0' : '#9D99B8' }}>
                        <span>{resolved.caloriesPer100} ккал</span>
                        <span>Б {resolved.proteinPer100}г</span>
                        <span>Ж {resolved.fatPer100}г</span>
                        <span>У {resolved.carbsPer100}г</span>
                        {added && <span style={{ color: '#B0A6DF' }}>✓ добавлен</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.4)' }}
        >
          <p className="text-xs" style={{ color: '#9D99B8' }}>
            Нажмите на ингредиент чтобы добавить его в состав
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}
