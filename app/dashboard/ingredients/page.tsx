'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { IngredientLibrary, IngredientRef } from '@/types'
import { systemLibraries } from '@/lib/mock-data'

const MY_LIBRARY_ID = 'my-library'
import { SearchInput } from '@/components/ui/SearchInput'
import IngredientFormModal from '@/components/dashboard/IngredientFormModal'
import GlassCheckbox from '@/components/ui/GlassCheckbox'

const PRESET_CATEGORIES = ['Молоко', 'Крупа', 'Мясо и рыба', 'Овощи', 'Фрукты', 'Соусы', 'Выпечка', 'Прочее']

type BarcodeStatus = 'idle' | 'loading' | 'not_found' | 'error'

export default function IngredientsPage() {
  const [libraries, setLibraries] = useState<IngredientLibrary[]>([])
  const [activeLibId, setActiveLibId] = useState<string>(MY_LIBRARY_ID)
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Modal state: undefined = closed, null = new, IngredientRef = editing
  const [modalTarget, setModalTarget] = useState<IngredientRef | null | undefined>(undefined)

  const [barcodeMode, setBarcodeMode] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeStatus, setBarcodeStatus] = useState<BarcodeStatus>('idle')
  // Pre-filled data from barcode scan — opens the mono form modal
  const [barcodePreFill, setBarcodePreFill] = useState<Omit<IngredientRef, 'id'> | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/ingredients')
      .then(r => r.ok ? r.json() : [])
      .then((personalIngredients: IngredientRef[]) => {
        const personalLib = { id: MY_LIBRARY_ID, name: 'Мои ингредиенты', isSystem: false, ingredients: personalIngredients }
        setLibraries([...systemLibraries, personalLib])
        setActiveLibId(MY_LIBRARY_ID)
      })
  }, [])

  // Clear selection when switching libraries
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedIds(new Set())
    setConfirmBulkDelete(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeLibId])

  const activeLib = libraries.find(l => l.id === activeLibId) ?? null
  const ingredients = activeLib?.ingredients ?? []
  const isSystem = activeLib?.isSystem ?? false

  const allRefs = libraries.flatMap(l => l.ingredients)

  function updateLocalLib(updated: IngredientRef[]) {
    setLibraries(libs => libs.map(l =>
      l.id === activeLibId ? { ...l, ingredients: updated } : l
    ))
  }

  async function handleSave(ing: IngredientRef) {
    const isEdit = ingredients.some(i => i.id === ing.id)
    if (isEdit) {
      await fetch(`/api/ingredients/${ing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ing),
      })
      updateLocalLib(ingredients.map(i => i.id === ing.id ? ing : i))
    } else {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ing),
      })
      const saved = await res.json()
      updateLocalLib([...ingredients, saved])
    }
    toast.success(isEdit ? 'Ингредиент сохранён' : 'Ингредиент добавлен')
    setModalTarget(undefined)
    setBarcodePreFill(null)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/ingredients/${id}`, { method: 'DELETE' })
    updateLocalLib(ingredients.filter(i => i.id !== id))
    setConfirmDeleteId(null)
  }

  function handleSelectToggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAll(visibleIds: string[]) {
    const allSelected = visibleIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        visibleIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => new Set([...prev, ...visibleIds]))
    }
  }

  async function handleBulkDeleteRequest() {
    if (confirmBulkDelete) {
      // Second click — actually delete
      const toDelete = [...selectedIds]
      await Promise.all(toDelete.map(id => fetch(`/api/ingredients/${id}`, { method: 'DELETE' })))
      updateLocalLib(ingredients.filter(i => !selectedIds.has(i.id)))
      setSelectedIds(new Set())
      setConfirmBulkDelete(false)
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    } else {
      // First click — arm confirmation, auto-reset after 4s
      setConfirmBulkDelete(true)
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = setTimeout(() => setConfirmBulkDelete(false), 4000)
    }
  }

  async function handleBarcodeLookup() {
    const code = barcodeInput.trim()
    if (!code) return
    setBarcodeStatus('loading')
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`
      )
      const data = await res.json()
      if (data.status !== 1 || !data.product) {
        setBarcodeStatus('not_found')
        return
      }
      const p = data.product
      const n = p.nutriments ?? {}
      const name: string = p.product_name_ru || p.product_name || p.abbreviated_product_name || ''
      setBarcodePreFill({
        name: name.trim(),
        unit: 'г',
        caloriesPer100: Math.round(n['energy-kcal_100g'] ?? n['energy_100g'] ?? 0),
        proteinPer100: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
        fatPer100: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
        carbsPer100: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
        category: 'Прочее',
        type: 'mono',
      })
      setBarcodeStatus('idle')
      setBarcodeMode(false)
      setBarcodeInput('')
      // Open modal with pre-filled data as a new ingredient
      setModalTarget(null)
    } catch {
      setBarcodeStatus('error')
    }
  }

  const filtered = ingredients.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const allCategories = [
    ...PRESET_CATEGORIES,
    ...Array.from(new Set(
      ingredients.map(i => i.category ?? 'Прочее').filter(c => !PRESET_CATEGORIES.includes(c))
    )),
  ]

  const grouped = allCategories.reduce<Record<string, IngredientRef[]>>((acc, cat) => {
    const items = filtered.filter(i => (i.category ?? 'Прочее') === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  const allFilteredIds = filtered.map(i => i.id)
  const allFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id))
  const someFilteredSelected = allFilteredIds.some(id => selectedIds.has(id))

  // Build pre-filled IngredientRef from barcode data for the modal
  const barcodeAsRef: IngredientRef | undefined = barcodePreFill
    ? { ...barcodePreFill, id: '__barcode__' }
    : undefined

  // Desktop grid columns — add checkbox column for non-system
  const desktopCols = isSystem
    ? '1fr 80px 80px 60px 60px 70px'
    : '28px 1fr 80px 80px 60px 60px 70px 72px'

  return (
    <div className="flex flex-col md:flex-row h-full">

      {/* ── Library sidebar ── */}
      <div
        className="md:w-56 md:shrink-0 md:flex-col md:gap-1 md:pt-8 md:pb-6 md:pr-2 md:border-r md:flex
                   flex overflow-x-auto gap-2 px-4 pt-4 pb-3 border-b shrink-0"
        style={{ borderColor: 'rgba(176,166,223,0.25)' }}
      >
        <p className="hidden md:block text-xs font-medium uppercase tracking-wider px-3 mb-2" style={{ color: '#9D99B8' }}>
          Библиотеки
        </p>

        {libraries.map(lib => (
          <button
            key={lib.id}
            onClick={() => { setActiveLibId(lib.id); setSearch('') }}
            className="flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl text-sm text-left shrink-0 md:w-full transition-colors"
            style={{
              background: activeLibId === lib.id ? '#EAE7F8' : 'transparent',
              color: activeLibId === lib.id ? '#2C2950' : '#6B6490',
              fontWeight: activeLibId === lib.id ? 500 : 400,
              border: activeLibId === lib.id ? 'none' : '0.5px solid rgba(176,166,223,0.3)',
            }}
          >
            {lib.isSystem ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
                <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
                <path d="M2 10.5h10M2 7.5h10M2 4.5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            )}
            <span className="truncate">{lib.name}</span>
            <span className="ml-auto text-xs shrink-0 hidden md:inline" style={{ color: '#9D99B8' }}>
              {lib.ingredients.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className={`flex-1 p-4 sm:p-8 overflow-y-auto${!isSystem && selectedIds.size > 0 ? ' pb-28' : ''}`}>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-medium" style={{ color: '#2C2950' }}>
                  {activeLib?.name ?? ''}
                </h1>
                {isSystem && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: '#EAE7F8', color: '#B0A6DF' }}>
                    Системная
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: '#6B6490' }}>
                {ingredients.length} ингредиентов
                {isSystem && ' · только просмотр'}
              </p>
            </div>

            {!isSystem && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setBarcodeMode(m => !m); setBarcodeInput(''); setBarcodeStatus('idle') }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: barcodeMode ? '#2C2950' : '#EAE7F8',
                    color: barcodeMode ? '#EAE7F8' : '#2C2950',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M1 3v10M3 3v10M5 3v10M7 3v6M9 3v10M11 3v10M13 3v6M7 11v2M10 9h3v4h-3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span className="hidden sm:inline">По штрихкоду</span>
                </button>
                <button
                  onClick={() => { setBarcodePreFill(null); setModalTarget(null); setBarcodeMode(false) }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: '#B0A6DF', color: '#2C2950' }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="hidden sm:inline">Добавить ингредиент</span>
                  <span className="sm:hidden">Добавить</span>
                </button>
              </div>
            )}
          </div>

          {/* Barcode section */}
          {!isSystem && barcodeMode && (
            <div className="rounded-2xl p-4 sm:p-5 mb-6"
              style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.5)' }}>
              <p className="text-sm font-medium mb-1" style={{ color: '#2C2950' }}>
                Поиск по штрихкоду
              </p>
              <p className="text-xs mb-4" style={{ color: '#9D99B8' }}>
                Введите штрихкод с упаковки — данные о КБЖУ заполнятся автоматически
              </p>
              <div className="flex flex-col sm:flex-row gap-2 items-start">
                <div className="flex flex-col gap-1 flex-1 w-full">
                  <input
                    autoFocus
                    value={barcodeInput}
                    onChange={e => { setBarcodeInput(e.target.value); setBarcodeStatus('idle') }}
                    onKeyDown={e => e.key === 'Enter' && handleBarcodeLookup()}
                    placeholder="4630146040576"
                    className="h-11 px-3 rounded-xl text-sm outline-none font-mono w-full"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                  />
                  {barcodeStatus === 'not_found' && (
                    <p className="text-xs" style={{ color: '#E24B4A' }}>
                      Товар не найден. Попробуйте другой штрихкод или добавьте вручную.
                    </p>
                  )}
                  {barcodeStatus === 'error' && (
                    <p className="text-xs" style={{ color: '#E24B4A' }}>
                      Ошибка сети. Проверьте подключение.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleBarcodeLookup}
                    disabled={!barcodeInput.trim() || barcodeStatus === 'loading'}
                    className="flex-1 sm:flex-none h-11 px-5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      background: barcodeInput.trim() ? '#B0A6DF' : '#C8C3F0',
                      color: '#2C2950',
                      opacity: barcodeStatus === 'loading' ? 0.7 : 1,
                    }}
                  >
                    {barcodeStatus === 'loading' ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
                          <circle cx="7" cy="7" r="5.5" stroke="#B0A6DF" strokeWidth="1.5"/>
                          <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="#2C2950" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Поиск...
                      </>
                    ) : 'Найти'}
                  </button>
                  <button
                    onClick={() => { setBarcodeMode(false); setBarcodeInput(''); setBarcodeStatus('idle') }}
                    className="h-11 px-3 rounded-xl text-sm"
                    style={{ background: '#FEFEF2', color: '#6B6490' }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Поиск ингредиента..."
            />
          </div>

          {/* Empty state */}
          {ingredients.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: '#EAE7F8' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 4v20M4 14h20" stroke="#B0A6DF" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: '#2C2950' }}>
                {isSystem ? 'Библиотека пуста' : 'Справочник пуст'}
              </p>
              <p className="text-sm" style={{ color: '#9D99B8' }}>
                {isSystem
                  ? 'Ингредиенты появятся после обновления сервиса'
                  : 'Добавьте первый ингредиент чтобы начать'
                }
              </p>
            </div>
          )}

          {/* Grouped list */}
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#9D99B8' }}>
                {cat}
              </p>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <div className="grid gap-3 px-4 py-2 text-xs rounded-xl mb-1"
                  style={{
                    color: '#9D99B8',
                    gridTemplateColumns: desktopCols,
                    background: '#EAE7F8',
                  }}>
                  {!isSystem && (
                    <GlassCheckbox
                      checked={items.every(i => selectedIds.has(i.id))}
                      indeterminate={items.some(i => selectedIds.has(i.id)) && !items.every(i => selectedIds.has(i.id))}
                      onChange={() => handleSelectAll(items.map(i => i.id))}
                    />
                  )}
                  <span>Название</span>
                  <span>Единица</span>
                  <span>Калории</span>
                  <span>Белки</span>
                  <span>Жиры</span>
                  <span>Углеводы</span>
                  {!isSystem && <span></span>}
                </div>

                {items.map(ing => (
                  <div
                    key={ing.id}
                    className="grid gap-3 px-4 py-2.5 rounded-xl items-center"
                    style={{
                      gridTemplateColumns: desktopCols,
                      borderBottom: '0.5px solid rgba(176,166,223,0.15)',
                      background: selectedIds.has(ing.id) ? 'rgba(176,166,223,0.1)' : 'transparent',
                    }}
                  >
                    {!isSystem && (
                      <GlassCheckbox
                        checked={selectedIds.has(ing.id)}
                        onChange={() => handleSelectToggle(ing.id)}
                      />
                    )}
                    <span className="flex items-center gap-1.5 text-sm font-medium min-w-0" style={{ color: '#2C2950' }}>
                      {ing.type === 'composite' && <CompositeIcon />}
                      <span className="truncate">{ing.name}</span>
                    </span>
                    <span className="text-sm" style={{ color: '#6B6490' }}>100 {ing.unit}</span>
                    <span className="text-sm" style={{ color: '#534AB7' }}>{ing.caloriesPer100}</span>
                    <span className="text-sm" style={{ color: '#6B6490' }}>{ing.proteinPer100}г</span>
                    <span className="text-sm" style={{ color: '#6B6490' }}>{ing.fatPer100}г</span>
                    <span className="text-sm" style={{ color: '#6B6490' }}>{ing.carbsPer100}г</span>
                    {!isSystem && (
                      <div className="flex items-center gap-1 justify-end">
                        <IngredientActions
                          ing={ing}
                          confirmDeleteId={confirmDeleteId}
                          onEdit={ing => setModalTarget(ing)}
                          onConfirmDelete={setConfirmDeleteId}
                          onDelete={handleDelete}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden flex flex-col gap-2">
                {items.map(ing => (
                  <div key={ing.id} className="rounded-xl p-3"
                    style={{
                      background: selectedIds.has(ing.id) ? 'rgba(176,166,223,0.2)' : '#EAE7F8',
                      border: selectedIds.has(ing.id)
                        ? '0.5px solid rgba(176,166,223,0.6)'
                        : '0.5px solid rgba(176,166,223,0.2)',
                    }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {!isSystem && (
                          <GlassCheckbox
                            checked={selectedIds.has(ing.id)}
                            onChange={() => handleSelectToggle(ing.id)}
                          />
                        )}
                        <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#2C2950' }}>
                          {ing.type === 'composite' && <CompositeIcon />}
                          {ing.name}
                        </span>
                      </div>
                      {!isSystem && (
                        <div className="flex items-center gap-1 shrink-0">
                          <IngredientActions
                            ing={ing}
                            confirmDeleteId={confirmDeleteId}
                            onEdit={ing => setModalTarget(ing)}
                            onConfirmDelete={setConfirmDeleteId}
                            onDelete={handleDelete}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <span className="text-xs" style={{ color: '#9D99B8' }}>100 {ing.unit}</span>
                      <span className="text-xs font-medium" style={{ color: '#534AB7' }}>{ing.caloriesPer100} ккал</span>
                      <span className="text-xs" style={{ color: '#6B6490' }}>Б {ing.proteinPer100}г</span>
                      <span className="text-xs" style={{ color: '#6B6490' }}>Ж {ing.fatPer100}г</span>
                      <span className="text-xs" style={{ color: '#6B6490' }}>У {ing.carbsPer100}г</span>
                      {ing.type === 'composite' && (
                        <span className="text-xs font-medium" style={{ color: '#B0A6DF' }}>
                          · {(ing.composition?.length ?? 0)} компонентов
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Bulk selection bar (fixed floating island) ── */}
      {!isSystem && selectedIds.size > 0 && (
        <>
          <style>{`
            @keyframes bulk-bar-in {
              from { opacity: 0; transform: translateX(-50%) translateY(24px); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
          <div
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 2rem)',
              maxWidth: '640px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '16px',
              background: 'rgba(28, 25, 56, 0.75)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '0.5px solid rgba(176,166,223,0.25)',
              boxShadow: '0 8px 32px rgba(28,25,56,0.35), 0 1px 0 rgba(255,255,255,0.06) inset',
              zIndex: 50,
              animation: 'bulk-bar-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            {/* Select-all toggle */}
            <GlassCheckbox
              checked={allFilteredSelected}
              indeterminate={someFilteredSelected && !allFilteredSelected}
              onChange={() => handleSelectAll(allFilteredIds)}
            />
            <span className="text-sm flex-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Выбрано: <strong>{selectedIds.size}</strong>
            </span>

            <button
              onClick={() => { setSelectedIds(new Set()); setConfirmBulkDelete(false) }}
              className="px-3 py-2 rounded-xl text-sm transition-colors"
              style={{ background: 'rgba(176,166,223,0.18)', color: 'rgba(255,255,255,0.6)' }}
            >
              Отмена
            </button>

            <button
              onClick={handleBulkDeleteRequest}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
              style={{
                background: confirmBulkDelete ? '#E24B4A' : 'rgba(176,166,223,0.25)',
                color: confirmBulkDelete ? '#fff' : 'rgba(255,255,255,0.9)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"
                  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {confirmBulkDelete ? `Подтвердить удаление ${selectedIds.size} записей` : `Удалить ${selectedIds.size}`}
            </button>
          </div>
        </>
      )}

      {/* ── Ingredient form modal ── */}
      {modalTarget !== undefined && (
        <IngredientFormModal
          editing={modalTarget === null
            ? (barcodeAsRef?.id === '__barcode__' ? { ...barcodeAsRef, id: crypto.randomUUID() } : undefined)
            : modalTarget
          }
          libraries={libraries}
          allRefs={allRefs}
          selfId={modalTarget?.id}
          onSave={handleSave}
          onClose={() => { setModalTarget(undefined); setBarcodePreFill(null) }}
        />
      )}
    </div>
  )
}

