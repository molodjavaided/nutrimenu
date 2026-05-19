'use client'

import { FormField, FormInput, FormSelect, NutriFields } from '@/components/ui/form-fields'
import { RemoveButton } from '@/components/ui/RemoveButton'
import { MAX_SIZES, type ItemFormState, type IngredientItem } from './useItemFormState'
import { expectedDishYield, resolveCompositionRowContribution, resolveCostOfDish, resolveIngredientPer100 } from '@/lib/utils'
import { asCategory } from '@/lib/cooking-coefficients'
import { companionAbsorptionRatio, findCompanionRef, suggestCompanions } from '@/lib/cooking-companions'
import ProcessingChip from './ProcessingChip'

// ─── Helpers ────────────────────────────────────────────────────────────────

interface RowContribution {
  brutto: number
  finalGrams: number
  calories: number
  protein: number
  fat: number
  carbs: number
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
  return {
    brutto,
    finalGrams: c.finalGrams,
    calories: c.calories,
    protein: c.protein,
    fat: c.fat,
    carbs: c.carbs,
  }
}

function sizeWeightUnit(s: ItemFormState, ingredient: IngredientItem): string {
  // Что показать справа от инпута. Для штучных — 'шт', иначе — единица ингредиента (г/мл).
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
          <EmptyComposition onAdd={() => s.setPickerOpen(true)} />
        ) : (
          <>
            {/* Mobile: per-size cards */}
            <div className="md:hidden space-y-3">
              {s.sizes.map((size, sizeIdx) => (
                <MobileSizeCard key={size.id} s={s} sizeId={size.id} sizeIdx={sizeIdx} />
              ))}
              <AddIngredientButton onClick={() => s.setPickerOpen(true)} />
            </div>

            {/* Desktop: unified table */}
            <div className="hidden md:block">
              <UnifiedTable s={s} />
              <div className="mt-2">
                <AddIngredientButton onClick={() => s.setPickerOpen(true)} />
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

      {isTTK && <TTKExtras s={s} />}
    </>
  )
}

// ─── Size portion selector (unchanged behavior) ─────────────────────────────

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
                  className="text-xs px-2.5 py-1 rounded-full transition-all active:scale-95"
                  style={{ color: '#534AB7', background: '#EAE7F8' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 mb-3">
              {s.sizes.map((size, idx) => (
                <div key={size.id} className="flex items-center gap-1 flex-wrap">
                  <FormInput
                    value={size.name}
                    onChange={e => s.updateSizeName(size.id, e.target.value)}
                    placeholder={idx === 0 ? "Маленькая" : idx === 1 ? "Средняя" : "Большая"}
                    className="w-32 h-11 px-2 rounded-lg"
                  />
                  <FormSelect
                    value={size.unit}
                    onChange={e => s.updateSizeUnit(size.id, e.target.value as 'г' | 'мл')}
                    className="w-20 h-11 px-2 rounded-lg"
                  >
                    <option value="г">г</option>
                    <option value="мл">мл</option>
                  </FormSelect>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={size.price ?? ''}
                      onChange={e => s.updateSizePrice(size.id, e.target.value === '' ? undefined : Number(e.target.value))}
                      placeholder="Цена"
                      className="w-24 h-11 px-2 rounded-lg text-sm outline-none"
                      style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>₽</span>
                  </div>
                  {s.sizes.length > 1 && (
                    <RemoveButton size="sm" onClick={() => s.removeSize(size.id)} />
                  )}
                </div>
              ))}
              {s.sizes.length < MAX_SIZES && (
                <button
                  type="button"
                  onClick={s.addSize}
                  className="text-sm px-3 py-1.5 rounded-lg self-start"
                  style={{ color: '#B0A6DF', background: '#EAE7F8' }}
                >
                  + Добавить размер ({s.sizes.length}/{MAX_SIZES})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </FormField>
  )
}

// ─── Shared UI bits ─────────────────────────────────────────────────────────

function EmptyComposition({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="w-full h-10 px-3 rounded-xl text-sm flex items-center gap-2"
      style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-secondary)' }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Выбрать из справочника
    </button>
  )
}

function AddIngredientButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-10 px-3 rounded-xl text-sm flex items-center gap-2"
      style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-secondary)' }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Добавить ингредиент
    </button>
  )
}

