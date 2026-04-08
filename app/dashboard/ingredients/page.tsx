'use client'

import { useEffect, useState } from 'react'
import { IngredientLibrary, IngredientRef } from '@/types'
import { getLibraries, saveLibraryIngredients, initLibraries, MY_LIBRARY_ID } from '@/lib/store'
import { systemLibraries } from '@/lib/mock-data'

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

  // Barcode lookup
  const [barcodeMode, setBarcodeMode] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeStatus, setBarcodeStatus] = useState<BarcodeStatus>('idle')

  useEffect(() => {
    const libs = initLibraries(systemLibraries)
    setLibraries(libs)
    // Default to personal library
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
    <div className="flex gap-0 h-full">

      {/* ─── Левая панель: список библиотек ─────────────────── */}
      <div
        className="w-56 shrink-0 flex flex-col gap-1 pt-8 pb-6 pr-2 border-r"
        style={{ borderColor: 'rgba(176,166,223,0.25)' }}
      >
        <p className="text-xs font-medium uppercase tracking-wider px-3 mb-2" style={{ color: '#9D99B8' }}>
          Библиотеки
        </p>

        {libraries.map(lib => (
          <button
            key={lib.id}
            onClick={() => { setActiveLibId(lib.id); setAdding(false); setEditingId(null); setSearch('') }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left w-full transition-colors"
            style={{
              background: activeLibId === lib.id ? '#EAE7F8' : 'transparent',
              color: activeLibId === lib.id ? '#2C2950' : '#6B6490',
              fontWeight: activeLibId === lib.id ? 500 : 400,
            }}
          >
            {lib.isSystem ? (
              /* Иконка системной библиотеки — замок */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
                <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            ) : (
              /* Иконка личной библиотеки — стопка */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
                <path d="M2 10.5h10M2 7.5h10M2 4.5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            )}
            <span className="truncate">{lib.name}</span>
            <span className="ml-auto text-xs shrink-0" style={{ color: '#9D99B8' }}>
              {lib.ingredients.length}
            </span>
          </button>
        ))}
      </div>

      {/* ─── Правая панель: содержимое библиотеки ────────────── */}
      <div className="flex-1 p-8 max-w-4xl overflow-y-auto">

        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-medium" style={{ color: '#2C2950' }}>
                {activeLib?.name ?? ''}
              </h1>
              {isSystem && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#EAE7F8', color: '#B0A6DF' }}
                >
                  Системная
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: '#6B6490' }}>
              {ingredients.length} ингредиентов · КБЖУ на 100 г / 100 мл
              {isSystem && ' · только просмотр'}
            </p>
          </div>

          {!isSystem && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setBarcodeMode(m => !m); setBarcodeInput(''); setBarcodeStatus('idle') }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: barcodeMode ? '#2C2950' : '#EAE7F8',
                  color: barcodeMode ? '#EAE7F8' : '#2C2950',
                }}
              >
                {/* Barcode icon */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 3v10M3 3v10M5 3v10M7 3v6M9 3v10M11 3v10M13 3v6M7 11v2M10 9h3v4h-3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                По штрихкоду
              </button>
              <button
                onClick={() => { setAdding(true); setEditingId(null); setForm({ ...EMPTY }); setIsCustomCategory(false); setBarcodeMode(false) }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#B0A6DF', color: '#2C2950' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Добавить ингредиент
              </button>
            </div>
          )}
        </div>

        {/* Панель поиска по штрихкоду */}
        {!isSystem && barcodeMode && (
          <div className="rounded-2xl p-5 mb-6"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.5)' }}>
            <p className="text-sm font-medium mb-1" style={{ color: '#2C2950' }}>
              Поиск по штрихкоду
            </p>
            <p className="text-xs mb-4" style={{ color: '#9D99B8' }}>
              Введите штрихкод с упаковки — данные о КБЖУ заполнятся автоматически из открытой базы продуктов
            </p>
            <div className="flex gap-2 items-start">
              <div className="flex flex-col gap-1 flex-1 max-w-xs">
                <input
                  autoFocus
                  value={barcodeInput}
                  onChange={e => { setBarcodeInput(e.target.value); setBarcodeStatus('idle') }}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeLookup()}
                  placeholder="4630146040576"
                  className="h-10 px-3 rounded-xl text-sm outline-none font-mono"
                  style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                />
                {barcodeStatus === 'not_found' && (
                  <p className="text-xs" style={{ color: '#E24B4A' }}>
                    Товар не найден в базе. Попробуйте другой штрихкод или добавьте вручную.
                  </p>
                )}
                {barcodeStatus === 'error' && (
                  <p className="text-xs" style={{ color: '#E24B4A' }}>
                    Ошибка сети. Проверьте подключение и попробуйте снова.
                  </p>
                )}
              </div>
              <button
                onClick={handleBarcodeLookup}
                disabled={!barcodeInput.trim() || barcodeStatus === 'loading'}
                className="h-10 px-5 rounded-xl text-sm font-medium flex items-center gap-2"
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
                className="h-10 px-3 rounded-xl text-sm"
                style={{ background: '#FEFEF2', color: '#6B6490' }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Форма добавления / редактирования (только для личной библиотеки) */}
        {!isSystem && (adding || editingId) && (
          <div className="rounded-2xl p-5 mb-6"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.5)' }}>
            <p className="text-sm font-medium mb-4" style={{ color: '#2C2950' }}>
              {editingId ? 'Редактировать ингредиент' : 'Новый ингредиент'}
            </p>

            {/* Строка 1 — название, категория, единица */}
            <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: '1fr 160px 80px' }}>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#6B6490' }}>Название *</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Молоко классическое"
                  className="h-10 px-3 rounded-xl text-sm outline-none"
                  style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#6B6490' }}>Категория</label>
                {isCustomCategory ? (
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      placeholder="Название категории"
                      className="flex-1 h-10 px-2 rounded-xl text-sm outline-none"
                      style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                    />
                    <button
                      onClick={() => { setIsCustomCategory(false); setForm(f => ({ ...f, category: 'Прочее' })) }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#9D99B8' }}
                      title="Вернуться к списку"
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
                    className="h-10 px-2 rounded-xl text-sm outline-none"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                  >
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option disabled style={{ color: '#C8C3F0' }}>──────────</option>
                    <option value="__custom__">+ Создать категорию...</option>
                  </select>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#6B6490' }}>Единица</label>
                <select
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value as 'г' | 'мл' }))}
                  className="h-10 px-2 rounded-xl text-sm outline-none"
                  style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                >
                  <option value="г">г</option>
                  <option value="мл">мл</option>
                </select>
              </div>
            </div>

            {/* Строка 2 — КБЖУ на 100 */}
            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
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
                    value={form[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                    placeholder="0"
                    className="h-10 px-3 rounded-xl text-sm outline-none text-center"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                disabled={!form.name.trim()}
                className="px-5 py-2 rounded-xl text-sm font-medium"
                style={{
                  background: form.name.trim() ? '#B0A6DF' : '#C8C3F0',
                  color: '#2C2950',
                }}
              >
                {editingId ? 'Сохранить' : 'Добавить'}
              </button>
              <button
                onClick={cancelForm}
                className="px-5 py-2 rounded-xl text-sm"
                style={{ background: '#FEFEF2', color: '#6B6490' }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Поиск */}
        <div className="flex items-center gap-2 px-3 h-10 rounded-xl mb-6"
          style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="#9D99B8" strokeWidth="1.3"/>
            <path d="M11 11L14 14" stroke="#9D99B8" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск ингредиента..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#2C2950' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: '#9D99B8' }}>✕</button>
          )}
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

        {/* Таблица по категориям */}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-6">
            <p className="text-xs font-medium uppercase tracking-wider mb-2"
              style={{ color: '#9D99B8' }}>
              {cat}
            </p>

            {/* Шапка */}
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
                {editingId === ing.id ? null : (
                  <div
                    className="grid gap-3 px-4 py-2.5 rounded-xl items-center"
                    style={{
                      gridTemplateColumns: isSystem ? '1fr 80px 80px 60px 60px 70px' : '1fr 80px 80px 60px 60px 70px 72px',
                      borderBottom: '0.5px solid rgba(176,166,223,0.15)',
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: '#2C2950' }}>
                      {ing.name}
                    </span>
                    <span className="text-sm" style={{ color: '#6B6490' }}>
                      на 100 {ing.unit}
                    </span>
                    <span className="text-sm" style={{ color: '#534AB7' }}>
                      {ing.caloriesPer100}
                    </span>
                    <span className="text-sm" style={{ color: '#6B6490' }}>
                      {ing.proteinPer100}г
                    </span>
                    <span className="text-sm" style={{ color: '#6B6490' }}>
                      {ing.fatPer100}г
                    </span>
                    <span className="text-sm" style={{ color: '#6B6490' }}>
                      {ing.carbsPer100}г
                    </span>

                    {!isSystem && (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => startEdit(ing)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ color: '#6B6490', background: '#EAE7F8' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                            <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {confirmDeleteId === ing.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(ing.id)}
                              className="px-2 h-7 rounded-lg text-xs font-medium"
                              style={{ background: '#E24B4A', color: '#fff' }}
                            >
                              Удалить
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 h-7 rounded-lg text-xs"
                              style={{ background: '#EAE7F8', color: '#6B6490' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(ing.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ color: '#6B6490', background: '#EAE7F8' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                              <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"
                                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
