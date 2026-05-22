'use client'

import { useState } from 'react'
import { FormField, FormInput, FormSelect, NutriFields } from '@/components/ui/form-fields'
import { RemoveButton } from '@/components/ui/RemoveButton'
import { GlassCard, GlassButton, GlassInput, NutriPill } from '@/components/ui-kit'
import { MAX_SIZES, type ItemFormState, type IngredientItem } from './useItemFormState'
import { resolveCompositionRowContribution, resolveCompositionWeights, resolveIngredientPer100 } from '@/lib/utils'
import type { CompositionRow } from '@/types'
import { asCategory } from '@/lib/cooking-coefficients'
import { companionAbsorptionRatio, findCompanionRef, suggestCompanions } from '@/lib/cooking-companions'
import { tourBus } from '@/lib/tour/bus'
import { ProcessingAnchor, ProcessingPanel } from './ProcessingChip'

// ─── Helpers ────────────────────────────────────────────────────────────────

interface RowContribution {
  brutto: number
  finalGrams: number
  calories: number
  protein: number
  fat: number
  carbs: number
}

// Состав конкретного размера в виде CompositionRow[] — для расчёта веса с учётом
// связей родитель↔компаньон (вода/масло) в resolveCompositionWeights.
function sizeCompositionRows(s: ItemFormState, sizeId: string): CompositionRow[] {
  return s.ingredients.flatMap(ing => {
    const amount = s.amounts.find(a => a.ingredientId === ing.id && a.sizeId === sizeId)?.amount ?? 0
    if (!amount) return []
    return [{
      id: ing.id,
      ingredientId: ing.ingredientRefId,
      amount,
      unit: ing.unit,
      processing: ing.processing,
      yieldOverride: ing.yieldOverride,
      parentRowId: ing.parentIngredientId,
      companionKind: ing.companionKind,
      companionRatio: ing.companionRatio,
    }]
  })
}

function rowContribution(s: ItemFormState, ingredient: IngredientItem, sizeId: string): RowContribution {
  const ref = s.ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
  const amount = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === sizeId)?.amount ?? 0
  if (!ref || !amount) return { brutto: 0, finalGrams: 0, calories: 0, protein: 0, fat: 0, carbs: 0 }
  const per100 = resolveIngredientPer100(ref, s.ingredientRefs)
  const c = resolveCompositionRowContribution(
    {
      ingredientId: ref.id,
      amount,
      unit: ingredient.unit,
      processing: ingredient.processing,
      yieldOverride: ingredient.yieldOverride,
    },
    ref,
    per100
  )
  const brutto = (ingredient.unit === 'шт' && ref.weightPerUnit) ? amount * ref.weightPerUnit : amount
  // finalGrams берём из единого расчёта (учитывает впитывание воды и правило «крупа + вода»).
  const weights = resolveCompositionWeights(sizeCompositionRows(s, sizeId), s.ingredientRefs)
  return {
    brutto,
    finalGrams: weights.perRow[ingredient.id] ?? c.finalGrams,
    calories: c.calories,
    protein: c.protein,
    fat: c.fat,
    carbs: c.carbs,
  }
}

function sizeWeightUnit(_s: ItemFormState, ingredient: IngredientItem): string {
  return ingredient.unit
}

