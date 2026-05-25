'use client'

import { useState } from 'react'
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
import { motion, AnimatePresence } from 'motion/react'
import { Category } from '@/types'
import SortableCategory from '@/components/dashboard/SortableCategory'
import ImportModal from '@/components/dashboard/ImportModal'
import { GlassCard, GlassButton, GlassInput, GlassDashedButton } from '@/components/ui-kit'
import {
  useCategoriesQuery,
  useCreateCategory,
  useRenameCategory,
  useDeleteCategory,
  useDeleteItem,
  useReorderItems,
  useReorderCategories,
  useInvalidateCategories,
} from '@/lib/queries/menu-client'

const PRESET_CATEGORIES = ['Завтраки', 'Обеды', 'Десерты', 'Напитки', 'Закуски', 'Салаты']

export default function MenuClient({ initialCategories }: { initialCategories: unknown[] }) {
  const { data: categories = [] } = useCategoriesQuery(initialCategories as Category[])
  const createCat = useCreateCategory()
  const renameCat = useRenameCategory()
  const deleteCat = useDeleteCategory()
  const deleteItem = useDeleteItem()
  const reorderItems = useReorderItems()
  const reorderCats = useReorderCategories()
  const invalidate = useInvalidateCategories()

  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function createCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    await createCat.mutateAsync({ tempId: `temp-${Date.now()}`, name: trimmed })
  }

  async function handleAddCategory() {
    await createCategory(newCatName)
    setNewCatName('')
    setAddingCat(false)
  }

  function handleRenameCategory(id: string, name: string) {
    renameCat.mutate({ id, name })
  }

  function handleDeleteCategory(id: string) {
    deleteCat.mutate({ id })
  }

  function handleDeleteItem(categoryId: string, itemId: string) {
    deleteItem.mutate({ categoryId, itemId })
  }

  function handleReorderItems(categoryId: string, activeId: string, overId: string) {
    const cat = categories.find(c => c.id === categoryId)
    if (!cat) return
    const items = cat.items ?? []
    const oldIndex = items.findIndex(i => i.id === activeId)
    const newIndex = items.findIndex(i => i.id === overId)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(items, oldIndex, newIndex)
    reorderItems.mutate({ categoryId, items: reordered })
  }

  function handleDragEndCategories(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = categories.findIndex(c => c.id === active.id)
    const newIndex = categories.findIndex(c => c.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(categories, oldIndex, newIndex).map((c, i) => ({ ...c, order: i }))
    reorderCats.mutate({ categories: reordered })
  }

  const hasCategories = categories.length > 0

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
            invalidate()
            setShowImport(false)
          }}
        />
      )}

      {/* Empty state с пресетами */}
      {!hasCategories && (
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

          <div className="flex flex-wrap gap-2 mb-4 mt-4">
            {PRESET_CATEGORIES.map(name => (
              <button
                key={name}
                onClick={() => createCategory(name)}
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
            <AnimatePresence initial={false}>
              {categories.map(cat => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <SortableCategory
                    category={cat}
                    onRename={handleRenameCategory}
                    onDelete={handleDeleteCategory}
                    onDeleteItem={handleDeleteItem}
                    onDuplicateItem={invalidate}
                    onReorderItems={handleReorderItems}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>

      {/* Добавить категорию */}
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
