'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { tourBus } from '@/lib/tour/bus'
import IngredientPickerModal from './IngredientPickerModal'
import BasicSection from './item-form/BasicSection'
import CompositionSection from './item-form/CompositionSection'
import DishOptionsModal from './item-form/DishOptionsModal'
import CollapsibleCard from './item-form/CollapsibleCard'
import { useItemFormState } from './item-form/useItemFormState'
import { buildPreviewItem } from './item-form/buildPreviewItem'
import DishSheet from '@/components/menu/DishSheet'
import { GlassButton } from '@/components/ui-kit'
import { useInvalidateIngredients } from '@/lib/queries/menu-client'
import type { ItemFormState } from './item-form/useItemFormState'

export default function ItemForm({ itemId, categoryId: initialCategoryId, redirectAfterSave, demoMode }: { itemId?: string; categoryId?: string; redirectAfterSave?: string; demoMode?: boolean }) {
  const router = useRouter()
  const [tourActive, setTourActive] = useState(false)

  const invalidateIngredients = useInvalidateIngredients()
  const s = useItemFormState({
    itemId,
    initialCategoryId,
    redirectAfterSave,
    onSaved: async () => { tourBus.emit('item-saved') },
  })
  const [previewOpen, setPreviewOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)

  useEffect(() => {
    if (itemId || demoMode) return
    fetch('/api/user/onboarding')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && !data.isCompleted && !data.isDismissed && data.step >= 1) setTourActive(true)
      })
      .catch(() => {})
  }, [itemId, demoMode])

  // ─── Tour prefill: название готово, режим «по сложному %» выбран заранее,
  //     категорию пользователь создаёт сам (открываем поле ввода). ──
  const prefilledRef = useRef(false)
  useEffect(() => {
    if (!tourActive || prefilledRef.current || !s.isReady) return
    prefilledRef.current = true
    if (!s.name) s.setName('Карбонара')
    // mode не префилим: тур ведёт пользователя через CTA-карточки Уровня 2 → 3
    if (!s.categoryId) s.setAddingCategory(true)
  }, [tourActive, s])

  const canSave = !!s.name && !!s.categoryId && (s.mode === 'quick' || s.ingredients.length > 0)
  const canPreview = !!s.name

  return (
    <div className="px-4 py-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-1 text-sm transition-colors active:scale-[0.98]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 3l-4 4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Назад
        </button>

        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {s.isEdit ? 'Редактировать блюдо' : 'Новое блюдо'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {s.isEdit
            ? 'Изменения сразу попадут в гостевое меню'
            : 'Заполните основное — состав и опции по желанию'}
        </p>
      </div>

      {/* ── Уровень 1: основа ─────────────────────────────────────── */}
      <BasicSection s={s} />

      {/* ── Уровень 2: состав — сворачиваемая секция (как Блюдо/Детали) ── */}
      <div className="mb-6">
        <CollapsibleCard
          title="Считать КБЖУ из ингредиентов"
          dataTour="expand-composition"
          summary="Точнее — для ТТК, аллергенов и автообновления при изменении ингредиента"
          open={s.mode !== 'quick'}
          onToggle={() => {
            if (s.mode === 'quick') {
              const hadManualNutri = s.quickCalories > 0 || s.quickProtein > 0 || s.quickFat > 0 || s.quickCarbs > 0
              s.setMode('ttk')
              tourBus.emit('mode-set', 'ttk')
              if (hadManualNutri) {
                toast('КБЖУ теперь считается из состава', {
                  description: 'Прежние ручные значения сохранены — вернутся, если свернёшь этот блок.',
                })
              }
            } else {
              s.setMode('quick')
              tourBus.emit('mode-set', 'quick')
            }
          }}
        >
          <CompositionSection s={s} />
        </CollapsibleCard>
      </div>

      {/* ── Опции для гостя ───────────────────────────────────────── */}
      {s.mode !== 'quick' && (
        <div className="mb-8">
          <DishOptionsChip s={s} onOpen={() => setOptionsOpen(true)} />
        </div>
      )}

      {/* Footer: Preview / Cancel / Save — sticky над мобильным bottom-nav, inline на десктопе */}
      <div
        className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 -mx-4 px-4 py-3 bg-[rgba(254,254,242,0.82)] backdrop-blur-md
                   sm:static sm:bottom-auto sm:mx-0 sm:px-0 sm:py-0 sm:pt-4 sm:bg-transparent sm:backdrop-blur-none
                   flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
        style={{ borderTop: '0.5px solid rgba(139,92,246,0.18)' }}
      >
        <GlassButton
          variant="secondary"
          data-tour="preview"
          onClick={() => { setPreviewOpen(true); tourBus.emit('preview-opened') }}
          disabled={!canPreview}
          className="order-1 sm:order-none sm:mr-auto"
          leftIcon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="1.6" fill="currentColor" />
            </svg>
          }
          aria-label="Посмотреть как у гостя"
        >
          Посмотреть как у гостя
        </GlassButton>

        <div className="flex items-center gap-2 sm:gap-3 order-2 sm:order-none">
          <GlassButton variant="ghost" onClick={() => router.back()} className="flex-1 sm:flex-none">
            Отмена
          </GlassButton>
          <GlassButton
            variant="brand"
            data-tour="save-dish"
            onClick={s.handleSave}
            disabled={!canSave}
            className="flex-1 sm:flex-none"
          >
            {s.isEdit ? 'Сохранить' : 'Добавить блюдо'}
          </GlassButton>
        </div>
      </div>

      <DishOptionsModal s={s} open={optionsOpen} onClose={() => setOptionsOpen(false)} />

      <DishSheet
        item={previewOpen ? buildPreviewItem(s) : null}
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); tourBus.emit('preview-closed') }}
        onAdd={() => { setPreviewOpen(false); tourBus.emit('preview-closed') }}
        venueIngredientRefs={s.ingredientRefs}
      />

      {s.pickerOpen && s.libraries.length > 0 && (
        <IngredientPickerModal
          libraries={s.libraries}
          allRefs={s.ingredientRefs}
          alreadyAddedIds={s.ingredients.map(i => i.ingredientRefId)}
          onSelect={ref => {
            s.addIngredient(ref.id)
            tourBus.emit('ingredient-picked', ref.id)
            if (tourActive) s.setPickerOpen(false)
          }}
          onRemove={ref => {
            const ing = s.ingredients.find(i => i.ingredientRefId === ref.id && !i.parentIngredientId)
              ?? s.ingredients.find(i => i.ingredientRefId === ref.id)
            if (ing) s.removeIngredient(ing.id)
          }}
          onClose={() => s.setPickerOpen(false)}
          onIngredientCreated={_ref => {
            invalidateIngredients()
          }}
        />
      )}

      {s.addonPickerTarget && s.libraries.length > 0 && (
        <IngredientPickerModal
          libraries={s.libraries}
          allRefs={s.ingredientRefs}
          alreadyAddedIds={[]}
          onSelect={ref => {
            const { groupId, addonId } = s.addonPickerTarget!
            s.updateAddon(groupId, addonId, { ingredientRefId: ref.id, label: ref.name })
            s.setAddonPickerTarget(null)
          }}
          onClose={() => s.setAddonPickerTarget(null)}
          onIngredientCreated={_ref => {
            invalidateIngredients()
          }}
        />
      )}

      {s.variantPickerTarget && s.libraries.length > 0 && (
        <IngredientPickerModal
          libraries={s.libraries}
          allRefs={s.ingredientRefs}
          alreadyAddedIds={[]}
          onSelect={ref => {
            const { groupId, optionId } = s.variantPickerTarget!
            const group = s.variantGroups.find(g => g.id === groupId)
            const opt = group?.options.find(o => o.id === optionId)
            if (!group || !opt) return
            const amount = group.replacesIngredientRefId
              ? s.getAmountFromComposition(group.replacesIngredientRefId, s.sizes[0]?.id ?? '')
              : (opt.weight || 100)
            const rawUnit = group.replacesIngredientRefId ? (s.sizes[0]?.unit ?? 'г') : ref.unit
            const unit: 'г' | 'мл' = rawUnit === 'мл' ? 'мл' : 'г'
            const ratio = amount / 100
            s.updateVariantOption(groupId, optionId, {
              ingredientRefId: ref.id,
              label: ref.name,
              weight: amount,
              weightUnit: unit,
              calories: Math.round(ref.caloriesPer100 * ratio),
              protein: Math.round(ref.proteinPer100 * ratio * 10) / 10,
              fat: Math.round(ref.fatPer100 * ratio * 10) / 10,
              carbs: Math.round(ref.carbsPer100 * ratio * 10) / 10,
            })
            s.setVariantPickerTarget(null)
          }}
          onClose={() => s.setVariantPickerTarget(null)}
        />
      )}
    </div>
  )
}

