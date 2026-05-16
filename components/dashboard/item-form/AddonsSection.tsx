'use client'

import { FormInput } from '@/components/ui/form-fields'
import type { ItemFormState } from './useItemFormState'

export default function AddonsSection({ s }: { s: ItemFormState }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Добавки для гостя</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Ингредиенты, которые гость может добавить к блюду (сахар, молоко, соус и т.д.)
      </p>

      {s.addonGroups.map(group => (
        <div key={group.id} className="mb-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(176,166,223,0.3)' }}>
          <div className="flex items-center gap-2 mb-3">
            <FormInput
              value={group.label}
              onChange={e => s.updateAddonGroup(group.id, { label: e.target.value })}
              placeholder="Название группы (напр. Сахар)"
              className="flex-1"
            />
            <button
              onClick={() => s.removeAddonGroup(group.id)}
              className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
              style={{ background: '#EAE7F8', color: 'var(--color-text-muted)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
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
            return (
              <div key={addon.id} className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => s.setAddonPickerTarget({ groupId: group.id, addonId: addon.id })}
                  className="flex-1 h-10 px-3 rounded-xl text-sm text-left truncate"
                  style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: ref ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                >
                  {ref ? ref.name : '— Выбрать ингредиент'}
                </button>
                {ref && (
                  <span className="text-xs shrink-0" style={{ color: '#534AB7' }}>
                    {ref.caloriesPer100} ккал/100г
                  </span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={addon.price ?? ''}
                    onChange={e => s.setAddonGroups(prev => prev.map(g =>
                      g.id === group.id
                        ? { ...g, addons: g.addons.map(a => a.id === addon.id ? { ...a, price: e.target.value ? Number(e.target.value) : undefined } : a) }
                        : g
                    ))}
                    placeholder="0"
                    className="w-14 h-10 px-2 rounded-xl text-sm outline-none text-center"
                    style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>₽</span>
                </div>
                <button
                  onClick={() => s.removeAddon(group.id, addon.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
                  style={{ background: '#EAE7F8', color: 'var(--color-text-muted)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )
          })}

          <button
            onClick={() => s.addAddonToGroup(group.id)}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl w-full mt-1"
            style={{ color: '#B0A6DF', background: 'rgba(176,166,223,0.1)', border: '0.5px dashed rgba(176,166,223,0.6)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Добавить ингредиент
          </button>
        </div>
      ))}

      <button
        onClick={s.addAddonGroup}
        className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm w-full justify-center"
        style={{ border: '0.5px dashed rgba(176,166,223,0.6)', color: '#B0A6DF', background: '#EAE7F8' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        + Добавить группу добавок
      </button>
    </div>
  )
}
