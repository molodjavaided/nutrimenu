'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MenuItem } from '@/types'
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton'
import { NutritionGrid } from '@/components/ui/NutritionGrid'

interface Props {
  item: MenuItem
  categoryId: string
  onDelete: () => void
  onDuplicate: () => void
}

export default function SortableItem({ item, categoryId, onDelete, onDuplicate }: Props) {
  const [available, setAvailable] = useState(item.isAvailable)
  const [toggling, setToggling] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleDuplicate() {
    if (duplicating) return
    setDuplicating(true)
    try {
      const res = await fetch(`/api/items/${item.id}/duplicate`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        alert(err?.error ?? 'Не удалось дублировать')
        return
      }
      onDuplicate()
    } finally {
      setDuplicating(false)
    }
  }

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
    borderBottom: '0.5px solid rgba(139,92,246,0.10)',
  }

  const photoPosition = item.photoPosition ?? 'center'

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 px-3 py-3">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0 self-center"
        style={{ color: '#C8C3F0', touchAction: 'none' }}
        aria-label="Перетащить"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M5 4h1M5 8h1M5 12h1M10 4h1M10 8h1M10 12h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Glass-фото 56×56 — тот же визуальный код, что у гостя в DishCard */}
      <Link
        href={`/dashboard/item/${item.id}?categoryId=${categoryId}`}
        className="relative w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-2xl overflow-hidden self-center"
        style={{
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '0.5px solid rgba(255,255,255,0.55)',
          opacity: available ? 1 : 0.5,
        }}
        aria-label="Редактировать"
      >
        {item.photo
          ? <Image src={item.photo} alt={item.name} fill className="object-cover" sizes="56px" style={{ objectPosition: photoPosition }} />
          : '🍽️'
        }
      </Link>

      {/* Инфо: только название + раскрытие КБЖУ. Остальное — на странице блюда. */}
      <div className="flex-1 min-w-0 self-center">
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/item/${item.id}?categoryId=${categoryId}`}
            className="text-sm font-medium truncate hover:underline"
            style={{ color: 'var(--color-text-primary)', opacity: available ? 1 : 0.6 }}
          >
            {item.name}
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-transform active:scale-90"
            style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'none' }}
            aria-label={open ? 'Свернуть КБЖУ' : 'Показать КБЖУ'}
            aria-expanded={open}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {open && (
          <div className="mt-1.5">
            <NutritionGrid nutri={item} />
          </div>
        )}
      </div>

      {/* Toolbar действий */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={toggleAvailable}
          disabled={toggling}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
          style={{ color: available ? '#22C55E' : 'var(--color-text-muted)' }}
          title={available ? 'Скрыть от гостей' : 'Показать гостям'}
          aria-label={available ? 'Скрыть от гостей' : 'Показать гостям'}
        >
          {available ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="1.5" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="1.5" fill="currentColor" />
              <path d="M2 2l10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          )}
        </button>

        <button
          onClick={handleDuplicate}
          disabled={duplicating}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
          style={{ color: 'var(--color-text-secondary)', opacity: duplicating ? 0.5 : 1 }}
          title="Дублировать"
          aria-label="Дублировать"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3.5" y="3.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2.5 9.5V3a1 1 0 011-1H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>

        <Link
          href={`/dashboard/item/${item.id}?categoryId=${categoryId}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
          style={{ color: 'var(--color-text-secondary)' }}
          title="Редактировать"
          aria-label="Редактировать"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </Link>

        <ConfirmDeleteButton onConfirm={onDelete} />
      </div>
    </div>
  )
}