function DishOptionsChip({ s, onOpen }: { s: ItemFormState; onOpen: () => void }) {
  const sizesCount = s.hasMultipleSizes ? s.sizes.length : 0
  const choiceCount = s.variantGroups.length
  const addonsCount = s.addonGroups.length
  const hasAny = sizesCount + choiceCount + addonsCount > 0

  const parts: string[] = []
  if (sizesCount) parts.push(`${sizesCount} ${sizesCount === 1 ? 'размер' : sizesCount < 5 ? 'размера' : 'размеров'}`)
  if (choiceCount) parts.push(`${choiceCount} ${choiceCount === 1 ? 'выбор' : 'выбора'}`)
  if (addonsCount) parts.push(`${addonsCount} ${addonsCount === 1 ? 'добавка' : 'добавки'}`)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.99] flex items-center gap-3"
      style={{
        background: hasAny
          ? 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(176,166,223,0.14))'
          : 'var(--surface-1)',
        border: '0.5px solid rgba(139,92,246,0.22)',
        boxShadow: 'var(--shadow-soft-sm)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 5h12M3 9h12M3 13h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {hasAny ? 'Опции для гостя' : 'Что гость может выбрать или добавить?'}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
          {hasAny ? parts.join(' · ') : 'Размеры, опции на выбор, платные добавки'}
        </p>
      </div>
      <span className="text-xs shrink-0" style={{ color: '#7C3AED' }}>
        {hasAny ? 'Изменить →' : 'Добавить →'}
      </span>
    </button>
  )
}