function IngredientHeader({ s, ingredient }: { s: ItemFormState; ingredient: IngredientItem }) {
  const ref = s.ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
  const srcCategory = asCategory(ref?.category)
  const isTTK = s.mode === 'ttk'
  const isChild = !!ingredient.parentIngredientId
  // Дети не получают свою ProcessingChip и не предлагают новые companions
  const suggestions = !isChild && isTTK && ingredient.processing && ingredient.processing !== 'raw'
    ? suggestCompanions(ingredient.processing, srcCategory)
    : []
  return (
    <div className="space-y-1" style={isChild ? { paddingLeft: 16, borderLeft: '2px solid rgba(176,166,223,0.4)' } : undefined}>
      <div className="flex items-center gap-2 flex-wrap">
        {isChild && <span style={{ color: 'var(--color-text-muted)' }}>↳</span>}
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {ingredient.name}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({ingredient.unit})</span>
        {isTTK && !isChild && (
          <ProcessingChip
            processing={ingredient.processing}
            yieldOverride={ingredient.yieldOverride}
            ingredientRef={ref}
            onChangeProcessing={p => s.updateIngredientProcessing(ingredient.id, p)}
            onChangeYieldOverride={v => s.updateIngredientYieldOverride(ingredient.id, v)}
          />
        )}
        {!isChild && <button
          type="button"
          onClick={() => s.toggleIngredientLocked(ingredient.id)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-colors"
          style={{
            background: ingredient.locked ? '#FEF3C7' : 'rgba(176,166,223,0.15)',
            color: ingredient.locked ? '#92400E' : 'var(--color-text-muted)',
            border: ingredient.locked ? '0.5px solid #FDE68A' : '0.5px solid transparent',
          }}
          title={ingredient.locked ? 'Гость не сможет убрать этот ингредиент' : 'Гость сможет убрать этот ингредиент'}
        >
          {ingredient.locked ? '🔒 нельзя убрать' : '🔓 можно убрать'}
        </button>}
      </div>
      {suggestions.length > 0 && (
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
              <button
                key={sg.kind}
                type="button"
                onClick={() => s.addCompanionIngredient(ingredient.id, companionRef.id, sg.ratio, sg.kind)}
                className="text-[11px] px-2 py-1 rounded-full transition-all active:scale-95"
                style={{ background: '#EAE7F8', color: '#534AB7', border: '0.5px dashed rgba(83,74,183,0.4)' }}
                title={`Добавит ${companionRef.name} в состав (${Math.round(sg.ratio * 100)}% от веса)`}
              >
                🪄 {sg.label}{preview ? ` ~${preview}${companionRef.unit}` : ''}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BruttoCell({
  s,
  ingredient,
  sizeId,
}: {
  s: ItemFormState
  ingredient: IngredientItem
  sizeId: string
}) {
  const isCount = ingredient.unit === 'шт'
  const amount = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === sizeId)?.amount || 0
  const contrib = rowContribution(s, ingredient, sizeId)
  const showYield = s.mode === 'ttk' && amount > 0 && Math.abs(contrib.brutto - contrib.finalGrams) >= 0.5
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode={isCount ? 'numeric' : 'decimal'}
          step={isCount ? 1 : 0.1}
          min={0}
          value={amount || ''}
          onChange={e => s.updateAmount(ingredient.id, sizeId, isCount ? parseInt(e.target.value, 10) || 0 : Number(e.target.value))}
          placeholder={isCount ? 'шт' : '0'}
          className="w-20 h-11 px-2 rounded-lg text-sm outline-none text-center"
          style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
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

function ContributionText({ contrib }: { contrib: RowContribution }) {
  if (!contrib.calories && !contrib.protein && !contrib.fat && !contrib.carbs) return null
  return (
    <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
      {Math.round(contrib.calories)} ккал · Б {contrib.protein.toFixed(1)} · Ж {contrib.fat.toFixed(1)} · У {contrib.carbs.toFixed(1)}
    </span>
  )
}

// ─── Desktop unified table ──────────────────────────────────────────────────

function UnifiedTable({ s }: { s: ItemFormState }) {
  const isTTK = s.mode === 'ttk'
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Ингредиент
            </th>
            {s.sizes.map((size, idx) => (
              <th key={size.id} className="text-center py-2 px-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {size.name || (s.hasMultipleSizes ? `Размер ${idx + 1}` : 'Брутто')}
              </th>
            ))}
            <th className="text-right py-2 px-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Вклад в КБЖУ
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {s.ingredients.map(ingredient => {
            const firstSize = s.sizes[0]
            const firstContrib = firstSize ? rowContribution(s, ingredient, firstSize.id) : null
            return (
              <tr key={ingredient.id} style={{ borderTop: '0.5px solid rgba(176,166,223,0.2)' }}>
                <td className="py-2 px-3 align-top">
                  <IngredientHeader s={s} ingredient={ingredient} />
                </td>
                {s.sizes.map(size => (
                  <td key={size.id} className="py-2 px-2 align-top">
                    <BruttoCell s={s} ingredient={ingredient} sizeId={size.id} />
                  </td>
                ))}
                <td className="py-2 px-2 align-top text-right">
                  {firstContrib ? <ContributionText contrib={firstContrib} /> : null}
                </td>
                <td className="py-2 pl-1 align-top">
                  <RemoveButton onClick={() => s.removeIngredient(ingredient.id)} />
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '1px solid rgba(176,166,223,0.3)' }}>
            <td className="py-2 px-3 text-xs font-medium" style={{ color: '#534AB7' }}>Σ итого</td>
            {s.sizes.map(size => {
              const t = sizeTotals(s, size.id)
              const finalNutri = s.calculateNutriForSize(size.id)
              const showYield = isTTK && Math.abs(t.brutto - t.yieldG) >= 0.5
              return (
                <td key={size.id} className="py-2 px-2 text-center text-xs" style={{ color: '#534AB7' }}>
                  <div><b>{Math.round(t.brutto)}</b> {size.unit}{showYield ? <> · выход <b>{Math.round(t.yieldG)}</b> {size.unit}</> : null}</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    <b>{Math.round(finalNutri.calories)}</b> ккал · Б {finalNutri.protein.toFixed(1)} · Ж {finalNutri.fat.toFixed(1)} · У {finalNutri.carbs.toFixed(1)}
                  </div>
                </td>
              )
            })}
            <td />
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Mobile per-size card ───────────────────────────────────────────────────

function MobileSizeCard({ s, sizeId, sizeIdx }: { s: ItemFormState; sizeId: string; sizeIdx: number }) {
  const size = s.sizes.find(sz => sz.id === sizeId)
  if (!size) return null
  const isTTK = s.mode === 'ttk'
  const t = sizeTotals(s, sizeId)
  const finalNutri = s.calculateNutriForSize(sizeId)
  const showYield = isTTK && Math.abs(t.brutto - t.yieldG) >= 0.5

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid rgba(176,166,223,0.3)' }}>
      <div className="px-3 py-2 text-xs font-medium" style={{ background: '#EAE7F8', color: '#534AB7' }}>
        {size.name || (s.hasMultipleSizes ? `Размер ${sizeIdx + 1}` : 'Порция')} ({size.unit})
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.15)' }}>
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
      <div className="px-3 py-2 text-xs flex flex-wrap gap-x-3 gap-y-0.5" style={{ background: 'rgba(234,231,248,0.5)', color: '#534AB7' }}>
        <span>Σ <b>{Math.round(t.brutto)}</b> {size.unit}</span>
        {showYield && <span>выход <b>{Math.round(t.yieldG)}</b> {size.unit}</span>}
        <span><b>{Math.round(finalNutri.calories)}</b> ккал</span>
        <span>Б {finalNutri.protein.toFixed(1)}</span>
        <span>Ж {finalNutri.fat.toFixed(1)}</span>
        <span>У {finalNutri.carbs.toFixed(1)}</span>
      </div>
    </div>
  )
}

// ─── Mobile child (companion) row — вложенный масло/вода под родителем ─────

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

  const icon = child.companionKind === 'oil' ? '🛢' : '💧'

  return (
    <div className="px-3 py-2.5 space-y-1.5" style={{ background: 'rgba(176,166,223,0.04)', borderLeft: '2px solid rgba(176,166,223,0.4)', marginLeft: 16 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium min-w-0 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>↳</span>
          {icon} {childRef?.name ?? child.name}
          <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded-full" style={{ background: '#EAE7F8', color: '#534AB7' }}>
            {absorptionLabel} ×{absorption.toFixed(2)}
          </span>
        </div>
        {isFirstSize && <RemoveButton onClick={() => s.removeIngredient(child.id)} />}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          расход {amount} {child.unit} {amount > 0 && <>(в блюдо ушло {absorbed} {child.unit})</>}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            value={amount || ''}
            onChange={e => s.updateAmount(child.id, sizeId, Number(e.target.value))}
            placeholder="0"
            className="w-20 h-10 px-2 rounded-lg text-sm outline-none text-center"
            style={{ fontSize: 16, background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
          />
          <span className="text-xs w-4" style={{ color: 'var(--color-text-muted)' }}>{child.unit === 'шт' ? 'г' : child.unit}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile ingredient row (внутри MobileSizeCard) ──────────────────────────

function MobileIngredientRow({
  s, ingredient, sizeId, isFirstSize,
}: {
  s: ItemFormState
  ingredient: IngredientItem
  sizeId: string
  isFirstSize: boolean
}) {
  const ref = s.ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
  const srcCategory = asCategory(ref?.category)
  const isTTK = s.mode === 'ttk'
  const contrib = rowContribution(s, ingredient, sizeId)
  const amount = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === sizeId)?.amount || 0
  const isCount = ingredient.unit === 'шт'
  const showYield = isTTK && amount > 0 && Math.abs(contrib.brutto - contrib.finalGrams) >= 0.5

  const suggestions = isTTK && ingredient.processing && ingredient.processing !== 'raw'
    ? suggestCompanions(ingredient.processing, srcCategory)
    : []

  return (
    <div className="px-3 py-3 space-y-2.5">
      {/* Row 1: name + remove */}
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium min-w-0" style={{ color: 'var(--color-text-primary)' }}>
          {ingredient.name}
          <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>({ingredient.unit})</span>
        </div>
        {isFirstSize && <RemoveButton onClick={() => s.removeIngredient(ingredient.id)} />}
      </div>

      {/* Row 2: processing + lock toggle */}
      {isFirstSize && (
        <div className="flex items-start gap-2 flex-wrap">
          {isTTK && (
            <ProcessingChip
              processing={ingredient.processing}
              yieldOverride={ingredient.yieldOverride}
              ingredientRef={ref}
              onChangeProcessing={p => s.updateIngredientProcessing(ingredient.id, p)}
              onChangeYieldOverride={v => s.updateIngredientYieldOverride(ingredient.id, v)}
            />
          )}
          <button
            type="button"
            onClick={() => s.toggleIngredientLocked(ingredient.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0"
            style={{
              background: ingredient.locked ? '#FEF3C7' : 'rgba(176,166,223,0.15)',
              color: ingredient.locked ? '#92400E' : 'var(--color-text-muted)',
              border: ingredient.locked ? '0.5px solid #FDE68A' : '0.5px solid transparent',
            }}
          >
            {ingredient.locked ? '🔒 нельзя убрать' : '🔓 можно убрать'}
          </button>
        </div>
      )}

      {/* Companions (mobile) */}
      {isFirstSize && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map(sg => {
            const companionRef = findCompanionRef(s.ingredientRefs, sg.kind)
            if (!companionRef) return null
            // Блокируем только если companion уже добавлен как ребёнок ЭТОГО родителя
            if (s.ingredients.some(i => i.ingredientRefId === companionRef.id && i.parentIngredientId === ingredient.id)) return null
            const firstSize = s.sizes[0]
            const baseAmount = firstSize
              ? (s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === firstSize.id)?.amount ?? 0)
              : 0
            const preview = baseAmount > 0 ? Math.max(1, Math.round(baseAmount * sg.ratio)) : null
            return (
              <button
                key={sg.kind}
                type="button"
                onClick={() => s.addCompanionIngredient(ingredient.id, companionRef.id, sg.ratio, sg.kind)}
                className="text-[11px] px-2 py-1 rounded-full transition-all active:scale-95"
                style={{ background: '#EAE7F8', color: '#534AB7', border: '0.5px dashed rgba(83,74,183,0.4)' }}
              >
                🪄 {sg.label}{preview ? ` ~${preview}${companionRef.unit}` : ''}
              </button>
            )
          })}
        </div>
      )}

      {/* Row 3: КБЖУ totals · weight input */}
      <div className="flex items-center justify-between gap-2">
        <ContributionText contrib={contrib} />
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            inputMode={isCount ? 'numeric' : 'decimal'}
            step={isCount ? 1 : 0.1}
            min={0}
            value={amount || ''}
            onChange={e => s.updateAmount(ingredient.id, sizeId, isCount ? parseInt(e.target.value, 10) || 0 : Number(e.target.value))}
            placeholder={isCount ? 'шт' : '0'}
            className="w-20 h-11 px-2 rounded-lg text-sm outline-none text-center"
            style={{ fontSize: 16, background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
          />
          <span className="text-xs w-4" style={{ color: 'var(--color-text-muted)' }}>{sizeWeightUnit(s, ingredient)}</span>
        </div>
      </div>

      {/* Row 4: выход (без стрелочки) */}
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
    <div className="mb-6 p-4 rounded-xl" style={{ background: '#EAE7F8' }}>
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>Итоговое КБЖУ (на порцию)</p>
      <div className="space-y-3">
        {s.sizes.map(size => {
          const nutri = s.calculateNutriForSize(size.id)
          const isManual = s.manualNutri[size.id]?.isManual
          const t = sizeTotals(s, size.id)
          const showYield = s.mode === 'ttk' && Math.abs(t.brutto - t.yieldG) >= 0.5
          return (
            <div key={size.id} className="border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
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
                {isManual && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F2D965', color: '#635200' }}>
                    отредактировано
                  </span>
                )}
              </div>
              <NutriFields
                nutri={nutri}
                onChange={(field, value) => s.updateManualNutri(size.id, field, value)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── TTK Extras (final weight, serving size, cost) ──────────────────────────

function TTKExtras({ s }: { s: ItemFormState }) {
  const firstSizeId = s.sizes[0]?.id ?? 'default'
  const composition = s.ingredients.flatMap(ing => {
    const amount = s.amounts.find(a => a.ingredientId === ing.id && a.sizeId === firstSizeId)?.amount ?? 0
    if (!amount) return []
    return [{
      ingredientId: ing.ingredientRefId,
      amount,
      unit: ing.unit,
      processing: ing.processing,
      yieldOverride: ing.yieldOverride,
    }]
  })
  const expected = composition.length > 0 ? expectedDishYield(composition, s.ingredientRefs) : 0
  const cost = composition.length > 0 ? resolveCostOfDish(composition, s.ingredientRefs) : null

  const servings = s.finalWeight && s.servingSize && s.servingSize > 0
    ? Math.floor(s.finalWeight / s.servingSize)
    : null
  const costPerServing = cost && servings && servings > 0
    ? Math.round((cost.totalCost / servings) * 100) / 100
    : null

  return (
    <div className="mt-6 p-4 rounded-2xl space-y-4" style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)' }}>
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        <span>📋</span>
        <span>Технологическая карта</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Финальный вес блюда, г">
          <div className="flex gap-2">
            <FormInput
              type="number"
              value={s.finalWeight ?? ''}
              onChange={e => s.setFinalWeight(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="—"
              className="flex-1"
            />
            {expected > 0 && (
              <button
                type="button"
                onClick={() => s.setFinalWeight(expected)}
                className="px-3 py-2 rounded-xl text-xs whitespace-nowrap"
                style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
                title="Подставить ожидаемый вес по коэффициентам обработки"
              >
                ≈ {expected} г
              </button>
            )}
          </div>
          {expected > 0 && (
            <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Ожидаемый по коэффициентам: ≈ {expected} г
            </div>
          )}
        </FormField>

        <FormField label="Размер порции, г">
          <FormInput
            type="number"
            value={s.servingSize ?? ''}
            onChange={e => s.setServingSize(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="—"
          />
          {servings ? (
            <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              ≈ {servings} порций из этого блюда
            </div>
          ) : null}
        </FormField>
      </div>

      {cost && (
        <div className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
          {cost.totalCost > 0 && <div>Себестоимость блюда: <b style={{ color: 'var(--color-text-primary)' }}>{cost.totalCost.toFixed(2)} ₽</b></div>}
          {costPerServing !== null && <div>Себестоимость порции: <b style={{ color: 'var(--color-text-primary)' }}>{costPerServing.toFixed(2)} ₽</b></div>}
          {cost.missingPrices.length > 0 && (
            <div style={{ color: 'var(--color-text-muted)' }}>
              Цена не задана для: {cost.missingPrices.slice(0, 3).join(', ')}{cost.missingPrices.length > 3 ? '…' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
