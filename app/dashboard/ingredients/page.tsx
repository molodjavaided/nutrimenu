'use client'

import { useEffect, useState } from 'react'
import { IngredientLibrary, IngredientRef } from '@/types'
import { getLibraries, saveLibraryIngredients, initLibraries, MY_LIBRARY_ID } from '@/lib/store'
import { systemLibraries } from '@/lib/mock-data'
import { SearchInput } from '@/components/ui/SearchInput'

const PRESET_CATEGORIES = ['Молоко', 'Крупа', 'Мясо и рыба', 'Овощи', 'Фрукты', 'Соусы', 'Выпечка', 'Прочее']

const EMPTY: Omit<IngredientRef, 'id'> = {
  name: '',
  unit: 'г',
  caloriesPer100: 0,
  proteinPer100: 0,
  fatPer100: 0,
  carbsPer100: 0,
  category: 'Прочее',
}

type BarcodeStatus = 'idle' | 'loading' | 'not_found' | 'error'

export default function IngredientsPage() {
  const [libraries, setLibraries] = useState<IngredientLibrary[]>([])
  const [activeLibId, setActiveLibId] = useState<string>(MY_LIBRARY_ID)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [adding, setAdding] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isCustomCategory, setIsCustomCategory] = useState(false)

  const [barcodeMode, setBarcodeMode] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeStatus, setBarcodeStatus] = useState<BarcodeStatus>('idle')

  useEffect(() => {
    const libs = initLibraries(systemLibraries)
    setLibraries(libs)
    setActiveLibId(MY_LIBRARY_ID)
  }, [])

  const activeLib = libraries.find(l => l.id === activeLibId) ?? null
  const ingredients = activeLib?.ingredients ?? []
  const isSystem = activeLib?.isSystem ?? false

  function saveIngredients(updated: IngredientRef[]) {
    saveLibraryIngredients(activeLibId, updated)
    setLibraries(libs => libs.map(l =>
      l.id === activeLibId ? { ...l, ingredients: updated } : l
    ))
  }

  function handleAdd() {
    if (!form.name.trim()) return
    const newIng: IngredientRef = { ...form, id: crypto.randomUUID() }
    saveIngredients([...ingredients, newIng])
    setForm({ ...EMPTY })
    setAdding(false)
    setIsCustomCategory(false)
  }

  function handleUpdate() {
    if (!editingId || !form.name.trim()) return
    saveIngredients(ingredients.map(i => i.id === editingId ? { ...form, id: editingId } : i))
    setEditingId(null)
    setIsCustomCategory(false)
  }

  function handleDelete(id: string) {
    saveIngredients(ingredients.filter(i => i.id !== id))
    setConfirmDeleteId(null)
  }

  function startEdit(ing: IngredientRef) {
    setEditingId(ing.id)
    const cat = ing.category ?? 'Прочее'
    setIsCustomCategory(!PRESET_CATEGORIES.includes(cat))
    setForm({
      name: ing.name,
      unit: ing.unit,
      caloriesPer100: ing.caloriesPer100,
      proteinPer100: ing.proteinPer100,
      fatPer100: ing.fatPer100,
      carbsPer100: ing.carbsPer100,
      category: cat,
    })
  }

  function cancelForm() {
    setAdding(false)
    setEditingId(null)
    setIsCustomCategory(false)
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
      const name: string =
        p.product_name_ru || p.product_name || p.abbreviated_product_name || ''
      setForm({
        name: name.trim(),
        unit: 'г',
        caloriesPer100: Math.round(n['energy-kcal_100g'] ?? n['energy_100g'] ?? 0),
        proteinPer100: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
        fatPer100: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
        carbsPer100: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
        category: 'Прочее',
      })
      setBarcodeStatus('idle')
      setBarcodeMode(false)
      setBarcodeInput('')
      setAdding(true)
      setEditingId(null)
      setIsCustomCategory(false)
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

  return (
    <div className="flex flex-col md:flex-row h-full">

      {/* ── Библиотеки: горизонтальный скролл на мобильном, вертикальная панель на десктопе ── */}
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
            onClick={() => { setActiveLibId(lib.id); setAdding(false); setEditingId(null); setSearch('') }}
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

      {/* ── Содержимое библиотеки ── */}
      <div className="flex-1 p-4 sm:p-8 overflow-y-auto">

        {/* Заголовок */}
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
                onClick={() => { setAdding(true); setEditingId(null); setForm({ ...EMPTY }); setIsCustomCategory(false); setBarcodeMode(false) }}
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

        {/* Штрихкод */}
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

        {/* Форма добавления / редактирования */}
        {!isSystem && (adding || editingId) && (
          <div className="rounded-2xl p-4 sm:p-5 mb-6"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.5)' }}>
            <p className="text-sm font-medium mb-4" style={{ color: '#2C2950' }}>
              {editingId ? 'Редактировать ингредиент' : 'Новый ингредиент'}
            </p>

            {/* Строка 1 — название, категория, единица */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_80px] gap-3 mb-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#6B6490' }}>Название *</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Молоко классическое"
                  className="h-11 px-3 rounded-xl text-sm outline-none"
                  style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#6B6490' }}>Категория</label>
                {isCustomCategory ? (
                  <div className="flex gap-1">
                    <input
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      placeholder="Название категории"
                      className="flex-1 h-11 px-2 rounded-xl text-sm outline-none"
                      style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                    />
                    <button
                      onClick={() => { setIsCustomCategory(false); setForm(f => ({ ...f, category: 'Прочее' })) }}
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#9D99B8' }}
                    >✕</button>
                  </div>
                ) : (
                  <select
                    value={form.category}
                    onChange={e => {
                      if (e.target.value === '__custom__') {
                        setIsCustomCategory(true)
                        setForm(f => ({ ...f, category: '' }))
                      } else {
                        setForm(f => ({ ...f, category: e.target.value }))
                      }
                    }}
                    className="h-11 px-2 rounded-xl text-sm outline-none"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                  >
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option disabled>──────────</option>
                    <option value="__custom__">+ Создать категорию...</option>
                  </select>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#6B6490' }}>Единица</label>
                <select
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value as 'г' | 'мл' }))}
                  className="h-11 px-2 rounded-xl text-sm outline-none"
                  style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                >
                  <option value="г">г</option>
                  <option value="мл">мл</option>
                </select>
              </div>
            </div>

            {/* Строка 2 — КБЖУ на 100 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {([
                { key: 'caloriesPer100', label: `Ккал / 100 ${form.unit}` },
                { key: 'proteinPer100', label: 'Белки г' },
                { key: 'fatPer100', label: 'Жиры г' },
                { key: 'carbsPer100', label: 'Углеводы г' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#6B6490' }}>{label}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                    placeholder="0"
                    className="h-11 px-3 rounded-xl text-sm outline-none text-center"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                disabled={!form.name.trim()}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: form.name.trim() ? '#B0A6DF' : '#C8C3F0',
                  color: '#2C2950',
                }}
              >
                {editingId ? 'Сохранить' : 'Добавить'}
              </button>
              <button
                onClick={cancelForm}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm"
                style={{ background: '#FEFEF2', color: '#6B6490' }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Поиск */}
        <div className="mb-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Поиск ингредиента..."
          />
        </div>

        {/* Пустое состояние */}
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

        {/* Список по категориям */}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-6">
            <p className="text-xs font-medium uppercase tracking-wider mb-2"
              style={{ color: '#9D99B8' }}>
              {cat}
            </p>

            {/* Desktop: таблица с шапкой */}
            <div className="hidden sm:block">
              <div className="grid gap-3 px-4 py-2 text-xs rounded-xl mb-1"
                style={{
                  color: '#9D99B8',
                  gridTemplateColumns: isSystem ? '1fr 80px 80px 60px 60px 70px' : '1fr 80px 80px 60px 60px 70px 72px',
                  background: '#EAE7F8',
                }}>
                <span>Название</span>
                <span>Единица</span>
                <span>Калории</span>
                <span>Белки</span>
                <span>Жиры</span>
                <span>Углеводы</span>
                {!isSystem && <span></span>}
              </div>

              {items.map(ing => (
                <div key={ing.id}>
                  {editingId !== ing.id && (
                    <div
                      className="grid gap-3 px-4 py-2.5 rounded-xl items-center"
                      style={{
                        gridTemplateColumns: isSystem ? '1fr 80px 80px 60px 60px 70px' : '1fr 80px 80px 60px 60px 70px 72px',
                        borderBottom: '0.5px solid rgba(176,166,223,0.15)',
                      }}
                    >
                      <span className="text-sm font-medium truncate" style={{ color: '#2C2950' }}>{ing.name}</span>
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
                            onEdit={startEdit}
                            onConfirmDelete={setConfirmDeleteId}
                            onDelete={handleDelete}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile: карточки */}
            <div className="sm:hidden flex flex-col gap-2">
              {items.map(ing => (
                editingId !== ing.id && (
                  <div key={ing.id} className="rounded-xl p-3"
                    style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.2)' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-medium" style={{ color: '#2C2950' }}>{ing.name}</span>
                      {!isSystem && (
                        <div className="flex items-center gap-1 shrink-0">
                          <IngredientActions
                            ing={ing}
                            confirmDeleteId={confirmDeleteId}
                            onEdit={startEdit}
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
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
