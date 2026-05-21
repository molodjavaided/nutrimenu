'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Category } from '@/types'
import SortableCategory from '@/components/dashboard/SortableCategory'
import ImportModal from '@/components/dashboard/ImportModal'
import { GlassCard, GlassButton, GlassInput, GlassDashedButton } from '@/components/ui-kit'

const PRESET_CATEGORIES = ['Завтраки', 'Обеды', 'Десерты', 'Напитки', 'Закуски', 'Салаты']

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function loadCategories() {
    const res = await fetch('/api/categories')
    if (res.ok) setCategories(await res.json())
    setLoaded(true)
  }

  useEffect(() => {
    loadCategories()
  }, []) // eslint-disable-line react-hooks/set-state-in-effect

  async function createCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return null
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    if (!res.ok) return null
    const cat = await res.json()
    setCategories(prev => [...prev, cat])
    return cat as Category
  }

  async function handleAddCategory() {
    const cat = await createCategory(newCatName)
    if (!cat) return
    setNewCatName('')
    setAddingCat(false)
  }

  async function handlePresetClick(name: string) {
    await createCategory(name)
  }

  async function handleRenameCategory(id: string, name: string) {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))
    await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  }

  async function handleDeleteCategory(id: string) {
    setCategories(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
  }

  async function handleDeleteItem(categoryId: string, itemId: string) {
    setCategories(prev => prev.map(c =>
      c.id === categoryId ? { ...c, items: (c.items ?? []).filter(i => i.id !== itemId) } : c
    ))
    await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
  }

  async function handleReorderItems(categoryId: string, activeId: string, overId: string) {
    const cat = categories.find(c => c.id === categoryId)
    if (!cat) return
    const items = cat.items ?? []
    const oldIndex = items.findIndex(i => i.id === activeId)
    const newIndex = items.findIndex(i => i.id === overId)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, items: reordered } : c))
    await fetch('/api/items/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reordered.map((item, i) => ({ id: item.id, sortOrder: i }))),
    })
  }

  async function handleDragEndCategories(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = categories.findIndex(c => c.id === active.id)
    const newIndex = categories.findIndex(c => c.id === over.id)
    const reordered = arrayMove(categories, oldIndex, newIndex).map((c, i) => ({ ...c, order: i }))
    setCategories(reordered)
    await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reordered.map((c, i) => ({ id: c.id, sortOrder: i }))),
    })
  }

  const hasCategories = categories.length > 0

  return (
    <div className="p-4 sm:p-8">
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-medium mb-1 truncate" style={{ color: 'var(--color-text-primary)' }}>Меню</h1>
          {loaded ? (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {categories.length} категорий · {categories.reduce((s, c) => s + (c.items?.length ?? 0), 0)} позиций
            </p>
          ) : (
            <div className="h-5 w-40 rounded animate-pulse" style={{ background: 'rgba(139,92,246,0.10)' }} />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GlassButton
            variant="secondary"
            onClick={() => setShowImport(true)}
            leftIcon={
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
                <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 12h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            <span className="hidden sm:inline">Импорт</span>
          </GlassButton>
          <Link href="/dashboard/item/new">
            <GlassButton
              variant="brand"
              data-tour="add-dish"
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              <span className="hidden sm:inline">Добавить блюдо</span>
              <span className="sm:hidden">Добавить</span>
            </GlassButton>
          </Link>
        </div>
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            loadCategories()
            setShowImport(false)
          }}
        />
      )}

      {/* Empty state с пресетами — когда категорий ещё нет */}
      {loaded && !hasCategories && (
        <GlassCard tone="glass" padding="lg" className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(139,92,246,0.10)', color: '#7C3AED' }}
              aria-hidden
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M2.5 6a1.2 1.2 0 0 1 1.2-1.2h4l1.8 1.8h8.8a1.2 1.2 0 0 1 1.2 1.2v9a1.2 1.2 0 0 1-1.2 1.2H3.7A1.2 1.2 0 0 1 2.5 17V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Создайте первую категорию
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Нажмите один из вариантов или введите своё название
              </p>
            </div>
          </div>

          {/* Пресет-чипы */}
          <div className="flex flex-wrap gap-2 mb-4 mt-4">
            {PRESET_CATEGORIES.map(name => (
              <button
                key={name}
                onClick={() => handlePresetClick(name)}
                className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
                style={{
                  background: 'rgba(139,92,246,0.10)',
                  color: '#7C3AED',
                  border: '0.5px solid rgba(139,92,246,0.28)',
                }}
              >
                + {name}
              </button>
            ))}
          </div>

          {/* Ручной ввод */}
          <div className="flex items-center gap-2">
            <GlassInput
              inputSize="md"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCategory() }}
              placeholder="Свой вариант..."
              className="flex-1"
            />
            <GlassButton
              variant="brand"
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
            >
              Добавить
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Список категорий с drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEndCategories}
      >
        <SortableContext
          items={categories.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {categories.map(cat => (
              <SortableCategory
                key={cat.id}
                category={cat}
                onRename={handleRenameCategory}
                onDelete={handleDeleteCategory}
                onDeleteItem={handleDeleteItem}
                onDuplicateItem={loadCategories}
                onReorderItems={handleReorderItems}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Добавить категорию (только если уже есть хотя бы одна — для пустого случая используется empty state выше) */}
      {hasCategories && (
        <div className="mt-4">
          {addingCat ? (
            <div className="flex items-center gap-2">
              <GlassInput
                inputSize="md"
                autoFocus
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddCategory()
                  if (e.key === 'Escape') setAddingCat(false)
                }}
                placeholder="Название категории..."
                className="flex-1"
              />
              <GlassButton variant="brand" onClick={handleAddCategory}>
                Добавить
              </GlassButton>
              <GlassButton variant="secondary" onClick={() => setAddingCat(false)}>
                Отмена
              </GlassButton>
            </div>
          ) : (
            <GlassDashedButton
              fullWidth
              onClick={() => setAddingCat(true)}
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              }
            >
              Добавить категорию
            </GlassDashedButton>
          )}
        </div>
      )}
    </div>
  )
}
