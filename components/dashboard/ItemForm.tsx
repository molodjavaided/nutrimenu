'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MenuItem, VariantGroup, ModifierGroup, VariantOption, Modifier, SizeOption, Ingredient, IngredientRef, CompositionRow } from '@/types'
import { getCategories, saveCategories, getItemById, getIngredients } from '@/lib/store'
import { Category } from '@/types'

interface Props {
  itemId?: string
  categoryId?: string
}

const EMPTY_ITEM: Omit<MenuItem, 'id' | 'categoryId' | 'venueId'> = {
  name: '',
  description: '',
  weight: 0,
  weightUnit: 'г',
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  isAvailable: true,
  variantGroups: [],
  modifierGroups: [],
}

function newSize(unit: 'г' | 'мл' = 'г'): SizeOption {
  return {
    id: crypto.randomUUID(),
    weight: 0,
    weightUnit: unit,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    composition: [],
  }
}

const INGREDIENT_CATEGORIES = ['Молоко', 'Крупа', 'Мясо и рыба', 'Овощи', 'Фрукты', 'Соусы', 'Выпечка', 'Прочее']
export default function ItemForm({ itemId, categoryId: initialCategoryId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? '')
  const [item, setItem] = useState({ ...EMPTY_ITEM })
  const [sizes, setSizes] = useState<SizeOption[]>([newSize('г')])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const isEdit = !!itemId
  const [ingredientRefs, setIngredientRefs] = useState<IngredientRef[]>([])
const [composition, setComposition] = useState<CompositionRow[]>([])

  useEffect(() => {
    setIngredientRefs(getIngredients())
    const cats = getCategories()
    setCategories(cats)
    if (!initialCategoryId && cats[0]) setCategoryId(cats[0].id)

    if (itemId) {
      const found = getItemById(itemId)
      if (found) {
        setItem({ ...found.item })
        setCategoryId(found.categoryId)

        if (found.item.sizes && found.item.sizes.length > 0) {
          setSizes(found.item.sizes)
        } else {
          setSizes([{
            id: crypto.randomUUID(),
            weight: found.item.weight,
            weightUnit: found.item.weightUnit,
            calories: found.item.calories,
            protein: found.item.protein,
            fat: found.item.fat,
            carbs: found.item.carbs,
            ingredientAmounts: {},
          }])
        }

        if (found.item.ingredients && found.item.ingredients.length > 0) {
          setIngredients(found.item.ingredients)
        }
      }
    }
  }, [itemId, initialCategoryId])

  function calculateNutri() {
  setSizes(prev => prev.map(size => {
    let cal = 0, prot = 0, fat = 0, carbs = 0

    for (const row of size.composition) {
      const ref = ingredientRefs.find(r => r.id === row.ingredientId)
      if (!ref || !row.amount) continue
      const ratio = row.amount / 100
      cal   += ref.caloriesPer100 * ratio
      prot  += ref.proteinPer100  * ratio
      fat   += ref.fatPer100      * ratio
      carbs += ref.carbsPer100    * ratio
    }

    return {
      ...size,
      calories: Math.round(cal),
      protein:  Math.round(prot  * 10) / 10,
      fat:      Math.round(fat   * 10) / 10,
      carbs:    Math.round(carbs * 10) / 10,
    }
  }))

  // Синхронизируем базовые поля с первым размером
  const size0 = sizes[0]
  if (size0) {
    let cal = 0, prot = 0, fat = 0, carbs = 0
    for (const row of size0.composition) {
      const ref = ingredientRefs.find(r => r.id === row.ingredientId)
      if (!ref || !row.amount) continue
      const ratio = row.amount / 100
      cal   += ref.caloriesPer100 * ratio
      prot  += ref.proteinPer100  * ratio
      fat   += ref.fatPer100      * ratio
      carbs += ref.carbsPer100    * ratio
    }
    updateField('calories', Math.round(cal))
    updateField('protein',  Math.round(prot  * 10) / 10)
    updateField('fat',      Math.round(fat   * 10) / 10)
    updateField('carbs',    Math.round(carbs * 10) / 10)
  }
}

  function updateField<K extends keyof typeof item>(key: K, value: typeof item[K]) {
    setItem(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const cats = getCategories()

    // Если несколько размеров — конвертируем в variantGroup 'size'
    const sizeVariantGroup: VariantGroup | null = sizes.length > 1 ? {
      id: 'size',
      label: 'Объём',
      required: true,
      options: sizes.map(s => ({
        id: s.id,
        label: `${s.weight} ${s.weightUnit}`,
        calories: s.calories,
        protein: s.protein,
        fat: s.fat,
        carbs: s.carbs,
        weight: s.weight,
        weightUnit: s.weightUnit,
      })),
    } : null

    const existingVariantGroups = (item.variantGroups ?? []).filter(g => g.id !== 'size')

    const newItem: MenuItem = {
      ...item,
      id: itemId ?? crypto.randomUUID(),
      categoryId,
      venueId: '1',
      weight: sizes[0].weight,
      weightUnit: sizes[0].weightUnit,
      calories: sizes[0].calories,
      protein: sizes[0].protein,
      fat: sizes[0].fat,
      carbs: sizes[0].carbs,
      sizes,
      ingredients,
      variantGroups: sizeVariantGroup
        ? [sizeVariantGroup, ...existingVariantGroups]
        : existingVariantGroups,
    }

    let updated: Category[]
    if (isEdit) {
      updated = cats.map(c => ({
        ...c,
        items: (c.items ?? []).map(i => i.id === itemId ? newItem : i),
      }))
    } else {
      updated = cats.map(c =>
        c.id === categoryId
          ? { ...c, items: [...(c.items ?? []), newItem] }
          : c
      )
    }

    saveCategories(updated)
    router.push('/dashboard/menu')
  }

  const stepTitles = ['Основное', 'Варианты', 'Добавки']

  // variantGroups без 'size' — для шага 2 и добавок
  const userVariantGroups = (item.variantGroups ?? []).filter(g => g.id !== 'size')

  // Итоговые variantGroups для добавок — размеры + пользовательские
  const allVariantGroupsForModifiers: VariantGroup[] = [
    ...(sizes.length > 1 ? [{
      id: 'size',
      label: 'Объём',
      required: true,
      options: sizes.map(s => ({
        id: s.id,
        label: `${s.weight} ${s.weightUnit}`,
        calories: s.calories,
        protein: s.protein,
        fat: s.fat,
        carbs: s.carbs,
        weight: s.weight,
        weightUnit: s.weightUnit,
      })),
    }] : []),
    ...userVariantGroups,
  ]

  return (
    <div className="p-8 max-w-3xl">

      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: '#EAE7F8', color: '#6B6490' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-xl font-medium" style={{ color: '#2C2950' }}>
          {isEdit ? 'Редактировать блюдо' : 'Новое блюдо'}
        </h1>
      </div>

      {/* Шаги */}
      <div className="flex gap-2 mb-8">
        {stepTitles.map((title, i) => {
          const n = i + 1
          const active = step === n
          const done = step > n
          return (
            <button
              key={n}
              onClick={() => setStep(n)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all"
              style={active
                ? { background: '#B0A6DF', color: '#2C2950' }
                : done
                  ? { background: '#EAE7F8', color: '#534AB7' }
                  : { background: '#EAE7F8', color: '#9D99B8' }
              }
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ background: active ? '#FEFEF2' : 'transparent' }}>
                {done ? '✓' : n}
              </span>
              {title}
            </button>
          )
        })}
      </div>

      {/* Шаг 1 — Основное */}
      {step === 1 && (
        <div className="flex flex-col gap-5">

          {/* Категория */}
          <Field label="Категория *">
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl text-sm outline-none"
              style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* Название */}
          <Field label="Название *">
            <input
              value={item.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Например: Капучино"
              className="w-full h-10 px-3 rounded-xl text-sm outline-none"
              style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
            />
          </Field>

          {/* Описание */}
          <Field label="Описание">
            <textarea
              value={item.description ?? ''}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Состав, особенности приготовления..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
            />
          </Field>

          {/* Вес / объём + КБЖУ */}
          <Field label="Вес / объём и КБЖУ *">
            <div className="flex flex-col gap-2">

              {/* Шапка */}
              <div className="grid gap-2 text-xs px-1" style={{
                color: '#9D99B8',
                gridTemplateColumns: '100px 72px 72px 60px 60px 68px 32px',
              }}>
                <span>Объём</span>
                <span>Ед.</span>
                <span>Калории</span>
                <span>Белки г</span>
                <span>Жиры г</span>
                <span>Углеводы г</span>
                <span></span>
              </div>

              {sizes.map((size, i) => (
                <div key={size.id} className="grid gap-2 items-center" style={{
                  gridTemplateColumns: '100px 72px 72px 60px 60px 68px 32px',
                }}>
                  <input
                    type="number"
                    value={size.weight || ''}
                    onChange={e => {
                      const upd = sizes.map((s, j) => j === i ? { ...s, weight: Number(e.target.value) } : s)
                      setSizes(upd)
                      if (i === 0) updateField('weight', Number(e.target.value))
                    }}
                    placeholder="250"
                    className="h-10 px-3 rounded-xl text-sm outline-none text-center"
                    style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                  />
                  <select
                    value={size.weightUnit}
                    onChange={e => {
                      const upd = sizes.map((s, j) => j === i ? { ...s, weightUnit: e.target.value as 'г' | 'мл' } : s)
                      setSizes(upd)
                      if (i === 0) updateField('weightUnit', e.target.value as 'г' | 'мл')
                    }}
                    className="h-10 px-2 rounded-xl text-sm outline-none"
                    style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                  >
                    <option value="г">г</option>
                    <option value="мл">мл</option>
                  </select>
                  {(['calories', 'protein', 'fat', 'carbs'] as const).map(k => (
                    <input
                      key={k}
                      type="number"
                      value={size[k] || ''}
                      onChange={e => {
                        const upd = sizes.map((s, j) => j === i ? { ...s, [k]: Number(e.target.value) } : s)
                        setSizes(upd)
                        if (i === 0) updateField(k, Number(e.target.value))
                      }}
                      placeholder="0"
                      className="h-10 px-2 rounded-xl text-sm outline-none text-center"
                      style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                    />
                  ))}

                  {/* Последняя строка — кнопка +, остальные — ✕ */}
                  {i === sizes.length - 1 ? (
                    <button
                      onClick={() => setSizes([...sizes, newSize(sizes[0].weightUnit)])}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-medium"
                      style={{ color: '#B0A6DF', background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)' }}
                      title="Добавить объём"
                    >
                      +
                    </button>
                  ) : (
                    <button
                      onClick={() => setSizes(sizes.filter((_, j) => j !== i))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ color: '#9D99B8', background: '#EAE7F8' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {sizes.length > 1 && (
                <p className="text-xs mt-1" style={{ color: '#9D99B8' }}>
                  Нажмите + в последней строке чтобы добавить ещё один объём
                </p>
              )}
            </div>
          </Field>

          {/* Состав — общий список ингредиентов с количеством для каждого объёма */}
          {/* Состав — выбор из справочника */}
<Field label="Состав">
  <div className="flex flex-col gap-2">
    {ingredients.length > 0 && (
      <div className="grid gap-2 text-xs px-1"
        style={{
          color: '#9D99B8',
          gridTemplateColumns: `1fr ${sizes.map(() => '140px').join(' ')} 32px`,
        }}>
        <span>Ингредиент</span>
        {sizes.map(s => (
          <span key={s.id}>{s.weight || '?'} {s.weightUnit}</span>
        ))}
        <span></span>
      </div>
    )}

    {composition.map((row, i) => {
      const ref = ingredientRefs.find(r => r.id === row.ingredientId)
      return (
        <div key={i} className="grid gap-2 items-center"
          style={{
            gridTemplateColumns: `1fr ${sizes.map(() => '140px').join(' ')} 32px`,
          }}>
          {/* Выбор ингредиента */}
          <select
            value={row.ingredientId}
            onChange={e => {
              const ref = ingredientRefs.find(r => r.id === e.target.value)
              const upd = [...composition]
              upd[i] = { ...upd[i], ingredientId: e.target.value, unit: ref?.unit ?? 'г' }
              setComposition(upd)
            }}
            className="h-9 px-3 rounded-xl text-sm outline-none"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
          >
            <option value="">— выберите ингредиент —</option>
            {INGREDIENT_CATEGORIES.map(cat => {
              const catItems = ingredientRefs.filter(r => (r.category ?? 'Прочее') === cat)
              if (!catItems.length) return null
              return (
                <optgroup key={cat} label={cat}>
                  {catItems.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </optgroup>
              )
            })}
          </select>

          {/* Количество для каждого размера */}
          {sizes.map((size, si) => (
            <div key={size.id} className="flex">
              <input
                type="number"
                value={(size.composition ?? []).find(c => c.ingredientId === row.ingredientId)?.amount || ''}
                onChange={e => {
                  setSizes(sizes.map((s, sj) => {
                    if (sj !== si) return s
                    const comp = s.composition ?? []
const existing = comp.find(c => c.ingredientId === row.ingredientId)
const newComp = existing
  ? comp.map(c => c.ingredientId === row.ingredientId
      ? { ...c, amount: Number(e.target.value) }
      : c)
  : [...comp, {
      ingredientId: row.ingredientId,
      amount: Number(e.target.value),
      unit: ref?.unit ?? 'г',
    }]
return { ...s, composition: newComp }
                  }))
                }}
                placeholder="0"
                className="w-full h-9 px-3 rounded-l-xl text-sm outline-none text-center"
                style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: '#2C2950' }}
              />
              <div className="h-9 px-2 rounded-r-xl flex items-center text-xs flex-shrink-0"
                style={{ background: '#D8D4F0', border: '0.5px solid rgba(176,166,223,0.3)', color: '#534AB7' }}>
                {ref?.unit ?? 'г'}
              </div>
            </div>
          ))}

          <button
            onClick={() => setComposition(composition.filter((_, j) => j !== i))}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: '#9D99B8', background: '#EAE7F8' }}
          >
            ✕
          </button>
        </div>
      )
    })}

    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => setComposition([...composition, { ingredientId: '', amount: 0, unit: 'г' }])}
        className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl"
        style={{ color: '#B0A6DF', background: '#EAE7F8', border: '0.5px dashed rgba(176,166,223,0.6)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        Добавить ингредиент
      </button>

      {/* Кнопка расчёта КБЖУ */}
      {composition.some(c => c.ingredientId) && (
        <button
          onClick={calculateNutri}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl"
          style={{ color: '#635200', background: '#F2D965', border: '0.5px solid rgba(242,217,101,0.6)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v3M7 10v3M1 7h3M10 7h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          Рассчитать КБЖУ
        </button>
      )}
    </div>

    {/* Подсказка если справочник пуст */}
    {ingredientRefs.length === 0 && (
      <div className="p-3 rounded-xl text-sm"
        style={{ background: '#EAE7F8', color: '#534AB7' }}>
        Справочник ингредиентов пуст.{' '}
        <a href="/dashboard/ingredients" target="_blank"
          className="underline font-medium">
          Добавьте ингредиенты
        </a>{' '}
        чтобы использовать их в составе блюда.
      </div>
    )}
  </div>
</Field>
        </div>
      )}

      {/* Шаг 2 — Варианты (начинка, крупа и т.д. — не объём) */}
      {step === 2 && (
        <VariantsStep
          variantGroups={userVariantGroups}
          onChange={groups => updateField('variantGroups', groups)}
        />
      )}

      {/* Шаг 3 — Добавки */}
      {step === 3 && (
  <ModifiersStep
    modifierGroups={item.modifierGroups ?? []}
    variantGroups={allVariantGroupsForModifiers}
    ingredientRefs={ingredientRefs}
    onChange={groups => updateField('modifierGroups', groups)}
  />
)}

      {/* Навигация по шагам */}
      <div className="flex justify-between mt-8 pt-6"
        style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}>
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: '#EAE7F8', color: '#6B6490' }}
        >
          {step === 1 ? 'Отмена' : '← Назад'}
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!item.name || !categoryId}
            className="px-6 py-2.5 rounded-xl text-sm font-medium"
            style={{
              background: item.name && categoryId ? '#B0A6DF' : '#EAE7F8',
              color: item.name && categoryId ? '#2C2950' : '#9D99B8',
            }}
          >
            Далее →
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={!item.name || !categoryId || !sizes[0].calories}
            className="px-6 py-2.5 rounded-xl text-sm font-medium"
            style={{
              background: item.name && categoryId && sizes[0].calories ? '#B0A6DF' : '#EAE7F8',
              color: item.name && categoryId && sizes[0].calories ? '#2C2950' : '#9D99B8',
            }}
          >
            {isEdit ? 'Сохранить' : 'Добавить блюдо'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Шаг 2: Варианты (начинка, крупа — не объём) ──────────────

function VariantsStep({ variantGroups, onChange }: {
  variantGroups: VariantGroup[]
  onChange: (groups: VariantGroup[]) => void
}) {
  function addGroup() {
    onChange([...variantGroups, {
      id: crypto.randomUUID(),
      label: '',
      required: true,
      options: [],
    }])
  }

  function updateGroup(id: string, patch: Partial<VariantGroup>) {
    onChange(variantGroups.map(g => g.id === id ? { ...g, ...patch } : g))
  }

  function removeGroup(id: string) {
    onChange(variantGroups.filter(g => g.id !== id))
  }

  function addOption(groupId: string) {
    updateGroup(groupId, {
      options: [...(variantGroups.find(g => g.id === groupId)?.options ?? []), {
        id: crypto.randomUUID(),
        label: '',
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        weight: 0,
        weightUnit: 'г',
      }],
    })
  }

  function updateOption(groupId: string, optionId: string, patch: Partial<VariantOption>) {
    onChange(variantGroups.map(g =>
      g.id === groupId
        ? { ...g, options: g.options.map(o => o.id === optionId ? { ...o, ...patch } : o) }
        : g
    ))
  }

  function removeOption(groupId: string, optionId: string) {
    onChange(variantGroups.map(g =>
      g.id === groupId
        ? { ...g, options: g.options.filter(o => o.id !== optionId) }
        : g
    ))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="p-3 rounded-xl text-sm" style={{ background: '#EAE7F8', color: '#534AB7' }}>
        Объём уже задан на шаге 1. Здесь добавляйте другие варианты — например <strong>начинку</strong> (курица / лосось / креветка) или <strong>крупу</strong> (гречка / булгур / киноа).
      </div>

      {variantGroups.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: '#9D99B8' }}>
          Нет вариантов — нажмите кнопку ниже чтобы добавить
        </p>
      )}

      {variantGroups.map(group => (
        <div key={group.id} className="rounded-2xl p-4"
          style={{ border: '0.5px solid rgba(176,166,223,0.4)', background: '#FEFEF2' }}>

          <div className="flex gap-2 mb-4">
            <input
              value={group.label}
              onChange={e => updateGroup(group.id, { label: e.target.value })}
              placeholder="Название группы (Начинка / Крупа)"
              className="flex-1 h-9 px-3 rounded-xl text-sm outline-none"
              style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
            />
            <label className="flex items-center gap-2 text-xs cursor-pointer shrink-0"
              style={{ color: '#6B6490' }}>
              <input
                type="checkbox"
                checked={group.required}
                onChange={e => updateGroup(group.id, { required: e.target.checked })}
              />
              Обязательный
            </label>
            <button
              onClick={() => removeGroup(group.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ color: '#9D99B8', background: '#EAE7F8' }}
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            {group.options.length > 0 && (
              <div className="grid gap-2 text-xs px-1"
                style={{ color: '#9D99B8', gridTemplateColumns: '1fr 80px 72px 55px 55px 62px 32px' }}>
                <span>Название</span>
                <span>Вес</span>
                <span>Калории</span>
                <span>Белки</span>
                <span>Жиры</span>
                <span>Углеводы</span>
                <span></span>
              </div>
            )}
            {group.options.map(opt => (
              <div key={opt.id} className="grid gap-2 items-center"
                style={{ gridTemplateColumns: '1fr 80px 72px 55px 55px 62px 32px' }}>
                <input
                  value={opt.label}
                  onChange={e => updateOption(group.id, opt.id, { label: e.target.value })}
                  placeholder="Курица / Гречка"
                  className="h-9 px-3 rounded-xl text-sm outline-none"
                  style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: '#2C2950' }}
                />
                <div className="flex">
                  <input
                    type="number"
                    value={opt.weight || ''}
                    onChange={e => updateOption(group.id, opt.id, { weight: Number(e.target.value) })}
                    placeholder="300"
                    className="w-full h-9 px-2 rounded-l-xl text-sm outline-none text-center"
                    style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: '#2C2950' }}
                  />
                  <select
                    value={opt.weightUnit}
                    onChange={e => updateOption(group.id, opt.id, { weightUnit: e.target.value as 'г' | 'мл' })}
                    className="h-9 px-1 rounded-r-xl text-xs outline-none"
                    style={{ background: '#D8D4F0', border: '0.5px solid rgba(176,166,223,0.3)', color: '#534AB7' }}
                  >
                    <option value="г">г</option>
                    <option value="мл">мл</option>
                  </select>
                </div>
                {(['calories', 'protein', 'fat', 'carbs'] as const).map(k => (
                  <input
                    key={k}
                    type="number"
                    value={opt[k] || ''}
                    onChange={e => updateOption(group.id, opt.id, { [k]: Number(e.target.value) })}
                    placeholder="0"
                    className="h-9 px-2 rounded-xl text-sm outline-none text-center"
                    style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: '#2C2950' }}
                  />
                ))}
                <button
                  onClick={() => removeOption(group.id, opt.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ color: '#9D99B8', background: '#EAE7F8' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => addOption(group.id)}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl w-full"
            style={{ color: '#B0A6DF', background: '#EAE7F8', border: '0.5px dashed rgba(176,166,223,0.6)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Добавить вариант
          </button>
        </div>
      ))}

      <button
        onClick={addGroup}
        className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm"
        style={{ border: '0.5px dashed rgba(176,166,223,0.6)', color: '#6B6490', background: 'transparent' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        Добавить группу вариантов
      </button>
    </div>
  )
}

// ─── Шаг 3: Добавки ───────────────────────────────────────────

function ModifiersStep({ modifierGroups, variantGroups, ingredientRefs, onChange }: {
  modifierGroups: ModifierGroup[]
  variantGroups: VariantGroup[]
  ingredientRefs: IngredientRef[]
  onChange: (groups: ModifierGroup[]) => void
}) {
  function addGroup() {
    onChange([...modifierGroups, {
      id: crypto.randomUUID(),
      label: '',
      multi: false,
      required: false,
      calcByMl: false,
      modifiers: [],
    }])
  }

  function updateGroup(id: string, patch: Partial<ModifierGroup>) {
    onChange(modifierGroups.map(g => g.id === id ? { ...g, ...patch } : g))
  }

  function removeGroup(id: string) {
    onChange(modifierGroups.filter(g => g.id !== id))
  }

  function addModifier(groupId: string) {
    updateGroup(groupId, {
      modifiers: [...(modifierGroups.find(g => g.id === groupId)?.modifiers ?? []), {
        id: crypto.randomUUID(),
        label: '',
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        weight: 100,
        weightUnit: 'мл',
      }],
    })
  }

  function updateModifier(groupId: string, modId: string, patch: Partial<Modifier>) {
    onChange(modifierGroups.map(g =>
      g.id === groupId
        ? { ...g, modifiers: g.modifiers.map(m => m.id === modId ? { ...m, ...patch } : m) }
        : g
    ))
  }

  function removeModifier(groupId: string, modId: string) {
    onChange(modifierGroups.map(g =>
      g.id === groupId
        ? { ...g, modifiers: g.modifiers.filter(m => m.id !== modId) }
        : g
    ))
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm" style={{ color: '#6B6490' }}>
        Добавки — опциональные дополнения к блюду. Например тип молока, сироп или топпинги.
      </p>

      {modifierGroups.map(group => (
        <div key={group.id} className="rounded-2xl p-4"
          style={{ border: '0.5px solid rgba(176,166,223,0.4)', background: '#FEFEF2' }}>

          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              value={group.label}
              onChange={e => updateGroup(group.id, { label: e.target.value })}
              placeholder="Название (Молоко / Сироп / Добавки)"
              className="flex-1 h-9 px-3 rounded-xl text-sm outline-none min-w-40"
              style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
            />
            {/* Тип группы */}
<div className="flex gap-2 mb-3">
  {(['addon', 'replace'] as const).map(t => (
    <button
      key={t}
      onClick={() => updateGroup(group.id, { type: t, replacesIngredientId: undefined })}
      className="px-3 py-1.5 rounded-full text-xs transition-all"
      style={(group.type ?? 'addon') === t
        ? { background: '#B0A6DF', color: '#2C2950' }
        : { background: '#EAE7F8', color: '#6B6490', border: '0.5px solid rgba(176,166,223,0.3)' }
      }
    >
      {t === 'addon' ? '+ Добавка' : '⇄ Замена ингредиента'}
    </button>
  ))}
</div>

{/* Если replace — выбор заменяемого ингредиента */}
{group.type === 'replace' && (
  <div className="mb-3">
    <p className="text-xs mb-1.5" style={{ color: '#6B6490' }}>
      Какой ингредиент заменяет:
    </p>
    <select
      value={group.replacesIngredientId ?? ''}
      onChange={e => updateGroup(group.id, { replacesIngredientId: e.target.value })}
      className="h-9 px-3 rounded-xl text-sm outline-none w-full"
      style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
    >
      <option value="">— выберите ингредиент —</option>
      {ingredientRefs.map(r => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  </div>
)}

            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#6B6490' }}>
              <input type="checkbox" checked={group.multi}
                onChange={e => updateGroup(group.id, { multi: e.target.checked })} />
              Несколько
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#6B6490' }}>
              <input type="checkbox" checked={group.required}
                onChange={e => updateGroup(group.id, { required: e.target.checked })} />
              Обязательный
            </label>
            <button onClick={() => removeGroup(group.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ color: '#9D99B8', background: '#EAE7F8' }}>✕</button>
          </div>

          {/* Toggle — расчёт по мл */}
          <div className="mb-4 p-3 rounded-xl" style={{ background: '#EAE7F8' }}>
            <div className="flex items-center gap-3 cursor-pointer"
              onClick={() => updateGroup(group.id, {
                calcByMl: !group.calcByMl,
                linkedVariantGroupId: !group.calcByMl && variantGroups[0]
                  ? variantGroups[0].id
                  : undefined,
                mlPerVariant: !group.calcByMl ? {} : undefined,
              })}>
              <div className="relative w-9 h-5 rounded-full transition-all shrink-0"
                style={{ background: group.calcByMl ? '#B0A6DF' : '#C8C3F0' }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{ background: '#FEFEF2', left: group.calcByMl ? '18px' : '2px' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#2C2950' }}>Рассчитать по мл</p>
                <p className="text-xs" style={{ color: '#6B6490' }}>
                  КБЖУ указывается на 100 мл, система сама посчитает для каждого объёма
                </p>
              </div>
            </div>

            {group.calcByMl && variantGroups.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}>
                <div className="mb-3">
                  <p className="text-xs mb-1.5" style={{ color: '#6B6490' }}>Привязать к группе вариантов:</p>
                  <select
                    value={group.linkedVariantGroupId ?? ''}
                    onChange={e => updateGroup(group.id, { linkedVariantGroupId: e.target.value })}
                    className="h-8 px-2 rounded-lg text-sm outline-none"
                    style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                  >
                    {variantGroups.map(vg => (
                      <option key={vg.id} value={vg.id}>{vg.label || 'Без названия'}</option>
                    ))}
                  </select>
                </div>

                <p className="text-xs mb-2" style={{ color: '#6B6490' }}>
                  Сколько мл в каждом варианте:
                </p>
                <div className="flex flex-col gap-2">
                  {(variantGroups.find(vg => vg.id === group.linkedVariantGroupId)?.options ?? []).map(opt => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <span className="text-sm w-24 shrink-0" style={{ color: '#2C2950' }}>
                        {opt.label || 'Вариант'}
                      </span>
                      <input
                        type="number"
                        value={group.mlPerVariant?.[opt.id] ?? ''}
                        onChange={e => updateGroup(group.id, {
                          mlPerVariant: { ...group.mlPerVariant, [opt.id]: Number(e.target.value) },
                        })}
                        placeholder="150"
                        className="w-20 h-8 px-2 rounded-lg text-sm outline-none text-center"
                        style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                      />
                      <span className="text-xs" style={{ color: '#9D99B8' }}>мл</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Список добавок */}
<div className="flex flex-col gap-2 mb-3">
  {group.modifiers.length > 0 && (
    <div className="grid gap-2 text-xs px-1"
      style={{ color: '#9D99B8', gridTemplateColumns: '1fr 32px' }}>
      <span>Ингредиент из справочника</span>
      <span></span>
    </div>
  )}

  {group.modifiers.map(mod => {
    const ref = ingredientRefs.find(r => r.id === mod.ingredientRefId)
    return (
      <div key={mod.id} className="flex gap-2 items-center">
        <div className="flex-1">
          <select
            value={mod.ingredientRefId ?? ''}
            onChange={e => {
              const selectedRef = ingredientRefs.find(r => r.id === e.target.value)
              updateModifier(group.id, mod.id, {
                ingredientRefId: e.target.value,
                label: selectedRef?.name ?? '',
                calories: selectedRef?.caloriesPer100 ?? 0,
                protein: selectedRef?.proteinPer100 ?? 0,
                fat: selectedRef?.fatPer100 ?? 0,
                carbs: selectedRef?.carbsPer100 ?? 0,
                weight: 100,
                weightUnit: selectedRef?.unit ?? 'г',
              })
            }}
            className="w-full h-9 px-3 rounded-xl text-sm outline-none"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: '#2C2950' }}
          >
            <option value="">— выберите из справочника —</option>
            {INGREDIENT_CATEGORIES.map(cat => {
              const catItems = ingredientRefs.filter(r => (r.category ?? 'Прочее') === cat)
              if (!catItems.length) return null
              return (
                <optgroup key={cat} label={cat}>
                  {catItems.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.caloriesPer100} ккал/100{r.unit}
                    </option>
                  ))}
                </optgroup>
              )
            })}
          </select>

          {/* Показываем КБЖУ выбранного ингредиента */}
          {ref && (
            <div className="flex gap-3 mt-1.5 px-1">
              <span className="text-xs" style={{ color: '#534AB7' }}>
                {ref.caloriesPer100} ккал
              </span>
              <span className="text-xs" style={{ color: '#9D99B8' }}>
                Б {ref.proteinPer100}г
              </span>
              <span className="text-xs" style={{ color: '#9D99B8' }}>
                Ж {ref.fatPer100}г
              </span>
              <span className="text-xs" style={{ color: '#9D99B8' }}>
                У {ref.carbsPer100}г
              </span>
              <span className="text-xs" style={{ color: '#9D99B8' }}>
                на 100 {ref.unit}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => removeModifier(group.id, mod.id)}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ color: '#9D99B8', background: '#EAE7F8' }}
        >
          ✕
        </button>
      </div>
    )
  })}
</div>

          <button
            onClick={() => addModifier(group.id)}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl w-full"
            style={{ color: '#B0A6DF', background: '#EAE7F8', border: '0.5px dashed rgba(176,166,223,0.6)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Добавить добавку
          </button>
        </div>
      ))}

      <button
        onClick={addGroup}
        className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm"
        style={{ border: '0.5px dashed rgba(176,166,223,0.6)', color: '#6B6490', background: 'transparent' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        Добавить группу добавок
      </button>
    </div>
  )
}

// ─── Вспомогательный компонент ────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: '#2C2950' }}>{label}</label>
      {children}
    </div>
  )
}