function sizeTotals(s: ItemFormState, sizeId: string) {
  let brutto = 0, yieldG = 0, cal = 0, pro = 0, fat = 0, car = 0
  for (const ing of s.ingredients) {
    const c = rowContribution(s, ing, sizeId)
    brutto += c.brutto
    yieldG += c.finalGrams
    cal += c.calories
    pro += c.protein
    fat += c.fat
    car += c.carbs
  }
  return { brutto, yieldG, cal, pro, fat, car }
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function CompositionSection({ s }: { s: ItemFormState }) {
  const isTTK = s.mode === 'ttk'

  return (
    <>
      <SizePortionSection s={s} />

      <FormField label="Состав" required>
        {s.ingredients.length === 0 ? (
          <EmptyComposition onAdd={() => { s.setPickerOpen(true); tourBus.emit('picker-opened') }} />
        ) : (
          <>
            {/* Mobile: per-size cards */}
            <div className="md:hidden space-y-3">
              {s.sizes.map((size, sizeIdx) => (
                <MobileSizeCard key={size.id} s={s} sizeId={size.id} sizeIdx={sizeIdx} />
              ))}
              <AddIngredientButton onClick={() => { s.setPickerOpen(true); tourBus.emit('picker-opened') }} />
            </div>

            {/* Desktop: glass row-cards */}
            <div className="hidden md:block space-y-2">
              {s.ingredients.map(ingredient => (
                <DesktopIngredientCard key={ingredient.id} s={s} ingredient={ingredient} />
              ))}
              <div className="mt-2">
                <AddIngredientButton onClick={() => { s.setPickerOpen(true); tourBus.emit('picker-opened') }} />
              </div>
            </div>
          </>
        )}
        {isTTK && s.ingredients.length > 0 && (
          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Брутто — что закупаете. Выход — что в тарелке после обработки. КБЖУ считается от сырья (ГОСТ).
          </p>
        )}
      </FormField>

      {s.sizes.length > 0 && s.ingredients.length > 0 && <FinalNutriCard s={s} />}
    </>
  )
}

// ─── Size portion selector ─────────────────────────────────────────────────

function SizePortionSection({ s }: { s: ItemFormState }) {
  return (
    <FormField label="Размер порции" required>
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!s.hasMultipleSizes}
            onChange={() => {
              s.setHasMultipleSizes(false)
              s.setSizes([{ id: 'default', name: '', unit: 'г' }])
            }}
          />
          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Один размер</span>
        </label>

        {!s.hasMultipleSizes && (
          <div className="ml-6 flex gap-2">
            <FormInput
              value={s.sizes[0]?.name || ''}
              onChange={e => s.updateSizeName(s.sizes[0]?.id || 'default', e.target.value)}
              placeholder="Название (необязательно, например: Стандартный)"
              className="flex-1"
            />
            <FormSelect
              value={s.sizes[0]?.unit || 'г'}
              onChange={e => s.updateSizeUnit(s.sizes[0]?.id || 'default', e.target.value as 'г' | 'мл')}
              className="w-24"
            >
              <option value="г">граммы (г)</option>
              <option value="мл">миллилитры (мл)</option>
            </FormSelect>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={s.hasMultipleSizes}
            onChange={() => {
              s.setHasMultipleSizes(true)
              if (s.sizes.length === 1 && s.sizes[0].id === 'default') {
                s.setSizes([
                  { id: crypto.randomUUID(), name: '', unit: 'г' },
                  { id: crypto.randomUUID(), name: '', unit: 'г' }
                ])
              }
            }}
          />
          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Несколько размеров</span>
        </label>

        {s.hasMultipleSizes && (
          <div className="ml-6">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs self-center" style={{ color: 'var(--color-text-muted)' }}>Шаблоны:</span>
              {[
                { label: 'S / M / L', preset: [{ name: 'S', unit: 'мл' as const }, { name: 'M', unit: 'мл' as const }, { name: 'L', unit: 'мл' as const }] },
                { label: 'Маленькая / Средняя / Большая', preset: [{ name: 'Маленькая', unit: 'г' as const }, { name: 'Средняя', unit: 'г' as const }, { name: 'Большая', unit: 'г' as const }] },
                { label: '200 / 300 / 400 мл', preset: [{ name: '200 мл', unit: 'мл' as const }, { name: '300 мл', unit: 'мл' as const }, { name: '400 мл', unit: 'мл' as const }] },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => s.applySizePreset(p.preset)}
                  className="transition-all active:scale-95"
                  aria-label={`Применить шаблон ${p.label}`}
                >
                  <NutriPill tone="brand" size="sm">{p.label}</NutriPill>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 mb-3">
              {s.sizes.map((size, idx) => (
                <div key={size.id} className="flex items-center gap-1 flex-wrap">
                  <FormInput
                    value={size.name}
                    onChange={e => s.updateSizeName(size.id, e.target.value)}
                    placeholder={idx === 0 ? 'Маленькая' : idx === 1 ? 'Средняя' : 'Большая'}
                    className="w-32"
                  />
                  <FormSelect
                    value={size.unit}
                    onChange={e => s.updateSizeUnit(size.id, e.target.value as 'г' | 'мл')}
                    className="w-20"
                  >
                    <option value="г">г</option>
                    <option value="мл">мл</option>
                  </FormSelect>
                  <div className="flex items-center gap-1">
                    <GlassInput
                      type="number"
                      inputMode="decimal"
                      value={size.price ?? ''}
                      onChange={e => s.updateSizePrice(size.id, e.target.value === '' ? undefined : Number(e.target.value))}
                      placeholder="Цена"
                      className="w-24"
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>₽</span>
                  </div>
                  {s.sizes.length > 1 && (
                    <RemoveButton size="sm" onClick={() => s.removeSize(size.id)} />
                  )}
                </div>
              ))}
              {s.sizes.length < MAX_SIZES && (
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={s.addSize}
                  className="self-start"
                  leftIcon={
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  }
                >
                  Добавить размер ({s.sizes.length}/{MAX_SIZES})
                </GlassButton>
              )}
            </div>
          </div>
        )}
      </div>
    </FormField>
  )
}

// ─── Shared UI bits ─────────────────────────────────────────────────────────

const PlusIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

function EmptyComposition({ onAdd }: { onAdd: () => void }) {
  return (
    <GlassButton variant="secondary" data-tour="pick-ingredient" onClick={onAdd} fullWidth leftIcon={PlusIcon}>
      Выбрать из справочника
    </GlassButton>
  )
}

function AddIngredientButton({ onClick }: { onClick: () => void }) {
  return (
    <GlassButton variant="secondary" data-tour="add-ingredient" onClick={onClick} fullWidth leftIcon={PlusIcon}>
      Добавить ингредиент
    </GlassButton>
  )
}

// ─── Lock toggle (без эмодзи, SVG-замок) ───────────────────────────────────

function LockToggle({ locked, onClick }: { locked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all active:scale-[0.97]"
      style={locked
        ? { background: 'rgba(242,217,101,0.30)', color: '#7C5200', border: '0.5px solid rgba(242,217,101,0.55)' }
        : { background: 'rgba(139,92,246,0.10)', color: 'var(--color-text-muted)', border: '0.5px solid rgba(139,92,246,0.20)' }
      }
      title={locked ? 'Гость не сможет убрать этот ингредиент' : 'Гость сможет убрать этот ингредиент'}
      aria-pressed={locked}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.1" />
        {locked
          ? <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          : <path d="M4 5.5V4a2 2 0 0 1 3.5-1.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        }
      </svg>
      {locked ? 'нельзя убрать' : 'можно убрать'}
    </button>
  )
}

// ─── Companion suggestion chip ─────────────────────────────────────────────

function CompanionChip({ label, onClick, title, dataTour }: { label: string; onClick: () => void; title?: string; dataTour?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      data-tour={dataTour}
      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full transition-all active:scale-95"
      style={{
        background: 'rgba(139,92,246,0.10)',
        color: '#7C3AED',
        border: '0.5px dashed rgba(139,92,246,0.40)',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      {label}
    </button>
  )
}

// ─── Companion suggestions (shared desktop + mobile) ────────────────────────

function CompanionSuggestions({ s, ingredient }: { s: ItemFormState; ingredient: IngredientItem }) {
  const ref = s.ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
  const srcCategory = asCategory(ref?.category)
  const isTTK = s.mode === 'ttk'
  const suggestions = isTTK && ingredient.processing && ingredient.processing !== 'raw'
    ? suggestCompanions(ingredient.processing, srcCategory)
    : []
  if (suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map(sg => {
        const companionRef = findCompanionRef(s.ingredientRefs, sg.kind)
        if (!companionRef) return null
        if (s.ingredients.some(i => i.ingredientRefId === companionRef.id && i.parentIngredientId === ingredient.id)) return null
        const firstSize = s.sizes[0]
        const baseAmount = firstSize
          ? (s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === firstSize.id)?.amount ?? 0)
          : 0
        const preview = baseAmount > 0 ? Math.max(1, Math.round(baseAmount * sg.ratio)) : null
        return (
          <CompanionChip
            key={sg.kind}
            label={`${sg.label}${preview ? ` ~${preview}${companionRef.unit}` : ''}`}
            onClick={() => {
              s.addCompanionIngredient(ingredient.id, companionRef.id, sg.ratio, sg.kind)
              tourBus.emit('companion-added', { parentRefId: ingredient.ingredientRefId, kind: sg.kind })
            }}
            title={`Добавит ${companionRef.name} в состав (${Math.round(sg.ratio * 100)}% от веса)`}
            dataTour={`companion-${ingredient.ingredientRefId}-${sg.kind}`}
          />
        )
      })}
    </div>
  )
}

function BruttoCell({ s, ingredient, sizeId }: { s: ItemFormState; ingredient: IngredientItem; sizeId: string }) {
  const isCount = ingredient.unit === 'шт'
  const amount = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === sizeId)?.amount || 0
  const contrib = rowContribution(s, ingredient, sizeId)
  const showYield = s.mode === 'ttk' && amount > 0 && Math.abs(contrib.brutto - contrib.finalGrams) >= 0.5
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        <GlassInput
          type="number"
          inputMode={isCount ? 'numeric' : 'decimal'}
          step={isCount ? 1 : 0.1}
          min={0}
          value={amount || ''}
          data-tour={`amount-${ingredient.ingredientRefId}`}
          onChange={e => {
            const v = isCount ? parseInt(e.target.value, 10) || 0 : Number(e.target.value)
            s.updateAmount(ingredient.id, sizeId, v)
            tourBus.emit('amount-set', { refId: ingredient.ingredientRefId, amount: v })
          }}
          placeholder={isCount ? 'шт' : '0'}
          className="w-20 text-center"
        />
        <span className="text-xs w-4" style={{ color: 'var(--color-text-muted)' }}>{sizeWeightUnit(s, ingredient)}</span>
      </div>
      {showYield ? (
        <span className="text-[11px] whitespace-nowrap" style={{ color: '#534AB7' }}>
          → {Math.round(contrib.finalGrams)} {ingredient.unit === 'шт' ? 'г' : ingredient.unit}
        </span>
      ) : null}
    </div>
  )
}

// ─── Desktop glass row-card ─────────────────────────────────────────────────

function DesktopIngredientCard({ s, ingredient }: { s: ItemFormState; ingredient: IngredientItem }) {
  const [procExpanded, setProcExpanded] = useState(false)
  const ref = s.ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
  const isTTK = s.mode === 'ttk'
  const isChild = !!ingredient.parentIngredientId
  const showProcessing = isTTK && !isChild

  return (
    <GlassCard
      tone="solid"
      padding="sm"
      data-tour={`card-${ingredient.ingredientRefId}`}
      style={isChild ? { marginLeft: 24, borderLeft: '2px solid rgba(139,92,246,0.30)' } : undefined}
    >
      {/* Top row — остаётся «как вкопанная» */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isChild && <span style={{ color: 'var(--color-text-muted)' }}>↳</span>}
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {ingredient.name}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({ingredient.unit})</span>
            {showProcessing && (
              <ProcessingAnchor
                processing={ingredient.processing}
                yieldOverride={ingredient.yieldOverride}
                ingredientRef={ref}
                expanded={procExpanded}
                onToggle={() => {
                  setProcExpanded(o => {
                    if (!o) tourBus.emit('processing-panel-opened', ingredient.ingredientRefId)
                    return !o
                  })
                }}
                dataTour={`processing-${ingredient.ingredientRefId}`}
              />
            )}
            {!isChild && (
              <LockToggle locked={!!ingredient.locked} onClick={() => s.toggleIngredientLocked(ingredient.id)} />
            )}
          </div>
          <CompanionSuggestions s={s} ingredient={ingredient} />
        </div>

        <div className="flex items-start gap-3 shrink-0">
          {s.sizes.map((size, idx) => (
            <div key={size.id} className="flex flex-col items-end gap-0.5">
              {s.hasMultipleSizes && (
                <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                  {size.name || `Размер ${idx + 1}`}
                </span>
              )}
              <BruttoCell s={s} ingredient={ingredient} sizeId={size.id} />
            </div>
          ))}
        </div>

        <RemoveButton onClick={() => s.removeIngredient(ingredient.id)} />
      </div>

      {/* Processing panel — лента + коэффициент выезжают снизу */}
      {showProcessing && procExpanded && (
        <div className="mt-2 pt-2" style={{ borderTop: '0.5px solid rgba(139,92,246,0.12)' }}>
          <ProcessingPanel
            processing={ingredient.processing}
            yieldOverride={ingredient.yieldOverride}
            ingredientRef={ref}
            refId={ingredient.ingredientRefId}
            onChangeProcessing={p => {
              s.updateIngredientProcessing(ingredient.id, p)
              tourBus.emit('processing-set', { refId: ingredient.ingredientRefId, processing: p })
            }}
            onChangeYieldOverride={v => s.updateIngredientYieldOverride(ingredient.id, v)}
          />
        </div>
      )}
    </GlassCard>
  )
}

// ─── Mobile per-size card ───────────────────────────────────────────────────

function MobileSizeCard({ s, sizeId, sizeIdx }: { s: ItemFormState; sizeId: string; sizeIdx: number }) {
  const size = s.sizes.find(sz => sz.id === sizeId)
  if (!size) return null

  return (
    <GlassCard tone="solid" padding="none" className="overflow-hidden">
      <div
        className="px-3 py-2 text-xs font-medium"
        style={{ background: 'rgba(176,166,223,0.18)', color: '#534AB7', borderBottom: '0.5px solid rgba(139,92,246,0.12)' }}
      >
        {size.name || (s.hasMultipleSizes ? `Размер ${sizeIdx + 1}` : 'Порция')} ({size.unit})
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(139,92,246,0.10)' }}>
        {s.ingredients
          .filter(ing => !ing.parentIngredientId)
          .map(parent => {
            const children = s.ingredients.filter(i => i.parentIngredientId === parent.id)
            return (
              <div key={parent.id}>
                <MobileIngredientRow s={s} ingredient={parent} sizeId={sizeId} isFirstSize={sizeIdx === 0} />
                {children.map(child => (
                  <MobileChildIngredientRow
                    key={child.id}
                    s={s}
                    child={child}
                    parent={parent}
                    sizeId={sizeId}
                    isFirstSize={sizeIdx === 0}
                  />
                ))}
              </div>
            )
          })}
      </div>
    </GlassCard>
  )
}

// ─── Mobile child (companion) row ──────────────────────────────────────────

function MobileChildIngredientRow({
  s, child, parent, sizeId, isFirstSize,
}: {
  s: ItemFormState
  child: IngredientItem
  parent: IngredientItem
  sizeId: string
  isFirstSize: boolean
}) {
  const childRef = s.ingredientRefs.find(r => r.id === child.ingredientRefId)
  const parentRef = s.ingredientRefs.find(r => r.id === parent.ingredientRefId)
  const parentCategory = asCategory(parentRef?.category)
  const amount = s.amounts.find(a => a.ingredientId === child.id && a.sizeId === sizeId)?.amount || 0

  const absorption = child.companionKind && parent.processing
    ? companionAbsorptionRatio(child.companionKind, parent.processing, parentCategory)
    : 0.15
  const absorbed = Math.round(amount * absorption * 10) / 10
  const absorptionLabel = child.companionKind === 'water' ? 'выкипание' : 'впитывание'

  return (
    <div
      className="px-3 py-2.5 space-y-1.5"
      style={{
        background: 'rgba(139,92,246,0.03)',
        borderLeft: '2px solid rgba(139,92,246,0.30)',
        marginLeft: 16,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium min-w-0 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--color-text-primary)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>↳</span>
          <span>{childRef?.name ?? child.name}</span>
          <NutriPill tone="brand" size="xs">
            {absorptionLabel} ×{absorption.toFixed(2)}
          </NutriPill>
        </div>
        {isFirstSize && <RemoveButton onClick={() => s.removeIngredient(child.id)} />}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          расход {amount} {child.unit} {amount > 0 && <>(в блюдо ушло {absorbed} {child.unit})</>}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <GlassInput
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            value={amount || ''}
            onChange={e => s.updateAmount(child.id, sizeId, Number(e.target.value))}
            placeholder="0"
            className="w-20 text-center"
          />
          <span className="text-xs w-4" style={{ color: 'var(--color-text-muted)' }}>{child.unit === 'шт' ? 'г' : child.unit}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile parent ingredient row ──────────────────────────────────────────

function MobileIngredientRow({
  s, ingredient, sizeId, isFirstSize,
}: {
  s: ItemFormState
  ingredient: IngredientItem
  sizeId: string
  isFirstSize: boolean
}) {
  const [procExpanded, setProcExpanded] = useState(false)
  const ref = s.ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
  const isTTK = s.mode === 'ttk'
  const contrib = rowContribution(s, ingredient, sizeId)
  const amount = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === sizeId)?.amount || 0
  const isCount = ingredient.unit === 'шт'
  const showYield = isTTK && amount > 0 && Math.abs(contrib.brutto - contrib.finalGrams) >= 0.5

  return (
    <div className="px-3 py-3 space-y-2.5" data-tour={`card-${ingredient.ingredientRefId}`}>
      {/* Row 1: name + remove */}
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium min-w-0" style={{ color: 'var(--color-text-primary)' }}>
          {ingredient.name}
          <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>({ingredient.unit})</span>
        </div>
        {isFirstSize && <RemoveButton onClick={() => s.removeIngredient(ingredient.id)} />}
      </div>

      {/* Row 2: processing anchor + lock toggle — остаётся «как вкопанная» */}
      {isFirstSize && (
        <div className="flex items-start gap-2 flex-wrap">
          {isTTK && (
            <ProcessingAnchor
              processing={ingredient.processing}
              yieldOverride={ingredient.yieldOverride}
              ingredientRef={ref}
              expanded={procExpanded}
              onToggle={() => setProcExpanded(o => !o)}
            />
          )}
          <LockToggle locked={!!ingredient.locked} onClick={() => s.toggleIngredientLocked(ingredient.id)} />
        </div>
      )}

      {/* Processing panel — лента + коэффициент выезжают снизу */}
      {isFirstSize && isTTK && procExpanded && (
        <ProcessingPanel
          processing={ingredient.processing}
          yieldOverride={ingredient.yieldOverride}
          ingredientRef={ref}
          onChangeProcessing={p => {
            s.updateIngredientProcessing(ingredient.id, p)
            tourBus.emit('processing-set', { refId: ingredient.ingredientRefId, processing: p })
          }}
          onChangeYieldOverride={v => s.updateIngredientYieldOverride(ingredient.id, v)}
        />
      )}

      {/* Companions (mobile) */}
      {isFirstSize && <CompanionSuggestions s={s} ingredient={ingredient} />}

      {/* Row 3: weight input */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-1 shrink-0">
          <GlassInput
            type="number"
            inputMode={isCount ? 'numeric' : 'decimal'}
            step={isCount ? 1 : 0.1}
            min={0}
            value={amount || ''}
            data-tour={`amount-${ingredient.ingredientRefId}`}
            onChange={e => {
              const v = isCount ? parseInt(e.target.value, 10) || 0 : Number(e.target.value)
              s.updateAmount(ingredient.id, sizeId, v)
              tourBus.emit('amount-set', { refId: ingredient.ingredientRefId, amount: v })
            }}
            placeholder={isCount ? 'шт' : '0'}
            className="w-20 text-center"
          />
          <span className="text-xs w-4" style={{ color: 'var(--color-text-muted)' }}>{sizeWeightUnit(s, ingredient)}</span>
        </div>
      </div>

      {/* Row 4: выход */}
      {showYield && (
        <div className="text-[11px] text-right" style={{ color: '#534AB7' }}>
          выход {Math.round(contrib.finalGrams)} {ingredient.unit === 'шт' ? 'г' : ingredient.unit}
        </div>
      )}
    </div>
  )
}

// ─── Final manual-override KBJU card ────────────────────────────────────────

function FinalNutriCard({ s }: { s: ItemFormState }) {
  return (
    <GlassCard tone="tinted" padding="md" className="mb-6">
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
        Итоговое КБЖУ (на порцию)
      </p>
      <div className="space-y-3">
        {s.sizes.map((size, idx) => {
          const nutri = s.calculateNutriForSize(size.id)
          const isManual = s.manualNutri[size.id]?.isManual
          const t = sizeTotals(s, size.id)
          const showYield = s.mode === 'ttk' && Math.abs(t.brutto - t.yieldG) >= 0.5
          return (
            <div
              key={size.id}
              className="pt-3 first:pt-0"
              style={idx === 0 ? undefined : { borderTop: '0.5px solid rgba(139,92,246,0.18)' }}
            >
              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <div>
                  <span className="text-sm font-medium" style={{ color: '#534AB7' }}>
                    {size.name || (s.hasMultipleSizes ? 'Новый размер' : 'Порция')}
                  </span>
                  {t.brutto > 0 && (
                    <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
                      ({Math.round(t.brutto)} {size.unit}{showYield ? ` → выход ${Math.round(t.yieldG)} ${size.unit}` : ''})
                    </span>
                  )}
                </div>
                {isManual && <NutriPill tone="warning" size="xs">отредактировано</NutriPill>}
              </div>
              <NutriFields
                nutri={nutri}
                onChange={(field, value) => s.updateManualNutri(size.id, field, value)}
              />
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
