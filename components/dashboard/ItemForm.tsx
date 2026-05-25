'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { tourBus } from '@/lib/tour/bus'
import IngredientPickerModal from './IngredientPickerModal'
import AddonsSection from './item-form/AddonsSection'
import BasicSection from './item-form/BasicSection'
import CompositionSection from './item-form/CompositionSection'
import VariantsSection from './item-form/VariantsSection'
import { useItemFormState } from './item-form/useItemFormState'
import { buildPreviewItem } from './item-form/buildPreviewItem'
import DishSheet from '@/components/menu/DishSheet'
import { GlassButton } from '@/components/ui-kit'
import { useInvalidateIngredients } from '@/lib/queries/menu-client'

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

  useEffect(() => {
    if (itemId || demoMode) return  // в демо тур не запускаем
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
    if (s.mode !== 'ttk') s.setMode('ttk')
    if (!s.categoryId) s.setAddingCategory(true)
  }, [tourActive, s])

  const canSave = !!s.name && !!s.categoryId && (s.mode === 'quick' || s.ingredients.length > 0)
  const canPreview = !!s.name

  return (
    <div className="px-4 py-6 md:p-8 max-w-5xl mx-auto">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm transition-colors active:scale-[0.98]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 3l-4 4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Назад
      </button>

      <h1 className="text-xl font-medium mb-6" style={{ color: 'var(--color-text-primary)' }}>
        {s.isEdit ? 'Редактировать блюдо' : 'Новое блюдо'}
      </h1>

      {/* Mode-switcher (segmented control) */}
      <div
        className="inline-flex gap-1 p-1 rounded-xl mb-6"
        style={{
          background: 'rgba(176,166,223,0.18)',
          border: '0.5px solid rgba(139,92,246,0.18)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        {(['quick', 'composition', 'ttk'] as const).map(m => {
          const active = s.mode === m
          return (
            <button
              key={m}
              data-tour={m === 'ttk' ? 'mode-ttk' : undefined}
              onClick={() => { s.setMode(m); tourBus.emit('mode-set', m) }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
              style={active
                ? { background: 'var(--color-text-primary)', color: '#FEFEF2', boxShadow: '0 2px 8px rgba(44,41,80,0.18)' }
                : { color: 'var(--color-text-secondary)', background: 'transparent' }
              }
              title={
                m === 'quick' ? 'Название + КБЖУ вручную, без состава' :
                m === 'composition' ? 'Список ингредиентов с количеством' :
                'По сложному проценту: брутто, обработка, выход, фуд-кост (ТТК)'
              }
            >
              {m === 'quick' ? 'Быстро' : m === 'composition' ? 'По составу' : 'По сложному проценту'}
            </button>
          )
        })}
      </div>

      <BasicSection s={s} />

      {s.mode !== 'quick' && (
        <div className="mb-8">
          <CompositionSection s={s} />
        </div>
      )}

      {s.mode !== 'quick' && <VariantsSection s={s} />}

      {s.mode !== 'quick' && <AddonsSection s={s} />}

      {/* Footer: Preview / Cancel / Save */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-4"
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
