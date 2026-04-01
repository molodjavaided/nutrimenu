'use client'

import { useEffect, useState } from 'react'
import { IngredientRef } from '@/types'
import { getIngredients, saveIngredients } from '@/lib/store'

const CATEGORIES = ['Молоко', 'Крупа', 'Мясо и рыба', 'Овощи', 'Фрукты', 'Соусы', 'Выпечка', 'Прочее']

const EMPTY: Omit<IngredientRef, 'id'> = {
  name: '',
  unit: 'г',
  caloriesPer100: 0,
  proteinPer100: 0,
  fatPer100: 0,
  carbsPer100: 0,
  category: 'Прочее',
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<IngredientRef[]>([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [adding, setAdding] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    setIngredients(getIngredients())
  }, [])

  function save(updated: IngredientRef[]) {
    setIngredients(updated)
    saveIngredients(updated)
  }

  function handleAdd() {
    if (!form.name.trim()) return
    const newIng: IngredientRef = { ...form, id: crypto.randomUUID() }
    save([...ingredients, newIng])
    setForm({ ...EMPTY })
    setAdding(false)
  }

  function handleUpdate() {
    if (!editingId || !form.name.trim()) return
    save(ingredients.map(i => i.id === editingId ? { ...form, id: editingId } : i))
    setEditingId(null)
  }

  function handleDelete(id: string) {
    save(ingredients.filter(i => i.id !== id))
    setConfirmDeleteId(null)
  }

  function startEdit(ing: IngredientRef) {
    setEditingId(ing.id)
    setForm({
      name: ing.name,
      unit: ing.unit,
      caloriesPer100: ing.caloriesPer100,
      proteinPer100: ing.proteinPer100,
      fatPer100: ing.fatPer100,
      carbsPer100: ing.carbsPer100,
      category: ing.category ?? 'Прочее',
    })
  }

  const filtered = ingredients.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  // Группируем по категории
  const grouped = CATEGORIES.reduce<Record<string, IngredientRef[]>>((acc, cat) => {
    const items = filtered.filter(i => (i.category ?? 'Прочее') === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="p-8 max-w-4xl">

      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium mb-1" style={{ color: '#2C2950' }}>
            Справочник ингредиентов
          </h1>
          <p className="text-sm" style={{ color: '#6B6490' }}>
            {ingredients.length} ингредиентов · КБЖУ на 100 г / 100 мл
          </p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditingId(null); setForm({ ...EMPTY }) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: '#B0A6DF', color: '#2C2950' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Добавить ингредиент
        </button>
      </div>

      {/* Форма добавления / редактирования */}
      {(adding || editingId) && (
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
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="h-10 px-2 rounded-xl text-sm outline-none"
                style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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
              onClick={() => { setAdding(false); setEditingId(null) }}
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
            Справочник пуст
          </p>
          <p className="text-sm" style={{ color: '#9D99B8' }}>
            Добавьте первый ингредиент чтобы начать
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
              gridTemplateColumns: '1fr 80px 80px 60px 60px 70px 72px',
              background: '#EAE7F8',
            }}>
            <span>Название</span>
            <span>Единица</span>
            <span>Калории</span>
            <span>Белки</span>
            <span>Жиры</span>
            <span>Углеводы</span>
            <span></span>
          </div>

          {items.map(ing => (
            <div key={ing.id}>
              {editingId === ing.id ? null : (
                <div
                  className="grid gap-3 px-4 py-2.5 rounded-xl items-center"
                  style={{
                    gridTemplateColumns: '1fr 80px 80px 60px 60px 70px 72px',
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
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}