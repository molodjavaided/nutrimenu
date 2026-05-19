'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

const PRESET_CATEGORIES = ['Завтраки', 'Обеды', 'Десерты', 'Напитки', 'Закуски', 'Салаты']

export default function MenuPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onboardingActive = onboardingStep === 2

  async function loadCategories() {
    const res = await fetch('/api/categories')
    if (res.ok) setCategories(await res.json())
  }

  useEffect(() => {
    loadCategories()
    fetch('/api/user/onboarding')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setOnboardingStep(data.step) })
      .catch(() => {})
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
    if (onboardingActive) await advanceFromMenu()
  }

  async function handlePresetClick(name: string) {
    const cat = await createCategory(name)
    if (!cat) return
    if (onboardingActive) await advanceFromMenu()
  }

  async function advanceFromMenu() {
    await fetch('/api/user/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'next' }),
    })
    setTimeout(() => router.push('/dashboard/item/new'), 500)
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

      {/* Onboarding tutorial banner — глава 2 */}
      {onboardingActive && (
        <div
          className="mb-5 rounded-2xl p-4 sm:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(176,166,223,0.12))',
            border: '0.5px solid rgba(139,92,246,0.3)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl shrink-0">📂</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: '#5B21B6' }}>
                Шаг 2 из 4 — Категории
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Категории — это разделы вашего меню, как страницы в бумажной карточке: Завтраки, Напитки, Десерты.
                Создайте первую — потом сразу перейдём к блюду.
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Empty state с пресетами — когда категорий ещё нет */}
      {!hasCategories && (
        <div
          className="rounded-2xl p-5 sm:p-7 mb-4"
          style={{
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '0.5px solid rgba(176,166,223,0.4)',
            boxShadow: '0 8px 24px rgba(139,92,246,0.08)',
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">📂</div>
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
                className="px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
                style={{
                  background: 'rgba(139,92,246,0.08)',
                  color: '#7C3AED',
                  border: '0.5px solid rgba(139,92,246,0.25)',
                }}
              >
                + {name}
              </button>
            ))}
          </div>

          {/* Ручной ввод */}
          <div className="flex items-center gap-2">
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCategory() }}
              placeholder="Свой вариант..."
              className="flex-1 h-10 px-3 rounded-xl text-sm outline-none"
              style={{
                background: '#EAE7F8',
                border: '0.5px solid rgba(176,166,223,0.5)',
                color: 'var(--color-text-primary)',
              }}
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
              className="px-4 h-10 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
              style={{
                background: newCatName.trim() ? '#B0A6DF' : 'rgba(176,166,223,0.3)',
                color: 'var(--color-text-primary)',
                cursor: newCatName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Добавить
            </button>
          </div>
        </div>
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
            <input
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
      )}
    </div>
  )
}
