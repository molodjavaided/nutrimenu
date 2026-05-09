'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MenuItem } from '@/types'
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton'

interface Props {
  item: MenuItem
  categoryId: string
  onDelete: () => void
}

export default function SortableItem({ item, categoryId, onDelete }: Props) {
  const [available, setAvailable] = useState(item.isAvailable)
  const [toggling, setToggling] = useState(false)

  async function toggleAvailable() {
    if (toggling) return
    setToggling(true)
    const next = !available
    setAvailable(next)
    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, isAvailable: next }),
    }).catch(() => setAvailable(!next))
    setToggling(false)
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    borderBottom: '0.5px solid rgba(176,166,223,0.15)',
  }

  const hasVariants = (item.variantGroups?.length ?? 0) > 0
  const hasModifiers = (item.modifierGroups?.length ?? 0) > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0"
        style={{ color: '#C8C3F0', touchAction: 'none' }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M5 4h1M5 8h1M5 12h1M10 4h1M10 8h1M10 12h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Инфо */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: '#2C2950' }}>
            {item.name}
          </span>
          {hasVariants && (
            <span className="text-xs px-1.5 py-0.5 rounded-md shrink-0"
              style={{ background: '#EAE7F8', color: '#534AB7' }}>
              варианты
            </span>
          )}
          {hasModifiers && (
            <span className="text-xs px-1.5 py-0.5 rounded-md shrink-0"
              style={{ background: '#FFF8D6', color: '#635200' }}>
              добавки
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: '#9D99B8' }}>
            {item.calories} ккал · {item.weight} {item.weightUnit}
          </span>
          {!available && (
            <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              скрыто
            </span>
          )}
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={toggleAvailable}
          disabled={toggling}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity"
          style={{ color: available ? '#22C55E' : '#9D99B8' }}
          title={available ? 'Скрыть от гостей' : 'Показать гостям'}
        >
          {available ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
              <path d="M2 2l10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        <Link
          href={`/dashboard/item/${item.id}?categoryId=${categoryId}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ color: '#6B6490' }}
          title="Редактировать"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        </Link>

        <ConfirmDeleteButton onConfirm={onDelete} />
      </div>
    </div>
  )
}