// ── Composite icon ────────────────────────────────────────────────────────────

function CompositeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
      <rect x="1" y="9" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="5.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="1.5" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

// ── Actions ───────────────────────────────────────────────────────────────────

function IngredientActions({
  ing,
  confirmDeleteId,
  onEdit,
  onConfirmDelete,
  onDelete,
}: {
  ing: IngredientRef
  confirmDeleteId: string | null
  onEdit: (ing: IngredientRef) => void
  onConfirmDelete: (id: string | null) => void
  onDelete: (id: string) => void
}) {
  return confirmDeleteId === ing.id ? (
    <>
      <button
        onClick={() => onDelete(ing.id)}
        className="px-2 h-7 rounded-lg text-xs font-medium"
        style={{ background: '#E24B4A', color: '#fff' }}
      >
        Удалить
      </button>
      <button
        onClick={() => onConfirmDelete(null)}
        className="px-2 h-7 rounded-lg text-xs"
        style={{ background: 'rgba(176,166,223,0.3)', color: '#6B6490' }}
      >
        ✕
      </button>
    </>
  ) : (
    <>
      <button
        onClick={() => onEdit(ing)}
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ color: '#6B6490', background: 'rgba(176,166,223,0.3)' }}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        onClick={() => onConfirmDelete(ing.id)}
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ color: '#6B6490', background: 'rgba(176,166,223,0.3)' }}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </>
  )
}
