'use client'

import { FormField, FormInput, FormSelect, NutriFields } from '@/components/ui/form-fields'
import { RemoveButton } from '@/components/ui/RemoveButton'
import { MAX_SIZES, type ItemFormState } from './useItemFormState'
import { expectedDishYield, resolveCostOfDish } from '@/lib/utils'
import { asCategory } from '@/lib/cooking-coefficients'
import { findCompanionRef, suggestCompanions } from '@/lib/cooking-companions'
import ProcessingChip from './ProcessingChip'

export default function CompositionSection({ s }: { s: ItemFormState }) {
  return (
    <>
      <FormField label="Состав" required>
        <div className="space-y-2">
          {s.ingredients.map(ing => {
            const ref = s.ingredientRefs.find(r => r.id === ing.ingredientRefId)
            const srcCategory = asCategory(ref?.category)
            const suggestions = s.mode === 'ttk' && ing.processing && ing.processing !== 'raw'
              ? suggestCompanions(ing.processing, srcCategory)
              : []
            return (
              <div key={ing.id}>
                <div className="flex items-center gap-2">
                  <span className="flex-1 px-3 py-2 rounded-xl text-sm" style={{ background: '#EAE7F8', color: 'var(--color-text-primary)' }}>
                    {ing.name}
                  </span>
                  {s.mode === 'ttk' && (
                    <ProcessingChip
                      processing={ing.processing}
                      yieldOverride={ing.yieldOverride}
                      ingredientRef={ref}
                      onChangeProcessing={p => s.updateIngredientProcessing(ing.id, p)}
                      onChangeYieldOverride={v => s.updateIngredientYieldOverride(ing.id, v)}
                    />
                  )}
                  <RemoveButton onClick={() => s.removeIngredient(ing.id)} />
                </div>
                {suggestions.length > 0 && (
                  <div className="ml-2 mt-1 flex flex-wrap gap-1.5">
                    {suggestions.map(sg => {
                      const companionRef = findCompanionRef(s.ingredientRefs, sg.kind)
                      if (!companionRef) return null
                      if (s.ingredients.some(i => i.ingredientRefId === companionRef.id)) return null
                      const firstSize = s.sizes[0]
                      const baseAmount = firstSize
                        ? (s.amounts.find(a => a.ingredientId === ing.id && a.sizeId === firstSize.id)?.amount ?? 0)
                        : 0
                      const preview = baseAmount > 0 ? Math.max(1, Math.round(baseAmount * sg.ratio)) : null
                      return (
                        <button
                          key={sg.kind}
                          type="button"
                          onClick={() => s.addCompanionIngredient(ing.id, companionRef.id, sg.ratio)}
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
          })}

          <button
            type="button"
            onClick={() => s.setPickerOpen(true)}
            className="w-full h-10 px-3 rounded-xl text-sm flex items-center gap-2"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Выбрать из справочника
          </button>
        </div>
      </FormField>

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

      {s.ingredients.length > 0 && s.sizes.length > 0 && (
        <div className="mb-5">
          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {s.sizes.map((size, sizeIdx) => {
              const sizeNutri = s.calculateNutriForSize(size.id)
              let sizeWeight = 0
              for (const ingredient of s.ingredients) {
                const cell = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
                if (!cell?.amount) continue
                if (ingredient.unit === 'шт') {
                  const ref = s.ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
                  sizeWeight += ref?.weightPerUnit ? cell.amount * ref.weightPerUnit : cell.amount
                } else {
                  sizeWeight += cell.amount
                }
              }
              return (
              <div key={size.id} className="rounded-xl overflow-hidden" style={{ border: '0.5px solid rgba(176,166,223,0.3)' }}>
                <div className="px-3 py-2 text-xs font-medium" style={{ background: '#EAE7F8', color: '#534AB7' }}>
                  {size.name || (s.hasMultipleSizes ? `Размер ${sizeIdx + 1}` : 'Порция')} ({size.unit})
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.15)' }}>
                  {s.ingredients.map(ingredient => {
                    const unit = ingredient.unit
                    const isCount = unit === 'шт'
                    const amount = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)?.amount || 0
                    return (
                      <div key={ingredient.id} className="flex items-center justify-between px-3 py-2 gap-3" style={{ borderColor: 'rgba(176,166,223,0.15)' }}>
                        <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {ingredient.name}
                          <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>({unit})</span>
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            inputMode={isCount ? 'numeric' : 'decimal'}
                            step={isCount ? 1 : 0.1}
                            min={0}
                            value={amount || ''}
                            onChange={e => s.updateAmount(ingredient.id, size.id, isCount ? parseInt(e.target.value, 10) || 0 : Number(e.target.value))}
                            placeholder={isCount ? 'шт' : '0'}
                            className="w-20 h-11 px-2 rounded-lg text-sm outline-none text-center"
                            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
                          />
                          <span className="text-xs w-4" style={{ color: 'var(--color-text-muted)' }}>{unit}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-3 py-2 text-xs flex flex-wrap gap-x-3 gap-y-0.5" style={{ background: 'rgba(234,231,248,0.5)', color: '#534AB7' }}>
                  <span>Σ <b>{Math.round(sizeWeight)}</b> {size.unit}</span>
                  <span><b>{Math.round(sizeNutri.calories)}</b> ккал</span>
                  <span>Б {sizeNutri.protein.toFixed(1)}</span>
                  <span>Ж {sizeNutri.fat.toFixed(1)}</span>
                  <span>У {sizeNutri.carbs.toFixed(1)}</span>
                </div>
              </div>
              )
            })}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Ингредиент</th>
                  {s.sizes.map((size, idx) => (
                    <th key={size.id} className="text-center py-2 px-2 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {size.name || (s.hasMultipleSizes ? `Размер ${idx + 1}` : 'Порция')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.ingredients.map(ingredient => {
                  const unit = ingredient.unit
                  const isCount = unit === 'шт'
                  return (
                    <tr key={ingredient.id}>
                      <td className="py-2 px-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {ingredient.name}
                        <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>({unit})</span>
                      </td>
                      {s.sizes.map(size => {
                        const amount = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)?.amount || 0
                        return (
                          <td key={size.id} className="py-1 px-2">
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                inputMode={isCount ? 'numeric' : 'decimal'}
                                step={isCount ? 1 : 0.1}
                                min={0}
                                value={amount || ''}
                                onChange={e => s.updateAmount(ingredient.id, size.id, isCount ? parseInt(e.target.value, 10) || 0 : Number(e.target.value))}
                                placeholder={isCount ? 'шт' : '0'}
                                className="w-20 h-11 px-2 rounded-lg text-sm outline-none text-center"
                                style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
                              />
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{unit}</span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid rgba(176,166,223,0.3)' }}>
                  <td className="py-2 px-3 text-xs font-medium" style={{ color: '#534AB7' }}>Σ итого</td>
                  {s.sizes.map(size => {
                    const n = s.calculateNutriForSize(size.id)
                    let w = 0
                    for (const ingredient of s.ingredients) {
                      const cell = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
                      if (!cell?.amount) continue
                      if (ingredient.unit === 'шт') {
                        const ref = s.ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
                        w += ref?.weightPerUnit ? cell.amount * ref.weightPerUnit : cell.amount
                      } else {
                        w += cell.amount
                      }
                    }
                    return (
                      <td key={size.id} className="py-2 px-2 text-center text-xs" style={{ color: '#534AB7' }}>
                        <div><b>{Math.round(w)}</b> {size.unit} · <b>{Math.round(n.calories)}</b> ккал</div>
                        <div style={{ color: 'var(--color-text-muted)' }}>Б {n.protein.toFixed(1)} · Ж {n.fat.toFixed(1)} · У {n.carbs.toFixed(1)}</div>
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {s.sizes.length > 0 && s.ingredients.length > 0 && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: '#EAE7F8' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>Итоговое КБЖУ (на порцию)</p>
          <div className="space-y-3">
            {s.sizes.map(size => {
              const nutri = s.calculateNutriForSize(size.id)
              const isManual = s.manualNutri[size.id]?.isManual

              let totalWeight = 0
              for (const ingredient of s.ingredients) {
                const amountCell = s.amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
                if (amountCell?.amount) {
                  if (ingredient.unit === 'шт') {
                    const ref = s.ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
                    totalWeight += ref?.weightPerUnit
                      ? amountCell.amount * ref.weightPerUnit
                      : amountCell.amount
                  } else {
                    totalWeight += amountCell.amount
                  }
                }
              }

              return (
                <div key={size.id} className="border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
                  <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <div>
                      <span className="text-sm font-medium" style={{ color: '#534AB7' }}>
                        {size.name || (s.hasMultipleSizes ? 'Новый размер' : 'Порция')}
                      </span>
                      {totalWeight > 0 && (
                        <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
                          ({Math.round(totalWeight)} {size.unit})
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
      )}

      {s.mode === 'ttk' && <TTKExtras s={s} />}
    </>
  )
}

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
