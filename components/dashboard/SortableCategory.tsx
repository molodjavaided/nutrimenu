'use client'

import { useEffect, useState } from 'react'
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
import { GlassCard, GlassInput, NutriPill } from '@/components/ui-kit'
import SortableItem from './SortableItem'

interface Props {
  category: Category
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onDeleteItem: (categoryId: string, itemId: string) => void
  onDuplicateItem: () => void
  onReorderItems: (categoryId: string, activeId: string, overId: string) => void
}

export default function SortableCategory({
  category,
  onRename,
  onDelete,
  onDeleteItem,
  onDuplicateItem,
  onReorderItems,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  // Default expanded; restored from localStorage after mount to avoid SSR hydration mismatch.
  const [expanded, setExpanded] = useState(true)

  const collapseKey = `nm-cat-collapsed:${category.id}`

  useEffect(() => {
    if (localStorage.getItem(collapseKey) === '1') setExpanded(false)
  }, [collapseKey])

  function toggleExpanded() {
    setExpanded(prev => {
      const next = !prev
      if (next) localStorage.removeItem(collapseKey)
      else localStorage.setItem(collapseKey, '1')
      return next
    })
  }

  const sensors = useSensors(useSensor(PointerSensor))

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const dragStyle = {
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
    <div ref={setNodeRef} style={dragStyle}>
      <GlassCard tone="solid" padding="none" className="overflow-hidden">
        {/* Заголовок категории */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            background: 'rgba(176,166,223,0.18)',
            borderBottom: expanded ? '0.5px solid rgba(139,92,246,0.18)' : 'none',
          }}
        >
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing shrink-0"
            style={{ color: 'var(--color-text-muted)', touchAction: 'none' }}
            aria-label="Перетащить категорию"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 4h1M5 8h1M5 12h1M10 4h1M10 8h1M10 12h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Название */}
          {editing ? (
            <GlassInput
              inputSize="sm"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setName(category.name); setEditing(false) }
              }}
              className="flex-1"
            />
          ) : (
            <button
              type="button"
              onClick={toggleExpanded}
              className="flex-1 flex items-center gap-2 text-left min-w-0"
            >
              <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                {category.name}
              </span>
              <NutriPill tone="neutral" size="xs">{items.length}</NutriPill>
            </button>
          )}

          {/* Кнопки */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95"
              style={{ color: 'var(--color-text-secondary)' }}
              title="Переименовать"
              aria-label="Переименовать категорию"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </button>

            <ConfirmDeleteButton onConfirm={() => onDelete(category.id)} title="Удалить категорию" />

            <button
              onClick={toggleExpanded}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label={expanded ? 'Свернуть' : 'Развернуть'}
            >
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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
                    onDuplicate={onDuplicateItem}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Добавить блюдо в категорию */}
            <Link
              href={`/dashboard/item/new?categoryId=${category.id}`}
              className="flex items-center gap-2 px-4 py-3 text-sm transition-all active:scale-[0.99]"
              style={{ color: '#7C3AED', borderTop: '0.5px solid rgba(139,92,246,0.12)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Добавить блюдо
            </Link>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
