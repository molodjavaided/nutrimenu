'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import IngredientPickerModal from './IngredientPickerModal'
import AddonsSection from './item-form/AddonsSection'
import BasicSection from './item-form/BasicSection'
import CompositionSection from './item-form/CompositionSection'
import VariantsSection from './item-form/VariantsSection'
import { useItemFormState } from './item-form/useItemFormState'
import { buildPreviewItem } from './item-form/buildPreviewItem'
import DishSheet from '@/components/menu/DishSheet'
import { GlassCard, GlassButton } from '@/components/ui-kit'

export default function ItemForm({ itemId, categoryId: initialCategoryId }: { itemId?: string; categoryId?: string }) {
  const router = useRouter()
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null)
  const onboardingActive = onboardingStep === 3 && !itemId

  const s = useItemFormState({
    itemId,
    initialCategoryId,
    onSaved: async () => {
      if (onboardingActive) {
        await fetch('/api/user/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'next' }),
        })
      }
    },
  })
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    fetch('/api/user/onboarding')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setOnboardingStep(data.step) })
      .catch(() => {})
  }, [])

  // ─── Guided tour state (Глава 3) ───────────────────────────────────────────
  const POTATO_REF_ID = 'fd-1_1'
  const tourSeededRef = useRef(false)
  const tourAmountSetRef = useRef(false)

  useEffect(() => {
    if (!onboardingActive || tourSeededRef.current) return
    if (!s.isReady || s.ingredientRefs.length === 0) return
    const potato = s.ingredientRefs.find(r => r.id === POTATO_REF_ID)
    if (!potato) return
    tourSeededRef.current = true
    s.setMode('ttk')
    if (!s.name) s.setName('Жареный картофель')
    if (!s.ingredients.some(i => i.ingredientRefId === POTATO_REF_ID)) {
      s.addIngredient(POTATO_REF_ID)
    }
  }, [onboardingActive, s])

  const potatoIngredient = onboardingActive
    ? s.ingredients.find(i => i.ingredientRefId === POTATO_REF_ID && !i.parentIngredientId)
    : undefined
  useEffect(() => {
    if (!onboardingActive || tourAmountSetRef.current) return
    if (!potatoIngredient || s.sizes.length === 0) return
    const sizeId = s.sizes[0].id
    const existing = s.amounts.find(a => a.ingredientId === potatoIngredient.id && a.sizeId === sizeId)?.amount ?? 0
    if (existing === 0) {
      s.updateAmount(potatoIngredient.id, sizeId, 200)
    }
    tourAmountSetRef.current = true
  }, [onboardingActive, potatoIngredient, s])

  const tourStep1Done = potatoIngredient?.processing === 'fry'
  const tourStep2Done = !!(potatoIngredient && s.ingredients.some(i =>
    i.parentIngredientId === potatoIngredient.id && i.companionKind === 'oil'
  ))

  const baseCanSave = !!s.name && !!s.categoryId && (s.mode === 'quick' || s.ingredients.length > 0)
  const canSave = onboardingActive
    ? baseCanSave && tourStep1Done && tourStep2Done
    : baseCanSave
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

      {/* Onboarding tutorial banner — глава 3, интерактивный тур */}
      {onboardingActive && (
        <GlassCard
          tone="tinted"
          padding="md"
          className="mb-5 sticky top-2 z-20"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(139,92,246,0.10)', color: '#5B21B6' }}
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M9 3.5v5l3.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: '#5B21B6' }}>
                Шаг 3 из 4 — Собираем «Жареный картофель»
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Я уже добавил картошку 200 г. Дальше — два клика, и NutriMenu сам посчитает выход, впитывание масла и КБЖУ.
              </p>
            </div>
          </div>
          <ol className="ml-9 space-y-1.5 text-xs">
            {[
              {
                done: tourStep1Done,
                label: <>Тапните чип <b>«+ обработка»</b> под Картофелем и выберите <b>«Жарка»</b></>,
              },
              {
                done: tourStep2Done,
                hint: !tourStep1Done,
                label: <>Появится кнопка <b>🪄 +масло</b> — тапните, чтобы добавить масло (впитается ~15% жира)</>,
              },
              {
                done: tourStep1Done && tourStep2Done,
                hint: tourStep1Done && tourStep2Done,
                label: <>Жмите <b>«Добавить блюдо»</b> — увидите автоматический пересчёт КБЖУ и выхода</>,
              },
            ].map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-2"
                style={{ color: step.done ? '#15803D' : step.hint ? '#5B21B6' : 'var(--color-text-muted)' }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  background: step.done ? '#15803D' : step.hint ? '#8B5CF6' : 'transparent',
                  border: step.done || step.hint ? 'none' : '1.2px solid #C8C3F0',
                  color: '#fff', fontSize: 10, fontWeight: 600, marginTop: 1,
                }}>
                  {step.done ? '✓' : i + 1}
                </span>
                <span className="leading-relaxed">{step.label}</span>
              </li>
            ))}
          </ol>
        </GlassCard>
      )}

      {/* Mode-switcher (segmented control) */}
      <div
        className={onboardingActive ? 'hidden' : 'inline-flex gap-1 p-1 rounded-xl mb-6'}
        style={onboardingActive ? undefined : {
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
              onClick={() => s.setMode(m)}
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
          onClick={() => setPreviewOpen(true)}
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
