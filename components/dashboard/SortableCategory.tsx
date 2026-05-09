'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Category } from '@/types'
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton'
import SortableItem from './SortableItem'

interface Props {
  category: Category
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onDeleteItem: (categoryId: string, itemId: string) => void
  onReorderItems: (categoryId: string, activeId: string, overId: string) => void
}

export default function SortableCategory({
  category,
  onRename,
  onDelete,
  onDeleteItem,
  onReorderItems,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [expanded, setExpanded] = useState(true)

  const sensors = useSensors(useSensor(PointerSensor))

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function handleRename() {
    if (name.trim()) onRename(category.id, name.trim())
    setEditing(false)
  }

  function handleDragEndItems(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onReorderItems(category.id, String(active.id), String(over.id))
  }

  const rawItems = category.items ?? []
  // Guard against duplicate IDs from corrupt localStorage data
  const seenItemIds = new Set<string>()
  const items = rawItems.filter(i => {
    if (seenItemIds.has(i.id)) return false
    seenItemIds.add(i.id)
    return true
  })

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '0.5px solid rgba(176,166,223,0.3)', background: '#FEFEF2' }}
      >
        {/* Заголовок категории */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ background: '#EAE7F8', borderBottom: expanded ? '0.5px solid rgba(176,166,223,0.3)' : 'none' }}
        >
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing shrink-0"
            style={{ color: '#9D99B8', touchAction: 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 4h1M5 8h1M5 12h1M10 4h1M10 8h1M10 12h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Название */}
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setName(category.name); setEditing(false) } }}
              className="flex-1 bg-transparent text-sm font-medium outline-none"
              style={{ color: '#2C2950', borderBottom: '1px solid #B0A6DF' }}
            />
          ) : (
            <span
              className="flex-1 text-sm font-medium cursor-pointer"
              style={{ color: '#2C2950' }}
              onClick={() => setExpanded(e => !e)}
            >
              {category.name}
              <span className="ml-2 text-xs font-normal" style={{ color: '#9D99B8' }}>
                {items.length} позиций
              </span>
            </span>
          )}

          {/* Кнопки */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: '#6B6490' }}
              title="Переименовать"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
            </button>

            <ConfirmDeleteButton onConfirm={() => onDelete(category.id)} title="Удалить категорию" />

            <button
              onClick={() => setExpanded(e => !e)}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ color: '#9D99B8' }}
            >
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Список блюд */}
        {expanded && (
          <div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndItems}
            >
              <SortableContext
                items={items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map(item => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    categoryId={category.id}
                    onDelete={() => onDeleteItem(category.id, item.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Добавить блюдо в категорию */}
            <div className="px-4 py-2.5">
              <Link
                href={`/dashboard/item/new?categoryId=${category.id}`}
                className="flex items-center gap-2 text-sm transition-all"
                style={{ color: '#B0A6DF' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Добавить блюдо
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}