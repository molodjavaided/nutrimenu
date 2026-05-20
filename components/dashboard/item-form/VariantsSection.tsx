'use client'

import { RemoveButton } from '@/components/ui/RemoveButton'
import { GlassCard, GlassButton, GlassDashedButton, GlassInput, GlassSelect, NutriPill } from '@/components/ui-kit'
import type { ItemFormState } from './useItemFormState'

const PlusIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

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
          <GlassCard key={group.id} tone="solid" padding="md" className="mb-6">
            <div className="flex gap-2 mb-3">
              <GlassInput
                value={group.label}
                onChange={e => s.updateVariantGroup(group.id, { label: e.target.value })}
                placeholder="Название группы (Крупа / Белок / Молоко)"
                className="flex-1"
              />
              <label
                className="flex items-center gap-2 text-xs cursor-pointer shrink-0"
                style={{ color: 'var(--color-text-secondary)' }}
              >
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
                <GlassSelect
                  value={group.replacesIngredientRefId || ''}
                  onChange={e => s.updateVariantGroup(group.id, { replacesIngredientRefId: e.target.value || undefined })}
                  className="flex-1"
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
                </GlassSelect>
                {replacedAmountsPerSize && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {replacedAmountsPerSize.map(({ size, amount }, idx) => (
                      <NutriPill key={size.id} tone="brand" size="xs">
                        {size.name || (s.sizes.length === 1 ? 'порция' : `Размер ${idx + 1}`)}: {amount} {size.unit}
                      </NutriPill>
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
                  <div
                    key={opt.id}
                    className="flex flex-col gap-2 p-3 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.55)',
                      border: '0.5px solid rgba(139,92,246,0.15)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <GlassButton
                        variant="secondary"
                        onClick={() => s.setVariantPickerTarget({ groupId: group.id, optionId: opt.id })}
                        fullWidth
                        className="justify-start text-left truncate"
                        style={selectedRef
                          ? undefined
                          : { color: 'var(--color-text-muted)' }
                        }
                      >
                        {selectedRef ? selectedRef.name : '— Выбрать ингредиент'}
                      </GlassButton>
                      <RemoveButton size="sm" onClick={() => s.removeVariantOption(group.id, opt.id)} />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {replacedAmountsPerSize ? (
                        <>
                          {replacedAmountsPerSize.map(({ size, amount }, idx) => (
                            <NutriPill key={size.id} tone="brand" size="xs">
                              {size.name || (s.sizes.length === 1 ? 'порция' : `Размер ${idx + 1}`)}: {amount} {size.unit}
                            </NutriPill>
                          ))}
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>из состава</span>
                        </>
                      ) : (
                        <div className="flex">
                          <GlassInput
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
                            className="w-20 text-center rounded-r-none"
                          />
                          <GlassSelect
                            value={opt.weightUnit}
                            onChange={e => s.updateVariantOption(group.id, opt.id, { weightUnit: e.target.value as 'г' | 'мл' })}
                            className="w-16 rounded-l-none"
                          >
                            <option value="г">г</option>
                            <option value="мл">мл</option>
                          </GlassSelect>
                        </div>
                      )}
                      {displayCalories > 0 && (
                        <NutriPill tone="calorie" size="xs" value={displayCalories} unit=" ккал" />
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <GlassInput
                          type="number"
                          inputMode="decimal"
                          value={opt.price ?? ''}
                          onChange={e => s.updateVariantOption(group.id, opt.id, { price: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="0"
                          className="w-16 text-center"
                        />
                        <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>₽</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <GlassDashedButton fullWidth onClick={() => s.addVariantOption(group.id)} leftIcon={PlusIcon}>
                Добавить вариант
              </GlassDashedButton>
            </div>
          </GlassCard>
        )
      })}

      <GlassDashedButton fullWidth onClick={s.addVariantGroup} leftIcon={PlusIcon}>
        Добавить группу вариантов
      </GlassDashedButton>
    </div>
  )
}
