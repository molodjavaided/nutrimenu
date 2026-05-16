'use client'

import { RemoveButton } from '@/components/ui/RemoveButton'
import type { ItemFormState } from './useItemFormState'

export default function VariantsSection({ s }: { s: ItemFormState }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--color-text-primary)' }}>Выборы для гостя</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Гость сможет выбирать из этих вариантов (крупа, начинка, белок и т.д.)
      </p>

      {s.variantGroups.map(group => {
        const replacedIng = group.replacesIngredientRefId
          ? s.ingredients.find(i => i.ingredientRefId === group.replacesIngredientRefId)
          : null
        const replacedAmountsPerSize = replacedIng
          ? s.sizes.map(sz => ({
              size: sz,
              amount: s.getAmountFromComposition(group.replacesIngredientRefId!, sz.id),
            }))
          : null

        return (
          <div key={group.id} className="mb-6 p-4 rounded-2xl" style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)' }}>
            <div className="flex gap-2 mb-3">
              <input
                value={group.label}
                onChange={e => s.updateVariantGroup(group.id, { label: e.target.value })}
                placeholder="Название группы (Крупа / Белок / Молоко)"
                className="flex-1 h-11 px-3 rounded-xl text-sm outline-none"
                style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
              />
              <label className="flex items-center gap-2 text-xs cursor-pointer shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={e => s.updateVariantGroup(group.id, { required: e.target.checked })}
                />
                Обязательный
              </label>
              <RemoveButton variant="light" onClick={() => s.removeVariantGroup(group.id)} />
            </div>

            {s.ingredients.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Заменяет:</span>
                <select
                  value={group.replacesIngredientRefId || ''}
                  onChange={e => s.updateVariantGroup(group.id, { replacesIngredientRefId: e.target.value || undefined })}
                  className="flex-1 h-11 px-3 rounded-xl text-sm outline-none"
                  style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">— не привязано (ручной ввод) —</option>
                  {s.ingredients.map(ing => {
                    const ref = s.ingredientRefs.find(r => r.id === ing.ingredientRefId)
                    return (
                      <option key={ing.ingredientRefId} value={ing.ingredientRefId}>
                        {ref?.name ?? ing.name}
                      </option>
                    )
                  })}
                </select>
                {replacedAmountsPerSize && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {replacedAmountsPerSize.map(({ size, amount }, idx) => (
                      <span key={size.id} className="px-2 py-0.5 rounded-lg text-xs"
                        style={{ background: '#D8D4F0', color: '#534AB7' }}>
                        {size.name || (s.sizes.length === 1 ? 'порция' : `Размер ${idx + 1}`)}: {amount} {size.unit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {group.options.map(opt => {
                const selectedRef = s.ingredientRefs.find(r => r.id === opt.ingredientRefId)
                const firstSizeAmount = replacedAmountsPerSize?.[0]?.amount ?? opt.weight
                const displayCalories = selectedRef && firstSizeAmount > 0
                  ? Math.round(selectedRef.caloriesPer100 * firstSizeAmount / 100)
                  : opt.calories

                return (
                  <div key={opt.id} className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: '#FEFEF2' }}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => s.setVariantPickerTarget({ groupId: group.id, optionId: opt.id })}
                        className="flex-1 h-10 px-3 rounded-lg text-sm text-left truncate transition-colors"
                        style={{
                          background: '#EAE7F8',
                          border: '0.5px solid rgba(176,166,223,0.3)',
                          color: selectedRef ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        }}
                      >
                        {selectedRef ? selectedRef.name : '— Выбрать ингредиент'}
                      </button>
                      <RemoveButton size="sm" onClick={() => s.removeVariantOption(group.id, opt.id)} />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {replacedAmountsPerSize ? (
                        <>
                          {replacedAmountsPerSize.map(({ size, amount }, idx) => (
                            <span key={size.id} className="px-2 py-1 rounded-lg text-xs"
                              style={{ background: '#EAE7F8', color: '#534AB7' }}>
                              {size.name || (s.sizes.length === 1 ? 'порция' : `Размер ${idx + 1}`)}: {amount} {size.unit}
                            </span>
                          ))}
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>из состава</span>
                        </>
                      ) : (
                        <div className="flex">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={opt.weight || ''}
                            onChange={e => {
                              const newWeight = Number(e.target.value)
                              s.updateVariantOption(group.id, opt.id, { weight: newWeight })
                              if (selectedRef) {
                                const ratio = newWeight / 100
                                s.updateVariantOption(group.id, opt.id, {
                                  calories: Math.round(selectedRef.caloriesPer100 * ratio),
                                  protein: Math.round(selectedRef.proteinPer100 * ratio * 10) / 10,
                                  fat: Math.round(selectedRef.fatPer100 * ratio * 10) / 10,
                                  carbs: Math.round(selectedRef.carbsPer100 * ratio * 10) / 10,
                                })
                              }
                            }}
                            placeholder="100"
                            className="w-20 h-10 px-2 rounded-l-lg text-sm outline-none text-center"
                            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                          />
                          <select
                            value={opt.weightUnit}
                            onChange={e => s.updateVariantOption(group.id, opt.id, { weightUnit: e.target.value as 'г' | 'мл' })}
                            className="w-16 h-10 px-1 rounded-r-lg text-sm outline-none"
                            style={{ background: '#D8D4F0', border: '0.5px solid rgba(176,166,223,0.3)', color: '#534AB7' }}
                          >
                            <option value="г">г</option>
                            <option value="мл">мл</option>
                          </select>
                        </div>
                      )}
                      {displayCalories > 0 && (
                        <span className="text-xs" style={{ color: '#534AB7' }}>{displayCalories} ккал</span>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={opt.price ?? ''}
                          onChange={e => s.updateVariantOption(group.id, opt.id, { price: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="0"
                          className="w-16 h-8 px-2 rounded-lg text-sm outline-none text-center"
                          style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                        />
                        <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>₽</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => s.addVariantOption(group.id)}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl w-full"
                style={{ color: '#B0A6DF', background: 'rgba(176,166,223,0.1)', border: '0.5px dashed rgba(176,166,223,0.6)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Добавить вариант
              </button>
            </div>
          </div>
        )
      })}

      <button
        onClick={s.addVariantGroup}
        className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm w-full justify-center"
        style={{ border: '0.5px dashed rgba(176,166,223,0.6)', color: '#B0A6DF', background: '#EAE7F8' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        + Добавить группу вариантов
      </button>
    </div>
  )
}
