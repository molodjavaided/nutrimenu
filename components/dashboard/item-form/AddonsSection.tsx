'use client'

import { FormInput } from '@/components/ui/form-fields'
import { GlassCard, GlassButton, GlassDashedButton, GlassInput, NutriPill } from '@/components/ui-kit'
import type { ItemFormState } from './useItemFormState'

const PlusIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const CloseIcon = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

export default function AddonsSection({ s }: { s: ItemFormState }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Добавки для гостя</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Ингредиенты, которые гость может добавить к блюду (сахар, молоко, соус и т.д.)
      </p>

      {s.addonGroups.map(group => (
        <GlassCard key={group.id} tone="glass" padding="md" className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FormInput
              value={group.label}
              onChange={e => s.updateAddonGroup(group.id, { label: e.target.value })}
              placeholder="Название группы (напр. Сахар)"
              className="flex-1"
            />
            <button
              onClick={() => s.removeAddonGroup(group.id)}
              className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0 transition-all active:scale-90"
              style={{ background: 'rgba(139,92,246,0.10)', color: 'var(--color-text-muted)' }}
              aria-label="Удалить группу добавок"
            >
              {CloseIcon}
            </button>
          </div>

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={group.allowCustomGrams}
              onChange={e => s.updateAddonGroup(group.id, { allowCustomGrams: e.target.checked })}
              className="w-4 h-4 rounded accent-lavender"
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Гость вводит граммы вручную</span>
          </label>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
            {group.allowCustomGrams
              ? 'КБЖУ хранится на 100 г — гость укажет количество и КБЖУ пересчитается'
              : 'Гость выбирает добавку кнопкой — КБЖУ добавляется целой порцией (+100 г)'
            }
          </p>

          {group.addons.map(addon => {
            const ref = s.ingredientRefs.find(r => r.id === addon.ingredientRefId)
            const weight = addon.weight && addon.weight > 0 ? addon.weight : 100
            const ratio = weight / 100
            const cal = ref ? Math.round(ref.caloriesPer100 * ratio) : 0
            const updateAddonField = (field: 'price' | 'weight', value: number | undefined) =>
              s.setAddonGroups(prev => prev.map(g =>
                g.id === group.id
                  ? { ...g, addons: g.addons.map(a => a.id === addon.id ? { ...a, [field]: value } : a) }
                  : g,
              ))
            return (
              <div
                key={addon.id}
                className="flex flex-col gap-2 mb-2 p-2 rounded-xl"
                style={{ background: 'rgba(139,92,246,0.05)', border: '0.5px solid rgba(139,92,246,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <GlassButton
                    variant="secondary"
                    onClick={() => s.setAddonPickerTarget({ groupId: group.id, addonId: addon.id })}
                    fullWidth
                    className="justify-start text-left truncate"
                    style={ref ? undefined : { color: 'var(--color-text-muted)' }}
                  >
                    {ref ? ref.name : '— Выбрать ингредиент'}
                  </GlassButton>
                  <button
                    onClick={() => s.removeAddon(group.id, addon.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0 transition-all active:scale-90"
                    style={{ background: 'rgba(139,92,246,0.10)', color: 'var(--color-text-muted)' }}
                    aria-label="Удалить добавку"
                  >
                    {CloseIcon}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <label className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Граммовка</span>
                    <GlassInput
                      type="number"
                      inputMode="decimal"
                      value={addon.weight ?? ''}
                      onChange={e => updateAddonField('weight', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="100"
                      className="w-16 text-center"
                    />
                    <span style={{ color: 'var(--color-text-muted)' }}>г</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Цена</span>
                    <GlassInput
                      type="number"
                      inputMode="decimal"
                      value={addon.price ?? ''}
                      onChange={e => updateAddonField('price', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="0"
                      className="w-16 text-center"
                    />
                    <span style={{ color: 'var(--color-text-muted)' }}>₽</span>
                  </label>
                  {ref && (
                    <span className="shrink-0 ml-auto">
                      <NutriPill tone="calorie" size="xs" value={`+${cal}`} unit=" ккал" />
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          <GlassDashedButton fullWidth onClick={() => s.addAddonToGroup(group.id)} leftIcon={PlusIcon} className="mt-1">
            Добавить ингредиент
          </GlassDashedButton>
        </GlassCard>
      ))}

      <GlassDashedButton fullWidth onClick={s.addAddonGroup} leftIcon={PlusIcon}>
        Добавить группу добавок
      </GlassDashedButton>
    </div>
  )
}
