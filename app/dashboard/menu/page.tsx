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
import {
  getCategories,
  saveCategories,
  addCategory,
  deleteCategory,
  updateCategory,
  reorderCategories,
  deleteItem,
  reorderItems,
} from '@/lib/store'
import SortableCategory from '@/components/dashboard/SortableCategory'

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    setCategories(getCategories())
  }, [])

  function handleAddCategory() {
    if (!newCatName.trim()) return
    const updated = [...categories, {
      id: crypto.randomUUID(),
      name: newCatName.trim(),
      venueId: '1',
      order: categories.length,
      items: [],
    }]
    setCategories(updated)
    saveCategories(updated)
    setNewCatName('')
    setAddingCat(false)
  }

  function handleRenameCategory(id: string, name: string) {
    const updated = categories.map(c => c.id === id ? { ...c, name } : c)
    setCategories(updated)
    saveCategories(updated)
  }

  function handleDeleteCategory(id: string) {
    const updated = categories.filter(c => c.id !== id)
    setCategories(updated)
    saveCategories(updated)
  }

  function handleDeleteItem(categoryId: string, itemId: string) {
    const updated = categories.map(c =>
      c.id === categoryId
        ? { ...c, items: (c.items ?? []).filter(i => i.id !== itemId) }
        : c
    )
    setCategories(updated)
    saveCategories(updated)
  }

  function handleReorderItems(categoryId: string, activeId: string, overId: string) {
    const cat = categories.find(c => c.id === categoryId)
    if (!cat) return
    const items = cat.items ?? []
    const oldIndex = items.findIndex(i => i.id === activeId)
    const newIndex = items.findIndex(i => i.id === overId)
    const reordered = arrayMove(items, oldIndex, newIndex)
    const updated = categories.map(c =>
      c.id === categoryId ? { ...c, items: reordered } : c
    )
    setCategories(updated)
    saveCategories(updated)
  }

  function handleDragEndCategories(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = categories.findIndex(c => c.id === active.id)
    const newIndex = categories.findIndex(c => c.id === over.id)
    const reordered = arrayMove(categories, oldIndex, newIndex)
    setCategories(reordered)
    saveCategories(reordered)
  }

  return (
    <div className="p-8">

      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium mb-1" style={{ color: '#2C2950' }}>Меню</h1>
          <p className="text-sm" style={{ color: '#6B6490' }}>
            {categories.length} категорий · {categories.reduce((s, c) => s + (c.items?.length ?? 0), 0)} позиций
          </p>
        </div>
        <Link
          href="/dashboard/item/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: '#B0A6DF', color: '#2C2950' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Добавить блюдо
        </Link>
      </div>

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
                color: '#2C2950',
              }}
            />
            <button
              onClick={handleAddCategory}
              className="px-4 h-10 rounded-xl text-sm font-medium"
              style={{ background: '#B0A6DF', color: '#2C2950' }}
            >
              Добавить
            </button>
            <button
              onClick={() => setAddingCat(false)}
              className="px-4 h-10 rounded-xl text-sm"
              style={{ background: '#EAE7F8', color: '#6B6490' }}
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
              color: '#6B6490',
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