'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { IngredientLibrary, IngredientRef } from '@/types'
import { resolveIngredientPer100 } from '@/lib/utils'
import { CATEGORY_LABELS, asCategory } from '@/lib/cooking-coefficients'
import { searchIngredients } from '@/lib/ingredient-search'
import { getRecentIngredientIds, markIngredientUsed } from '@/lib/recent-ingredients'
import MobileSheet from '@/components/ui/MobileSheet'

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

const RECENT_SECTION = '__recent__'

export default function IngredientPickerModal({ libraries, alreadyAddedIds, onSelect, onClose, allRefs, onIngredientCreated }: Props) {
  const [activeLibId, setActiveLibId] = useState<string>(libraries[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [recentIds, setRecentIds] = useState<string[]>([])

  // Подтягиваем «недавние» при открытии модалки.
  useEffect(() => {
    setRecentIds(getRecentIngredientIds())
  }, [])

  // Не автофокусим поиск — клавиатура на мобильном перекрывает контент
  useEffect(() => { setSearch('') }, [activeLibId])

  const trimmed = search.trim()
  const isSearching = trimmed.length > 0

  // Глобальный пул для поиска — все библиотеки разом. Дедуплицируем по id.
  const allIngredients = useMemo(() => {
    const seen = new Set<string>()
    const out: { ref: IngredientRef; libId: string; libName: string; isSystem: boolean }[] = []
    for (const lib of libraries) {
      for (const ref of lib.ingredients) {
        if (seen.has(ref.id)) continue
        seen.add(ref.id)
        out.push({ ref, libId: lib.id, libName: lib.name, isSystem: !!lib.isSystem })
      }
    }
    return out
  }, [libraries])

  const libMetaById = useMemo(() => {
    const m = new Map<string, { libName: string; isSystem: boolean }>()
    for (const item of allIngredients) m.set(item.ref.id, { libName: item.libName, isSystem: item.isSystem })
    return m
  }, [allIngredients])

  // Результаты для отображения. В режиме поиска — глобальные, иначе — текущая библиотека.
  const activeLib = libraries.find(l => l.id === activeLibId)
  const visibleRefs: IngredientRef[] = useMemo(() => {
    if (isSearching) {
      return searchIngredients(allIngredients.map(x => x.ref), trimmed).map(s => s.ref)
    }
    return activeLib?.ingredients ?? []
  }, [isSearching, trimmed, allIngredients, activeLib])

  // Группировка: при поиске — все под одной шапкой «Результаты», иначе — по категориям + «Недавние».
  const sections: { key: string; title: string; items: IngredientRef[] }[] = useMemo(() => {
    if (isSearching) {
      return visibleRefs.length > 0
        ? [{ key: 'search', title: `Найдено: ${visibleRefs.length}`, items: visibleRefs }]
        : []
    }

    const out: { key: string; title: string; items: IngredientRef[] }[] = []
    // Секция «Недавние» — фильтруем по тому что вообще есть в активной библиотеке
    if (recentIds.length > 0 && activeLib) {
      const inLib = new Set(activeLib.ingredients.map(i => i.id))
      const recents = recentIds
        .filter(id => inLib.has(id))
        .map(id => activeLib.ingredients.find(i => i.id === id)!)
        .filter(Boolean)
        .slice(0, 8)
      if (recents.length > 0) out.push({ key: RECENT_SECTION, title: 'Недавние', items: recents })
    }

    // Категории
    const grouped: Record<string, IngredientRef[]> = {}
    const order: string[] = []
    for (const ing of visibleRefs) {
      const enumCat = asCategory(ing.category) ?? 'other'
      const cat = CATEGORY_LABELS[enumCat]
      if (!grouped[cat]) { grouped[cat] = []; order.push(cat) }
      grouped[cat].push(ing)
    }
    for (const cat of order) out.push({ key: cat, title: cat, items: grouped[cat] })
    return out
  }, [isSearching, visibleRefs, recentIds, activeLib])

  function handleSelect(ref: IngredientRef) {
    markIngredientUsed(ref.id)
    setRecentIds(prev => [ref.id, ...prev.filter(x => x !== ref.id)].slice(0, 20))
    onSelect(ref)
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
      handleSelect(created)
      setCreating(false)
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <div className="px-5 py-3 flex items-center justify-between">
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
  )

  return (
    <>
      <MobileSheet open onClose={onClose} title="Выбрать ингредиент" zIndex={70} desktopWidth="xl" footer={footer}>
        {/* Library tabs — в режиме поиска прячем, чтобы фокус был на глобальных результатах */}
        {!isSearching && (
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
        )}

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
              placeholder={isSearching ? 'Поиск по всем библиотекам...' : 'Поиск...'}
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
          {sections.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              {isSearching ? 'Ничего не найдено' : 'Справочник пуст'}
            </p>
          )}
          {sections.map(section => (
            <div key={section.key} className="mb-4">
              <p className="text-xs font-medium uppercase tracking-wider mb-1.5"
                style={{ color: section.key === RECENT_SECTION ? '#8B5CF6' : '#C8C3F0' }}>
                {section.key === RECENT_SECTION ? '⌛ ' : ''}{section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map(ref => {
                  const added = alreadyAddedIds.includes(ref.id)
                  const isComposite = ref.type === 'composite'
                  const resolved = isComposite && allRefs
                    ? resolveIngredientPer100(ref, allRefs)
                    : { caloriesPer100: ref.caloriesPer100, proteinPer100: ref.proteinPer100, fatPer100: ref.fatPer100, carbsPer100: ref.carbsPer100 }
                  const meta = isSearching ? libMetaById.get(ref.id) : null
                  return (
                    <button
                      key={`${section.key}-${ref.id}`}
                      onClick={() => !added && handleSelect(ref)}
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
                        {meta && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md shrink-0"
                            style={{
                              background: meta.isSystem ? 'rgba(139,92,246,0.1)' : 'rgba(176,166,223,0.2)',
                              color: meta.isSystem ? '#7C3AED' : 'var(--color-text-muted)',
                            }}
                          >
                            {meta.isSystem ? 'база' : 'моё'}
                          </span>
                        )}
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
      </MobileSheet>

      {/* Создание нового ингредиента — делегируем в IngredientFormModal (поддерживает mono + composite + штрихкод-сканер + AI lookup) */}
      {creating && (
        <IngredientFormModal
          libraries={libraries}
          allRefs={allRefs ?? []}
          initialName={search}
          zIndex={80}
          onSave={handleCreateFromForm}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  )
}
