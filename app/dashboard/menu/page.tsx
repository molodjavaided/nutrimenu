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

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
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
  }

  useEffect(() => { loadCategories() }, []) // eslint-disable-line react-hooks/set-state-in-effect

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim() }),
    })
    if (res.ok) {
      const cat = await res.json()
      setCategories(prev => [...prev, cat])
    }
    setNewCatName('')
    setAddingCat(false)
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

  return (
    <div className="p-4 sm:p-8">

      {/* Заголовок */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-medium mb-1 truncate" style={{ color: 'var(--color-text-primary)' }}>Меню</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {categories.length} категорий · {categories.reduce((s, c) => s + (c.items?.length ?? 0), 0)} позиций
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{
              background: 'rgba(176,166,223,0.2)',
              border: '0.5px solid rgba(176,166,223,0.5)',
              color: 'var(--color-text-primary)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 12h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">Импорт</span>
          </button>
          <Link
            href="/dashboard/item/new"
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#B0A6DF', color: 'var(--color-text-primary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="hidden sm:inline">Добавить блюдо</span>
            <span className="sm:hidden">Добавить</span>
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

      {/* Добавить категорию */}
      <div className="mt-4">
        {addingCat ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCategory()
                if (e.key === 'Escape') setAddingCat(false)
              }}
              placeholder="Название категории..."
              className="flex-1 h-10 px-3 rounded-xl text-sm outline-none"
              style={{
                background: '#EAE7F8',
                border: '0.5px solid rgba(176,166,223,0.5)',
                color: 'var(--color-text-primary)',
              }}
            />
            <button
              onClick={handleAddCategory}
              className="px-4 h-10 rounded-xl text-sm font-medium"
              style={{ background: '#B0A6DF', color: 'var(--color-text-primary)' }}
            >
              Добавить
            </button>
            <button
              onClick={() => setAddingCat(false)}
              className="px-4 h-10 rounded-xl text-sm"
              style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
            >
              Отмена
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingCat(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all"
            style={{
              background: 'transparent',
              border: '0.5px dashed rgba(176,166,223,0.6)',
              color: 'var(--color-text-secondary)',
              width: '100%',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Добавить категорию
          </button>
        )}
      </div>
    </div>
  )
}
