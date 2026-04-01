'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { IngredientRef, MenuItem, ModifierGroup, SelectedModifiers, SelectedVariants, VariantGroup } from '@/types'
import { buildVariantLabel, resolveNutri, resolveNutriFromComposition } from '@/lib/utils'
import { getIngredients } from '@/lib/store'

interface Props {
  item: MenuItem | null
  open: boolean
  onClose: () => void
  onAdd: (item: MenuItem, quantity: number, variants: SelectedVariants, modifiers: SelectedModifiers, label: string) => void
}

function getDefaultVariants(item: MenuItem): SelectedVariants {
  const result: SelectedVariants = {}
  for (const g of item.variantGroups ?? []) {
    if (g.options[0]) result[g.id] = g.options[0].id
  }
  return result
}

function getDefaultModifiers(item: MenuItem): SelectedModifiers {
  const result: SelectedModifiers = {}
  for (const g of item.modifierGroups ?? []) {
    if (!g.multi && g.required && g.modifiers[0]) {
      result[g.id] = g.modifiers[0].id
    }
  }
  return result
}

export default function DishSheet({ item, open, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [variants, setVariants] = useState<SelectedVariants>({})
  const [modifiers, setModifiers] = useState<SelectedModifiers>({})


  // Инициализируем дефолты при смене блюда
  const [lastItemId, setLastItemId] = useState<string | null>(null)

  const [ingredientRefs, setIngredientRefs] = useState<IngredientRef[]>([])

useEffect(() => {
  setIngredientRefs(getIngredients())
}, [])

  if (item && item.id !== lastItemId) {
    setLastItemId(item.id)
    setQuantity(1)
    setVariants(getDefaultVariants(item))
    setModifiers(getDefaultModifiers(item))
  }

  function handleClose() {
    onClose()
  }

  if (!item) return null

// Получаем активный размер
const activeSize = item.sizes?.find(s => s.id === variants['size']) ?? item.sizes?.[0]

// Если есть состав — считаем из него с учётом замен
const resolved = activeSize?.composition?.length
  ? {
      ...resolveNutriFromComposition(
        activeSize.composition,
        ingredientRefs,
        item.modifierGroups ?? [],
        modifiers
      ),
      weight: activeSize.weight,
      weightUnit: activeSize.weightUnit,
    }
  : resolveNutri(item, variants, modifiers)
  const isValid = (item.variantGroups ?? []).every(g => variants[g.id])

  function handleAdd() {
    if (!isValid) return
    const label = buildVariantLabel(item!, variants, modifiers)
    onAdd(item!, quantity, variants, modifiers, label)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-5 pt-3 pb-8 max-w-lg mx-auto overflow-y-auto"
        style={{ background: '#FEFEF2', border: 'none', maxHeight: '90vh' }}
      >
        {/* Handle */}
        <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(176,166,223,0.5)' }} />

        {/* Фото */}
        <div className="w-full h-32 rounded-xl flex items-center justify-center text-5xl mb-4" style={{ background: '#EAE7F8' }}>
          🍽️
        </div>

        {/* Название */}
        <h2 className="text-lg font-medium mb-1" style={{ color: '#2C2950' }}>{item.name}</h2>
        {item.description && (
          <p className="text-sm mb-4 leading-relaxed" style={{ color: '#6B6490' }}>{item.description}</p>
        )}

        {/* КБЖУ плитки */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { val: Math.round(resolved.calories * quantity), label: 'ккал', accent: true },
            { val: `${Math.round(resolved.protein * quantity)}г`, label: 'белки', accent: false },
            { val: `${Math.round(resolved.fat * quantity)}г`, label: 'жиры', accent: false },
            { val: `${Math.round(resolved.carbs * quantity)}г`, label: 'углеводы', accent: false },
          ].map(({ val, label, accent }) => (
            <div key={label} className="rounded-xl p-2 text-center" style={{ background: '#EAE7F8' }}>
              <p className="text-sm font-medium" style={{ color: accent ? '#534AB7' : '#2C2950' }}>{val}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6B6490' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Группы вариантов */}
        {(item.variantGroups ?? []).map(group => (
          <VariantGroupSection
            key={group.id}
            group={group}
            selected={variants[group.id] ?? ''}
            onSelect={id => setVariants(v => ({ ...v, [group.id]: id }))}
          />
        ))}

        {/* Группы добавок */}
        {(item.modifierGroups ?? []).map(group => (
          <ModifierGroupSection
            key={group.id}
            group={group}
            selected={modifiers[group.id]}
            onSelect={(modId, subId) => {
              if (group.multi) {
                setModifiers(m => {
                  const cur = Array.isArray(m[group.id]) ? m[group.id] as unknown as string[] : []
                  const next = cur.includes(modId)
                    ? cur.filter(x => x !== modId)
                    : [...cur, modId]
                  return { ...m, [group.id]: next as unknown as string }
                })
              } else {
                setModifiers(m => ({ ...m, [group.id]: subId ?? modId }))
              }
            }}
          />
        ))}

        {/* Количество */}
        <div className="flex items-center gap-3 mb-5 mt-2">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}>
            −
          </button>
          <span className="text-base font-medium w-5 text-center" style={{ color: '#2C2950' }}>{quantity}</span>
          <button
            onClick={() => setQuantity(q => q + 1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}>
            +
          </button>
          <span className="text-sm ml-1" style={{ color: '#6B6490' }}>
            {quantity > 1 ? `${quantity} × ` : ''}{resolved.weight} {resolved.weightUnit}
          </span>
        </div>

        {/* Кнопка */}
        <button
          onClick={handleAdd}
          disabled={!isValid}
          className="w-full py-3 rounded-xl text-base font-medium transition-all"
          style={{
            background: isValid ? '#B0A6DF' : '#EAE7F8',
            color: isValid ? '#2C2950' : '#9D99B8',
            border: 'none',
          }}>
          {isValid ? 'Добавить в рацион' : 'Выберите параметры'}
        </button>
      </SheetContent>
    </Sheet>
  )
}

// Секция выбора варианта (объём, начинка, формат)
function VariantGroupSection({ group, selected, onSelect }: {
  group: VariantGroup
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium mb-2" style={{ color: '#2C2950' }}>{group.label}</p>
      <div className="flex flex-wrap gap-2">
        {group.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="px-3 py-1.5 rounded-full text-sm transition-all"
            style={selected === opt.id
              ? { background: '#B0A6DF', color: '#2C2950', border: '0.5px solid #B0A6DF' }
              : { background: '#EAE7F8', color: '#6B6490', border: '0.5px solid rgba(176,166,223,0.3)' }
            }>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Секция добавок
function ModifierGroupSection({ group, selected, onSelect }: {
  group: ModifierGroup
  selected: string | string[] | true | undefined
  onSelect: (modId: string, subId?: string) => void
}) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium mb-2" style={{ color: '#2C2950' }}>
        {group.label}
        {!group.required && <span className="text-xs font-normal ml-1" style={{ color: '#9D99B8' }}>необязательно</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {group.modifiers.map(mod => {
          const isSelected = Array.isArray(selected)
            ? selected.includes(mod.id)
            : selected === mod.id
          return (
            <button
              key={mod.id}
              onClick={() => onSelect(mod.id)}
              className="px-3 py-1.5 rounded-full text-sm transition-all"
              style={isSelected
                ? { background: '#B0A6DF', color: '#2C2950', border: '0.5px solid #B0A6DF' }
                : { background: '#EAE7F8', color: '#6B6490', border: '0.5px solid rgba(176,166,223,0.3)' }
              }>
              {mod.label}
              {mod.calories > 0 && group.type !== 'replace' && (
  <span className="ml-1 text-xs" style={{ color: isSelected ? '#534AB7' : '#9D99B8' }}>
    +{mod.calories} ккал
  </span>
)}
{group.type === 'replace' && mod.calories > 0 && (
  <span className="ml-1 text-xs" style={{ color: isSelected ? '#534AB7' : '#9D99B8' }}>
    {mod.calories} ккал/100{mod.weightUnit}
  </span>
)}
            </button>
          )
        })}
      </div>
    </div>
  )
}