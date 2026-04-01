'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MenuItem } from '@/types'

interface Props {
  item: MenuItem
  categoryId: string
  onDelete: () => void
}

export default function SortableItem({ item, categoryId, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

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
  }

  const hasVariants = (item.variantGroups?.length ?? 0) > 0
  const hasModifiers = (item.modifierGroups?.length ?? 0) > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3"
      css={{ borderBottom: '0.5px solid rgba(176,166,223,0.15)' }}
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
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex items-center gap-1 shrink-0">
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

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="px-2 h-7 rounded-lg text-xs font-medium"
              style={{ background: '#E24B4A', color: '#fff' }}
            >
              Удалить
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 h-7 rounded-lg text-xs"
              style={{ background: '#EAE7F8', color: '#6B6490' }}
            >
              Отмена
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: '#6B6490' }}
            title="Удалить"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}