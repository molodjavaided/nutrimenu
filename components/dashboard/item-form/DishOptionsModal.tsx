'use client'

import { useState } from 'react'
import { SizePortionSection } from './CompositionSection'
import { RemoveButton } from '@/components/ui/RemoveButton'
import { GlassCard, GlassButton, GlassDashedButton, GlassInput, GlassSelect, NutriPill } from '@/components/ui-kit'
import { FormInput } from '@/components/ui/form-fields'
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
const InfoIcon = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 6.5v3M7 4.5v.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

type Tab = 'sizes' | 'choice' | 'addons'

interface Props {
  s: ItemFormState
  open: boolean
  onClose: () => void
}

export default function DishOptionsModal({ s, open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('sizes')
  const [helpOpen, setHelpOpen] = useState(false)

  if (!open) return null

  const sizesCount = s.hasMultipleSizes ? s.sizes.length : 0
  const choiceCount = s.variantGroups.length
  const addonsCount = s.addonGroups.length

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Опции блюда"
      className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center"
      style={{ background: 'rgba(20,18,40,0.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full md:max-w-3xl md:max-h-[90vh] md:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ color: 'var(--color-text-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b" style={{ borderColor: 'rgba(139,92,246,0.18)' }}>
          <h2 className="text-base md:text-lg font-medium">Опции для гостя</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
            style={{ background: 'rgba(139,92,246,0.10)', color: 'var(--color-text-muted)' }}
            aria-label="Закрыть"
          >
            {CloseIcon}
          </button>
        </div>

        {/* Tabs (segmented) */}
        <div className="px-3 md:px-6 pt-3 md:pt-4">
          <div className="inline-flex w-full gap-1 p-1 rounded-xl" style={{ background: 'rgba(176,166,223,0.18)', border: '0.5px solid rgba(139,92,246,0.18)' }}>
            <TabButton active={tab === 'sizes'} onClick={() => setTab('sizes')} label="📏 Размеры" count={sizesCount} />
            <TabButton active={tab === 'choice'} onClick={() => setTab('choice')} label="🔄 На выбор" count={choiceCount} />
            <TabButton active={tab === 'addons'} onClick={() => setTab('addons')} label="➕ Добавки" count={addonsCount} />
          </div>

          {/* Collapsible help */}
          <button
            type="button"
            onClick={() => setHelpOpen(v => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {InfoIcon} Не уверены, что выбрать? {helpOpen ? '▴' : '▾'}
          </button>
          {helpOpen && (
            <div className="mt-2 text-xs space-y-1.5 p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.06)', color: 'var(--color-text-secondary)' }}>
              <p><b>Размеры</b> — если меняется <b>вес всего блюда</b> (S/M/L пиццы, объём кофе).</p>
              <p><b>На выбор</b> — гость выбирает <b>одну</b> опцию из равноценных. Цена обычно одна (гарнир, молоко в кофе, прожарка).</p>
              <p><b>Добавки</b> — гость <b>доплачивает</b> за лишнее (двойной сыр, доп. шот). КБЖУ плюсуется.</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {tab === 'sizes' && <SizesTab s={s} />}
          {tab === 'choice' && <ChoiceTab s={s} />}
          {tab === 'addons' && <AddonsTab s={s} />}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t flex justify-end" style={{ borderColor: 'rgba(139,92,246,0.18)', background: 'rgba(176,166,223,0.06)' }}>
          <GlassButton variant="brand" onClick={onClose}>Готово</GlassButton>
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all active:scale-[0.97] truncate"
      style={active
        ? { background: 'var(--color-text-primary)', color: '#FEFEF2', boxShadow: '0 2px 8px rgba(44,41,80,0.18)' }
        : { color: 'var(--color-text-secondary)', background: 'transparent' }
      }
    >
      {label}{count > 0 ? ` · ${count}` : ''}
    </button>
  )
}

// ─── Tab 1: Sizes ────────────────────────────────────────────────────────────
function SizesTab({ s }: { s: ItemFormState }) {
  return (
    <div>
      <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Например: «Эспрессо S/M/L», «Пицца 25/30/35 см». При нескольких размерах состав хранится отдельно для каждого размера.
      </p>
      <SizePortionSection s={s} />
    </div>
  )
}

// ─── Tab 2: Choice (variants + replace as radio) ─────────────────────────────
function ChoiceTab({ s }: { s: ItemFormState }) {
  if (s.variantGroups.length === 0) {
    return (
      <div>
        <EmptyHint
          text="Гость должен выбрать одну опцию из набора?"
          examples={['Гарнир: рис / гречка / картофель', 'Молоко: обычное / овсяное / миндальное', 'Прожарка: medium / rare / well-done']}
        />
        <GlassDashedButton fullWidth onClick={s.addVariantGroup} leftIcon={PlusIcon}>
          Добавить выбор
        </GlassDashedButton>
      </div>
    )
  }

  return (
    <div>
      {s.variantGroups.map(group => <ChoiceGroupCard key={group.id} s={s} group={group} />)}
      <GlassDashedButton fullWidth onClick={s.addVariantGroup} leftIcon={PlusIcon}>
        Добавить ещё один выбор
      </GlassDashedButton>
    </div>
  )
}

function ChoiceGroupCard({ s, group }: { s: ItemFormState; group: ItemFormState['variantGroups'][number] }) {
  const usesComposition = !!group.replacesIngredientRefId
  const replacedIng = usesComposition ? s.ingredients.find(i => i.ingredientRefId === group.replacesIngredientRefId) : null
  const replacedAmountsPerSize = replacedIng
    ? s.sizes.map(sz => ({ size: sz, amount: s.getAmountFromComposition(group.replacesIngredientRefId!, sz.id) }))
    : null

  return (
    <GlassCard tone="solid" padding="md" className="mb-6">
      {/* Header */}
      <div className="flex gap-2 mb-3">
        <GlassInput
          value={group.label}
          onChange={e => s.updateVariantGroup(group.id, { label: e.target.value })}
          placeholder="Название (Гарнир / Молоко / Прожарка)"
          className="flex-1"
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

      {/* ① Откуда брать КБЖУ */}
      <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.04)' }}>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          ① Откуда брать КБЖУ для опций?
        </p>
        <label className="flex items-start gap-2 cursor-pointer mb-2">
          <input
            type="radio"
            checked={usesComposition}
            disabled={s.ingredients.length === 0}
            onChange={() => {
              if (s.ingredients.length > 0) {
                s.updateVariantGroup(group.id, { replacesIngredientRefId: s.ingredients[0].ingredientRefId })
              }
            }}
            className="mt-0.5"
          />
          <div className="text-xs">
            <span style={{ color: 'var(--color-text-primary)' }}>Заменяют ингредиент из состава</span>
            {s.ingredients.length === 0 && (
              <span className="ml-1" style={{ color: 'var(--color-text-muted)' }}>— добавьте сначала состав блюда</span>
            )}
          </div>
        </label>
        {usesComposition && (
          <div className="ml-6 mb-2 flex items-center gap-2 flex-wrap">
            <GlassSelect
              value={group.replacesIngredientRefId || ''}
              onChange={e => s.updateVariantGroup(group.id, { replacesIngredientRefId: e.target.value || undefined })}
              className="flex-1 min-w-[180px]"
            >
              {s.ingredients.map(ing => {
                const ref = s.ingredientRefs.find(r => r.id === ing.ingredientRefId)
                return <option key={ing.ingredientRefId} value={ing.ingredientRefId}>{ref?.name ?? ing.name}</option>
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
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!usesComposition}
            onChange={() => s.updateVariantGroup(group.id, { replacesIngredientRefId: undefined })}
            className="mt-0.5"
          />
          <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
            У каждой опции свои КБЖУ (ручной ввод)
          </span>
        </label>
      </div>

      {/* ② Options */}
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>② Варианты</p>
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
              style={{ background: 'rgba(255,255,255,0.55)', border: '0.5px solid rgba(139,92,246,0.15)' }}
            >
              <div className="flex items-center gap-2">
                <GlassButton
                  variant="secondary"
                  onClick={() => s.setVariantPickerTarget({ groupId: group.id, optionId: opt.id })}
                  fullWidth
                  className="justify-start text-left truncate"
                  style={selectedRef ? undefined : { color: 'var(--color-text-muted)' }}
                >
                  {selectedRef ? selectedRef.name : '— Выбрать ингредиент'}
                </GlassButton>
                <RemoveButton size="sm" onClick={() => s.removeVariantOption(group.id, opt.id)} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {usesComposition ? (
                  <>
                    {(replacedAmountsPerSize ?? []).map(({ size, amount }, idx) => (
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
                      min={0}
                      value={opt.weight || ''}
                      onChange={e => {
                        const newWeight = Math.max(0, Number(e.target.value))
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
                    min={0}
                    value={opt.price ?? ''}
                    onChange={e => s.updateVariantOption(group.id, opt.id, { price: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })}
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
}

// ─── Tab 3: Addons ───────────────────────────────────────────────────────────
function AddonsTab({ s }: { s: ItemFormState }) {
  if (s.addonGroups.length === 0) {
    return (
      <div>
        <EmptyHint
          text="Гость может доплатить за дополнительные ингредиенты?"
          examples={['+ Двойной сыр (+50₽)', '+ Шот эспрессо (+60₽)', '+ Карамельный сироп']}
        />
        <GlassDashedButton fullWidth onClick={s.addAddonGroup} leftIcon={PlusIcon}>
          Добавить добавку
        </GlassDashedButton>
      </div>
    )
  }

  return (
    <div>
      {s.addonGroups.map(group => <AddonGroupCard key={group.id} s={s} group={group} />)}
      <GlassDashedButton fullWidth onClick={s.addAddonGroup} leftIcon={PlusIcon}>
        Добавить ещё одну группу добавок
      </GlassDashedButton>
    </div>
  )
}

function AddonGroupCard({ s, group }: { s: ItemFormState; group: ItemFormState['addonGroups'][number] }) {
  return (
    <GlassCard tone="glass" padding="md" className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <FormInput
          value={group.label}
          onChange={e => s.updateAddonGroup(group.id, { label: e.target.value })}
          placeholder="Название (напр. Доп. сыр)"
          className="flex-1"
        />
        <button
          onClick={() => s.removeAddonGroup(group.id)}
          className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0 transition-all active:scale-90"
          style={{ background: 'rgba(139,92,246,0.10)', color: 'var(--color-text-muted)' }}
          aria-label="Удалить группу"
        >
          {CloseIcon}
        </button>
      </div>

      <label className="flex items-center gap-2 mb-1 cursor-pointer">
        <input
          type="checkbox"
          checked={group.allowCustomGrams}
          onChange={e => s.updateAddonGroup(group.id, { allowCustomGrams: e.target.checked })}
          className="w-4 h-4 rounded accent-lavender"
        />
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Гость выбирает количество (1 порция / N грамм)
        </span>
      </label>
      <p className="text-xs mb-3 ml-6" style={{ color: 'var(--color-text-muted)' }}>
        {group.allowCustomGrams
          ? 'Включи, если «двойной/тройной» — норма для блюда. Гость указывает граммы, КБЖУ пересчитается.'
          : 'Выключено: гость нажимает кнопку «добавить» — КБЖУ плюсуется фиксированной порцией (по умолчанию 100 г).'
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
                  min={0}
                  value={addon.weight ?? ''}
                  onChange={e => updateAddonField('weight', e.target.value ? Math.max(0, Number(e.target.value)) : undefined)}
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
                  min={0}
                  value={addon.price ?? ''}
                  onChange={e => updateAddonField('price', e.target.value ? Math.max(0, Number(e.target.value)) : undefined)}
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
  )
}

// ─── Shared ─────────────────────────────────────────────────────────────────
function EmptyHint({ text, examples }: { text: string; examples: string[] }) {
  return (
    <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(139,92,246,0.04)' }}>
      <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>{text}</p>
      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Например:</p>
      <ul className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
        {examples.map(ex => <li key={ex}>• {ex}</li>)}
      </ul>
    </div>
  )
}
