'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import IngredientPickerModal from './IngredientPickerModal'
import AddonsSection from './item-form/AddonsSection'
import BasicSection from './item-form/BasicSection'
import CompositionSection from './item-form/CompositionSection'
import VariantsSection from './item-form/VariantsSection'
import { useItemFormState } from './item-form/useItemFormState'
import { buildPreviewItem } from './item-form/buildPreviewItem'
import DishSheet from '@/components/menu/DishSheet'

export default function ItemForm({ itemId, categoryId: initialCategoryId }: { itemId?: string; categoryId?: string }) {
  const router = useRouter()
  const s = useItemFormState({ itemId, initialCategoryId })
  const [previewOpen, setPreviewOpen] = useState(false)

  const canSave = !!s.name && !!s.categoryId && (s.mode === 'quick' || s.ingredients.length > 0)
  const canPreview = !!s.name

  return (
    <div className="px-4 py-6 md:p-8 max-w-5xl mx-auto">
      <button onClick={() => router.back()} className="mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        ← Назад
      </button>

      <h1 className="text-xl font-medium mb-6" style={{ color: 'var(--color-text-primary)' }}>
        {s.isEdit ? 'Редактировать блюдо' : 'Новое блюдо'}
      </h1>

      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: '#EAE7F8' }}>
        {(['quick', 'composition', 'ttk'] as const).map(m => (
          <button
            key={m}
            onClick={() => s.setMode(m)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={s.mode === m
              ? { background: 'var(--color-text-primary)', color: '#FEFEF2' }
              : { color: 'var(--color-text-secondary)' }
            }
            title={
              m === 'quick' ? 'Название + КБЖУ вручную, без состава' :
              m === 'composition' ? 'Список ингредиентов с количеством' :
              'По сложному проценту: брутто, обработка, выход, фуд-кост (ТТК)'
            }
          >
            {m === 'quick' ? 'Быстро' : m === 'composition' ? 'По составу' : 'По сложному проценту'}
          </button>
        ))}
      </div>

      <BasicSection s={s} />

      {s.mode !== 'quick' && (
        <div className="mb-8">
          <CompositionSection s={s} />
        </div>
      )}

      {s.mode !== 'quick' && <VariantsSection s={s} />}

      {s.mode !== 'quick' && <AddonsSection s={s} />}

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-4 border-t" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
        <button
          onClick={() => setPreviewOpen(true)}
          disabled={!canPreview}
          className="order-1 sm:order-none sm:mr-auto px-4 py-3 sm:py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          style={{
            background: canPreview ? '#FEFEF2' : '#EAE7F8',
            border: '0.5px solid rgba(176,166,223,0.5)',
            color: canPreview ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          }}
          aria-label="Посмотреть как у гостя"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="7" cy="7" r="1.6" fill="currentColor"/>
          </svg>
          Посмотреть как у гостя
        </button>
        <div className="flex items-center gap-2 sm:gap-3 order-2 sm:order-none">
          <button
            onClick={() => router.back()}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 rounded-xl text-sm"
            style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
          >
            Отмена
          </button>
          <button
            onClick={s.handleSave}
            disabled={!canSave}
            className="flex-1 sm:flex-none px-6 py-3 sm:py-2.5 rounded-xl text-sm font-medium"
            style={{
              background: canSave ? '#B0A6DF' : '#EAE7F8',
              color: canSave ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}
          >
            {s.isEdit ? 'Сохранить' : 'Добавить блюдо'}
          </button>
        </div>
      </div>

      <DishSheet
        item={previewOpen ? buildPreviewItem(s) : null}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onAdd={() => setPreviewOpen(false)}
        venueIngredientRefs={s.ingredientRefs}
      />

      {s.pickerOpen && s.libraries.length > 0 && (
        <IngredientPickerModal
          libraries={s.libraries}
          allRefs={s.ingredientRefs}
          alreadyAddedIds={s.ingredients.map(i => i.ingredientRefId)}
          onSelect={ref => s.addIngredient(ref.id)}
          onClose={() => s.setPickerOpen(false)}
          onIngredientCreated={ref => {
            s.setIngredientRefs(prev => [...prev, ref])
            s.setLibraries(prev => prev.map(l =>
              l.id === 'my-library' ? { ...l, ingredients: [...l.ingredients, ref] } : l
            ))
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
          onIngredientCreated={ref => {
            s.setIngredientRefs(prev => [...prev, ref])
            s.setLibraries(prev => prev.map(l =>
              l.id === 'my-library' ? { ...l, ingredients: [...l.ingredients, ref] } : l
            ))
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
