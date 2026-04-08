'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Category, IngredientLibrary, IngredientRef, SizeOption } from '@/types'
import { getCategories, saveCategories, getItemById, getAllIngredients, getLibraries, initLibraries } from '@/lib/store'
import { systemLibraries } from '@/lib/mock-data'
import IngredientPickerModal from './IngredientPickerModal'

interface IngredientItem {
  id: string
  ingredientRefId: string
  name: string
}

interface Size {
  id: string
  name: string
  unit: 'г' | 'мл'
}

interface AmountCell {
  ingredientId: string
  sizeId: string
  amount: number
}

// ─── Типы для шага 2 (Варианты) ─────────────────────────────
interface VariantOption {
  id: string
  label: string
  required: boolean
  options: VariantChoice[]
  replacesIngredientRefId?: string  // ингредиент из состава, граммовки которого наследуют все опции
}

interface VariantChoice {
  id: string
  ingredientRefId?: string
  label: string
  weight: number
  weightUnit: 'г' | 'мл'
  calories: number
  protein: number
  fat: number
  carbs: number
  isManual?: boolean
}

export default function ItemForm({ itemId, categoryId: initialCategoryId }: { itemId?: string; categoryId?: string }) {
  const router = useRouter()

  // Шаг 1: Основные поля
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ingredientRefs, setIngredientRefs] = useState<IngredientRef[]>([])
  const [libraries, setLibraries] = useState<IngredientLibrary[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  // Шаг 1: Ингредиенты в составе (без граммовок)
  const [ingredients, setIngredients] = useState<IngredientItem[]>([])

  // Шаг 1: Размеры порций
  const [hasMultipleSizes, setHasMultipleSizes] = useState(false)
  const [sizes, setSizes] = useState<Size[]>([{ id: 'default', name: '', unit: 'г' }])

  // Шаг 1: Таблица граммовок
  const [amounts, setAmounts] = useState<AmountCell[]>([])

  // Шаг 1: Ручное редактирование КБЖУ для размеров
  const [manualNutri, setManualNutri] = useState<Record<string, { calories: number; protein: number; fat: number; carbs: number; isManual: boolean }>>({})

  // ─── Шаг 2: Варианты для гостя (крупа, белок, начинка) ───
  const [variantGroups, setVariantGroups] = useState<VariantOption[]>([])

  // Флаги для загрузки
  const isInitialLoad = useRef(true)
  const [isReady, setIsReady] = useState(false)

  const isEdit = !!itemId
  const MAX_SIZES = 5

  // ─── Загрузка справочников (один раз) ─────────────────────
  useEffect(() => {
    const libs = initLibraries(systemLibraries)
    setLibraries(libs)
    setIngredientRefs(libs.flatMap(l => l.ingredients))
    setCategories(getCategories())
    setIsReady(true)
  }, [])

  // ─── Загрузка существующего блюда ─────────────────────────
  useEffect(() => {
    if (!isReady) {
      console.log('Ждём загрузки справочника...')
      return
    }

    if (ingredientRefs.length === 0) {
      console.log('Ждём загрузки справочника ингредиентов...')
      return
    }

    if (!itemId || !isInitialLoad.current) return

    console.log('Загружаем блюдо, справочник ингредиентов готов. ingredientRefs:', ingredientRefs)

    const found = getItemById(itemId)
    console.log('Найденное блюдо:', found)

    if (found) {
      setName(found.item.name)
      setDescription(found.item.description ?? '')
      setCategoryId(found.categoryId)

      // Загрузка размеров и граммовок (шаг 1)
      if (found.item.sizes && found.item.sizes.length > 0) {
        const sizesData = found.item.sizes
        const compositionData = sizesData[0].composition || []

        const ingredientIdMap = new Map<string, string>()

        if (compositionData.length > 0) {
          const loadedIngredients = compositionData.map((comp) => {
            const newId = crypto.randomUUID()
            const ref = ingredientRefs.find(r => r.id === comp.ingredientId)
            console.log(`Ищем ингредиент с ID ${comp.ingredientId}:`, ref)
            ingredientIdMap.set(comp.ingredientId, newId)
            return {
              id: newId,
              ingredientRefId: comp.ingredientId,
              name: ref?.name || `Неизвестный ингредиент (${comp.ingredientId})`,
            }
          })
          console.log('Загруженные ингредиенты:', loadedIngredients)
          setIngredients(loadedIngredients)

          const loadedAmounts: AmountCell[] = []
          for (const size of sizesData) {
            for (const comp of size.composition || []) {
              const mappedId = ingredientIdMap.get(comp.ingredientId)
              if (mappedId) {
                loadedAmounts.push({
                  ingredientId: mappedId,
                  sizeId: size.id,
                  amount: comp.amount,
                })
              }
            }
          }
          console.log('Загруженные граммовки:', loadedAmounts)
          setAmounts(loadedAmounts)
        }

        if (sizesData.length === 1) {
          setHasMultipleSizes(false)
          setSizes([{
            id: sizesData[0].id,
            name: sizesData[0].name || '',
            unit: sizesData[0].weightUnit || 'г'
          }])
        } else {
          setHasMultipleSizes(true)
          setSizes(sizesData.map(s => ({
            id: s.id,
            name: s.name || `${s.weight}${s.weightUnit}`,
            unit: s.weightUnit || 'г'
          })))
        }

        const loadedManual: Record<string, any> = {}
        for (const size of sizesData) {
          loadedManual[size.id] = {
            calories: size.calories,
            protein: size.protein,
            fat: size.fat,
            carbs: size.carbs,
            isManual: true,
          }
        }
        setManualNutri(loadedManual)
      }

      // ─── Загрузка вариантов (шаг 2) ───────────────────────
      if (found.item.variantGroups && found.item.variantGroups.length > 0) {
        const loadedVariantGroups: VariantOption[] = found.item.variantGroups.map((vg: any) => ({
          id: vg.id,
          label: vg.label,
          required: vg.required,
          replacesIngredientRefId: vg.replacesIngredientRefId,
          options: vg.options.map((opt: any) => {
            const ref = ingredientRefs.find(r => r.id === opt.ingredientRefId)
            return {
              id: opt.id,
              ingredientRefId: opt.ingredientRefId || '',
              label: ref?.name || opt.label,
              weight: opt.weight,
              weightUnit: opt.weightUnit,
              calories: opt.calories,
              protein: opt.protein,
              fat: opt.fat,
              carbs: opt.carbs,
              isManual: true,
            }
          }),
        }))
        setVariantGroups(loadedVariantGroups)
      }
    }

    isInitialLoad.current = false
  }, [itemId, ingredientRefs, isReady])

  // ─── Функции для шага 2 (Варианты) ────────────────────────
  const addVariantGroup = useCallback(() => {
    const newGroup: VariantOption = {
      id: crypto.randomUUID(),
      label: '',
      required: false,
      options: [],
    }
    setVariantGroups(prev => [...prev, newGroup])
  }, [])

  const updateVariantGroup = useCallback((groupId: string, updates: Partial<VariantOption>) => {
    setVariantGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g))
  }, [])

  const removeVariantGroup = useCallback((groupId: string) => {
    setVariantGroups(prev => prev.filter(g => g.id !== groupId))
  }, [])

  const addVariantOption = useCallback((groupId: string) => {
    const newOption: VariantChoice = {
      id: crypto.randomUUID(),
      ingredientRefId: '',
      label: '',
      weight: 100,
      weightUnit: 'г',
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      isManual: false,
    }
    setVariantGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, options: [...g.options, newOption] } : g
    ))
  }, [])

  const updateVariantOption = useCallback((groupId: string, optionId: string, updates: Partial<VariantChoice>) => {
    setVariantGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, options: g.options.map(o => o.id === optionId ? { ...o, ...updates, isManual: updates.calories !== undefined ? true : o.isManual } : o) }
        : g
    ))
  }, [])

  const removeVariantOption = useCallback((groupId: string, optionId: string) => {
    setVariantGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optionId) } : g
    ))
  }, [])

  // ─── Расчёт КБЖУ для размера ──────────────────────────────
  const calculateNutriForSize = useCallback((sizeId: string) => {
    if (manualNutri[sizeId]?.isManual) {
      return {
        calories: manualNutri[sizeId].calories,
        protein: manualNutri[sizeId].protein,
        fat: manualNutri[sizeId].fat,
        carbs: manualNutri[sizeId].carbs,
      }
    }

    let totalCalories = 0
    let totalProtein = 0
    let totalFat = 0
    let totalCarbs = 0

    for (const ingredient of ingredients) {
      const amountCell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === sizeId)
      if (!amountCell || !amountCell.amount) continue

      const ref = ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
      if (!ref) continue

      const ratio = amountCell.amount / 100
      totalCalories += ref.caloriesPer100 * ratio
      totalProtein += ref.proteinPer100 * ratio
      totalFat += ref.fatPer100 * ratio
      totalCarbs += ref.carbsPer100 * ratio
    }

    return {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
    }
  }, [ingredients, amounts, ingredientRefs, manualNutri])

  // ─── Сохранение ────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!name || !categoryId || ingredients.length === 0) return

    // Сохраняем размеры (шаг 1)
    const sizesToSave: SizeOption[] = sizes.map(size => {
      const composition = ingredients.map(ingredient => {
        const amountCell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
        const ref = ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
        return {
          ingredientId: ingredient.ingredientRefId,
          amount: amountCell?.amount || 0,
          unit: ref?.unit || 'г',
        }
      }).filter(comp => comp.amount > 0)

      const nutri = calculateNutriForSize(size.id)
      const totalWeight = composition.reduce((sum, comp) => sum + comp.amount, 0)

      return {
        id: size.id,
        name: size.name || (sizes.length === 1 ? `${totalWeight}${size.unit}` : ''),
        weight: totalWeight,
        weightUnit: size.unit,
        calories: nutri.calories,
        protein: nutri.protein,
        fat: nutri.fat,
        carbs: nutri.carbs,
        composition,
        ingredientAmounts: {},
      }
    })

    // Сохраняем варианты (шаг 2)
    const variantGroupsToSave = variantGroups.map(group => {
      // Объём из состава для первого размера (для групп с заменой ингредиента)
      const replacedIng = group.replacesIngredientRefId
        ? ingredients.find(i => i.ingredientRefId === group.replacesIngredientRefId)
        : null
      const firstSizeReplacedAmount = replacedIng && sizes.length > 0
        ? (amounts.find(a => a.ingredientId === replacedIng.id && a.sizeId === sizes[0].id)?.amount ?? 0)
        : 0
      const firstSizeUnit = sizes[0]?.unit ?? 'г'

      return {
        id: group.id,
        label: group.label,
        required: group.required,
        replacesIngredientRefId: group.replacesIngredientRefId,
        options: group.options.map(opt => {
          // Если группа заменяет ингредиент — пересчитываем вес и КБЖУ из состава
          if (group.replacesIngredientRefId && firstSizeReplacedAmount > 0 && opt.ingredientRefId) {
            const ref = ingredientRefs.find(r => r.id === opt.ingredientRefId)
            if (ref) {
              const ratio = firstSizeReplacedAmount / 100
              return {
                id: opt.id,
                ingredientRefId: opt.ingredientRefId,
                label: opt.label,
                weight: firstSizeReplacedAmount,
                weightUnit: firstSizeUnit,
                calories: Math.round(ref.caloriesPer100 * ratio),
                protein: Math.round(ref.proteinPer100 * ratio * 10) / 10,
                fat: Math.round(ref.fatPer100 * ratio * 10) / 10,
                carbs: Math.round(ref.carbsPer100 * ratio * 10) / 10,
              }
            }
          }
          return {
            id: opt.id,
            ingredientRefId: opt.ingredientRefId || '',
            label: opt.label,
            weight: opt.weight,
            weightUnit: opt.weightUnit,
            calories: opt.calories,
            protein: opt.protein,
            fat: opt.fat,
            carbs: opt.carbs,
          }
        }),
      }
    })

    const newItem = {
      id: itemId ?? crypto.randomUUID(),
      name,
      description: description || undefined,
      weight: sizesToSave[0].weight,
      weightUnit: sizesToSave[0].weightUnit,
      calories: sizesToSave[0].calories,
      protein: sizesToSave[0].protein,
      fat: sizesToSave[0].fat,
      carbs: sizesToSave[0].carbs,
      sizes: sizesToSave,
      variantGroups: variantGroupsToSave.length > 0 ? variantGroupsToSave : undefined,
      categoryId,
      venueId: '1',
      isAvailable: true,
    }

    const cats = getCategories()
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
  }, [name, categoryId, description, ingredients, sizes, amounts, ingredientRefs, manualNutri, variantGroups, isEdit, itemId, router, calculateNutriForSize])

  // ─── Функции для шага 1 ───────────────────────────────────
  const addIngredient = useCallback((ingredientRefId: string) => {
    const ref = ingredientRefs.find(r => r.id === ingredientRefId)
    if (!ref) return

    const newIngredient: IngredientItem = {
      id: crypto.randomUUID(),
      ingredientRefId,
      name: ref.name,
    }
    setIngredients(prev => [...prev, newIngredient])
  }, [ingredientRefs])

  const removeIngredient = useCallback((ingredientId: string) => {
    setIngredients(prev => prev.filter(i => i.id !== ingredientId))
    setAmounts(prev => prev.filter(a => a.ingredientId !== ingredientId))
  }, [])

  const addSize = useCallback(() => {
    if (sizes.length >= MAX_SIZES) {
      alert(`Максимум ${MAX_SIZES} размеров`);
      return;
    }
    const newSize: Size = { id: crypto.randomUUID(), name: '', unit: 'г' }
    setSizes(prev => [...prev, newSize])
  }, [sizes.length])

  const updateSizeName = useCallback((sizeId: string, newName: string) => {
    setSizes(prev => prev.map(s => s.id === sizeId ? { ...s, name: newName } : s))
  }, [])

  const updateSizeUnit = useCallback((sizeId: string, newUnit: 'г' | 'мл') => {
    setSizes(prev => prev.map(s => s.id === sizeId ? { ...s, unit: newUnit } : s))
  }, [])

  const removeSize = useCallback((sizeId: string) => {
    if (sizes.length <= 1) return
    setSizes(prev => prev.filter(s => s.id !== sizeId))
    setAmounts(prev => prev.filter(a => a.sizeId !== sizeId))
    setManualNutri(prev => {
      const newManual = { ...prev }
      delete newManual[sizeId]
      return newManual
    })
  }, [sizes.length])

  const updateAmount = useCallback((ingredientId: string, sizeId: string, amount: number) => {
    setAmounts(prev => {
      const existing = prev.find(a => a.ingredientId === ingredientId && a.sizeId === sizeId)
      if (existing) {
        return prev.map(a =>
          a.ingredientId === ingredientId && a.sizeId === sizeId
            ? { ...a, amount }
            : a
        )
      } else {
        return [...prev, { ingredientId, sizeId, amount }]
      }
    })
    setManualNutri(prev => {
      if (prev[sizeId]?.isManual) {
        const newManual = { ...prev }
        delete newManual[sizeId]
        return newManual
      }
      return prev
    })
  }, [])

  const updateManualNutri = useCallback((sizeId: string, field: string, value: number) => {
    setManualNutri(prev => {
      const current = prev[sizeId] || { calories: 0, protein: 0, fat: 0, carbs: 0, isManual: true }
      return { ...prev, [sizeId]: { ...current, [field]: value, isManual: true } }
    })
  }, [])

  // Возвращает количество ингредиента (по ingredientRefId) в составе для конкретного размера
  const getAmountFromComposition = useCallback((ingredientRefId: string, sizeId: string): number => {
    const ingredient = ingredients.find(i => i.ingredientRefId === ingredientRefId)
    if (!ingredient) return 0
    return amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === sizeId)?.amount ?? 0
  }, [ingredients, amounts])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={() => router.back()} className="mb-4 text-sm" style={{ color: '#6B6490' }}>
        ← Назад
      </button>

      <h1 className="text-xl font-medium mb-6" style={{ color: '#2C2950' }}>
        {isEdit ? 'Редактировать блюдо' : 'Новое блюдо'}
      </h1>

      {/* ==================== ШАГ 1 ==================== */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4" style={{ color: '#2C2950' }}>Основное</h2>

        {/* Категория */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2C2950' }}>Категория *</label>
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
        </div>

        {/* Название */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2C2950' }}>Название *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Например: Боул"
            className="w-full h-10 px-3 rounded-xl text-sm outline-none"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
          />
        </div>

        {/* Описание */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2C2950' }}>Описание (необязательно)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Состав, особенности приготовления..."
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
          />
        </div>

        {/* Состав */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2C2950' }}>Состав *</label>
          <div className="space-y-2">
            {ingredients.map(ing => (
              <div key={ing.id} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-2 rounded-xl text-sm" style={{ background: '#EAE7F8', color: '#2C2950' }}>
                  {ing.name}
                </span>
                <button
                  onClick={() => removeIngredient(ing.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ color: '#9D99B8', background: '#EAE7F8' }}
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full h-10 px-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#6B6490' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Выбрать из справочника
            </button>
          </div>
        </div>

        {/* Размер порции */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2C2950' }}>Размер порции *</label>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!hasMultipleSizes}
                onChange={() => {
                  setHasMultipleSizes(false)
                  setSizes([{ id: 'default', name: '', unit: 'г' }])
                }}
              />
              <span className="text-sm" style={{ color: '#2C2950' }}>Один размер</span>
            </label>

            {!hasMultipleSizes && (
              <div className="ml-6 flex gap-2">
                <input
                  value={sizes[0]?.name || ''}
                  onChange={e => updateSizeName(sizes[0]?.id || 'default', e.target.value)}
                  placeholder="Название размера (например: Стандартный)"
                  className="flex-1 h-10 px-3 rounded-xl text-sm outline-none"
                  style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                />
                <select
                  value={sizes[0]?.unit || 'г'}
                  onChange={e => updateSizeUnit(sizes[0]?.id || 'default', e.target.value as 'г' | 'мл')}
                  className="w-24 h-10 px-3 rounded-xl text-sm outline-none"
                  style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                >
                  <option value="г">граммы (г)</option>
                  <option value="мл">миллилитры (мл)</option>
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={hasMultipleSizes}
                onChange={() => {
                  setHasMultipleSizes(true)
                  if (sizes.length === 1 && sizes[0].id === 'default') {
                    setSizes([
                      { id: crypto.randomUUID(), name: '', unit: 'г' },
                      { id: crypto.randomUUID(), name: '', unit: 'г' }
                    ])
                  }
                }}
              />
              <span className="text-sm" style={{ color: '#2C2950' }}>Несколько размеров</span>
            </label>

            {hasMultipleSizes && (
              <div className="ml-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  {sizes.map((size, idx) => (
                    <div key={size.id} className="flex items-center gap-1">
                      <input
                        value={size.name}
                        onChange={e => updateSizeName(size.id, e.target.value)}
                        placeholder={idx === 0 ? "Средний" : "Большой"}
                        className="w-28 h-9 px-2 rounded-lg text-sm outline-none"
                        style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                      />
                      <select
                        value={size.unit}
                        onChange={e => updateSizeUnit(size.id, e.target.value as 'г' | 'мл')}
                        className="w-20 h-9 px-2 rounded-lg text-sm outline-none"
                        style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                      >
                        <option value="г">г</option>
                        <option value="мл">мл</option>
                      </select>
                      {sizes.length > 1 && (
                        <button
                          onClick={() => removeSize(size.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ color: '#9D99B8', background: '#EAE7F8' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {sizes.length < MAX_SIZES && (
                    <button
                      onClick={addSize}
                      className="text-sm px-3 py-1.5 rounded-lg"
                      style={{ color: '#B0A6DF', background: '#EAE7F8' }}
                    >
                      + Добавить размер ({sizes.length}/{MAX_SIZES})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Таблица ингредиентов × размеров */}
        {ingredients.length > 0 && sizes.length > 0 && (
          <div className="mb-5 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: '#6B6490' }}>Ингредиент</th>
                  {sizes.map(size => (
                    <th key={size.id} className="text-center py-2 px-2 text-sm font-medium" style={{ color: '#6B6490' }}>
                      {size.name || (hasMultipleSizes ? 'Новый размер' : 'Порция')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ingredients.map(ingredient => {
                  const ref = ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
                  const unit = ref?.unit || 'г'
                  return (
                    <tr key={ingredient.id}>
                      <td className="py-2 px-3 text-sm" style={{ color: '#2C2950' }}>
                        {ingredient.name}
                        <span className="text-xs ml-1" style={{ color: '#9D99B8' }}>({unit})</span>
                      </td>
                      {sizes.map(size => {
                        const amount = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)?.amount || 0
                        return (
                          <td key={size.id} className="py-1 px-2">
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                value={amount || ''}
                                onChange={e => updateAmount(ingredient.id, size.id, Number(e.target.value))}
                                placeholder="0"
                                className="w-24 h-9 px-2 rounded-lg text-sm outline-none text-center"
                                style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                              />
                              <span className="text-xs" style={{ color: '#9D99B8' }}>{unit}</span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Итоговое КБЖУ */}
        {sizes.length > 0 && ingredients.length > 0 && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: '#EAE7F8' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#2C2950' }}>Итоговое КБЖУ (на порцию)</p>
            <div className="space-y-3">
              {sizes.map(size => {
                const nutri = calculateNutriForSize(size.id)
                const isManual = manualNutri[size.id]?.isManual

                let totalWeight = 0
                for (const ingredient of ingredients) {
                  const amountCell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
                  if (amountCell?.amount) {
                    totalWeight += amountCell.amount
                  }
                }

                return (
                  <div key={size.id} className="border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                      <div>
                        <span className="text-sm font-medium" style={{ color: '#534AB7' }}>
                          {size.name || (hasMultipleSizes ? 'Новый размер' : 'Порция')}
                        </span>
                        {totalWeight > 0 && (
                          <span className="text-xs ml-2" style={{ color: '#9D99B8' }}>
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
                    <div className="flex gap-4 text-sm flex-wrap items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#6B6490' }}>ккал</span>
                        <input
                          type="number"
                          value={nutri.calories}
                          onChange={e => updateManualNutri(size.id, 'calories', Number(e.target.value))}
                          className="w-20 h-8 px-2 rounded-lg text-sm outline-none text-center"
                          style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#6B6490' }}>белки</span>
                        <input
                          type="number"
                          value={nutri.protein}
                          onChange={e => updateManualNutri(size.id, 'protein', Number(e.target.value))}
                          step="0.1"
                          className="w-20 h-8 px-2 rounded-lg text-sm outline-none text-center"
                          style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#6B6490' }}>жиры</span>
                        <input
                          type="number"
                          value={nutri.fat}
                          onChange={e => updateManualNutri(size.id, 'fat', Number(e.target.value))}
                          step="0.1"
                          className="w-20 h-8 px-2 rounded-lg text-sm outline-none text-center"
                          style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#6B6490' }}>углеводы</span>
                        <input
                          type="number"
                          value={nutri.carbs}
                          onChange={e => updateManualNutri(size.id, 'carbs', Number(e.target.value))}
                          step="0.1"
                          className="w-20 h-8 px-2 rounded-lg text-sm outline-none text-center"
                          style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.4)', color: '#2C2950' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ==================== ШАГ 2 ==================== */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4" style={{ color: '#2C2950' }}>Выборы для гостя</h2>
        <p className="text-sm mb-4" style={{ color: '#6B6490' }}>
          Гость сможет выбирать из этих вариантов (крупа, начинка, белок и т.д.)
        </p>

        {variantGroups.map(group => {
          // Ингредиент из состава, который заменяет вся группа
          const replacedIng = group.replacesIngredientRefId
            ? ingredients.find(i => i.ingredientRefId === group.replacesIngredientRefId)
            : null
          // Объёмы заменяемого ингредиента по каждому размеру
          const replacedAmountsPerSize = replacedIng
            ? sizes.map(s => ({
                size: s,
                amount: getAmountFromComposition(group.replacesIngredientRefId!, s.id),
              }))
            : null

          return (
          <div key={group.id} className="mb-6 p-4 rounded-2xl" style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)' }}>
            <div className="flex gap-2 mb-3">
              <input
                value={group.label}
                onChange={e => updateVariantGroup(group.id, { label: e.target.value })}
                placeholder="Название группы (Крупа / Белок / Молоко)"
                className="flex-1 h-9 px-3 rounded-lg text-sm outline-none"
                style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.3)', color: '#2C2950' }}
              />
              <label className="flex items-center gap-2 text-xs cursor-pointer shrink-0" style={{ color: '#6B6490' }}>
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={e => updateVariantGroup(group.id, { required: e.target.checked })}
                />
                Обязательный
              </label>
              <button
                onClick={() => removeVariantGroup(group.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ color: '#9D99B8', background: '#FEFEF2' }}
              >
                ✕
              </button>
            </div>

            {/* Заменяет ингредиент из состава */}
            {ingredients.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs shrink-0" style={{ color: '#6B6490' }}>Заменяет:</span>
                <select
                  value={group.replacesIngredientRefId || ''}
                  onChange={e => updateVariantGroup(group.id, { replacesIngredientRefId: e.target.value || undefined })}
                  className="flex-1 h-8 px-2 rounded-lg text-sm outline-none"
                  style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.3)', color: '#2C2950' }}
                >
                  <option value="">— не привязано (ручной ввод) —</option>
                  {ingredients.map(ing => {
                    const ref = ingredientRefs.find(r => r.id === ing.ingredientRefId)
                    return (
                      <option key={ing.ingredientRefId} value={ing.ingredientRefId}>
                        {ref?.name ?? ing.name}
                      </option>
                    )
                  })}
                </select>
                {replacedAmountsPerSize && (
                  <div className="flex items-center gap-1 flex-wrap shrink-0">
                    {replacedAmountsPerSize.map(({ size, amount }) => (
                      <span key={size.id} className="px-2 py-0.5 rounded-lg text-xs"
                        style={{ background: '#D8D4F0', color: '#534AB7' }}>
                        {size.name || (sizes.length === 1 ? 'порция' : size.id)}: {amount} {size.unit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {group.options.map(opt => {
                const selectedRef = ingredientRefs.find(r => r.id === opt.ingredientRefId)
                // Объём берётся из заменяемого ингредиента (группа имеет replacesIngredientRefId)
                const firstSizeAmount = replacedAmountsPerSize?.[0]?.amount ?? opt.weight
                const displayCalories = selectedRef && firstSizeAmount > 0
                  ? Math.round(selectedRef.caloriesPer100 * firstSizeAmount / 100)
                  : opt.calories

                return (
                  <div key={opt.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: '#FEFEF2' }}>
                    <select
                      value={opt.ingredientRefId || ''}
                      onChange={e => {
                        const ref = ingredientRefs.find(r => r.id === e.target.value)
                        if (!ref) return
                        // Если группа заменяет ингредиент — берём его объём из первого размера
                        const amount = replacedAmountsPerSize?.[0]?.amount ?? opt.weight
                        const unit = replacedAmountsPerSize?.[0]?.size.unit ?? ref.unit
                        const ratio = amount / 100
                        updateVariantOption(group.id, opt.id, {
                          ingredientRefId: ref.id,
                          label: ref.name,
                          weight: amount,
                          weightUnit: unit,
                          calories: Math.round(ref.caloriesPer100 * ratio),
                          protein: Math.round(ref.proteinPer100 * ratio * 10) / 10,
                          fat: Math.round(ref.fatPer100 * ratio * 10) / 10,
                          carbs: Math.round(ref.carbsPer100 * ratio * 10) / 10,
                        })
                      }}
                      className="flex-1 h-8 px-2 rounded-lg text-sm outline-none"
                      style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: '#2C2950' }}
                    >
                      <option value="">-- Выберите ингредиент --</option>
                      {ingredientRefs.map(ref => (
                        <option key={ref.id} value={ref.id}>{ref.name}</option>
                      ))}
                    </select>

                    {replacedAmountsPerSize ? (
                      // Объёмы унаследованы от заменяемого ингредиента — только чтение
                      <div className="flex items-center gap-1 flex-wrap">
                        {replacedAmountsPerSize.map(({ size, amount }) => (
                          <span key={size.id} className="px-2 py-1 rounded-lg text-xs"
                            style={{ background: '#EAE7F8', color: '#534AB7' }}>
                            {size.name || (sizes.length === 1 ? 'порция' : size.id)}: {amount} {size.unit}
                          </span>
                        ))}
                        <span className="text-xs" style={{ color: '#9D99B8' }}>из состава</span>
                      </div>
                    ) : (
                      // Ручной ввод (группа не привязана к составу)
                      <div className="flex">
                        <input
                          type="number"
                          value={opt.weight || ''}
                          onChange={e => {
                            const newWeight = Number(e.target.value)
                            updateVariantOption(group.id, opt.id, { weight: newWeight })
                            if (selectedRef) {
                              const ratio = newWeight / 100
                              updateVariantOption(group.id, opt.id, {
                                calories: Math.round(selectedRef.caloriesPer100 * ratio),
                                protein: Math.round(selectedRef.proteinPer100 * ratio * 10) / 10,
                                fat: Math.round(selectedRef.fatPer100 * ratio * 10) / 10,
                                carbs: Math.round(selectedRef.carbsPer100 * ratio * 10) / 10,
                              })
                            }
                          }}
                          placeholder="100"
                          className="w-20 h-8 px-2 rounded-l-lg text-sm outline-none text-center"
                          style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: '#2C2950' }}
                        />
                        <select
                          value={opt.weightUnit}
                          onChange={e => updateVariantOption(group.id, opt.id, { weightUnit: e.target.value as 'г' | 'мл' })}
                          className="w-16 h-8 px-1 rounded-r-lg text-sm outline-none"
                          style={{ background: '#D8D4F0', border: '0.5px solid rgba(176,166,223,0.3)', color: '#534AB7' }}
                        >
                          <option value="г">г</option>
                          <option value="мл">мл</option>
                        </select>
                      </div>
                    )}

                    <div className="text-xs shrink-0" style={{ color: '#534AB7', minWidth: '56px' }}>
                      {displayCalories > 0 && `${displayCalories} ккал`}
                    </div>

                    <button
                      onClick={() => removeVariantOption(group.id, opt.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ color: '#9D99B8', background: '#EAE7F8' }}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
              <button
                onClick={() => addVariantOption(group.id)}
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
          onClick={addVariantGroup}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm w-full justify-center"
          style={{ border: '0.5px dashed rgba(176,166,223,0.6)', color: '#B0A6DF', background: '#EAE7F8' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          + Добавить группу вариантов
        </button>
      </div>

      {/* Кнопки */}
      <div className="flex justify-between pt-4 border-t" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
        <button
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: '#EAE7F8', color: '#6B6490' }}
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={!name || !categoryId || ingredients.length === 0}
          className="px-6 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: name && categoryId && ingredients.length ? '#B0A6DF' : '#EAE7F8',
            color: name && categoryId && ingredients.length ? '#2C2950' : '#9D99B8',
          }}
        >
          {isEdit ? 'Сохранить' : 'Добавить блюдо'}
        </button>
      </div>

      {pickerOpen && libraries.length > 0 && (
        <IngredientPickerModal
          libraries={libraries}
          alreadyAddedIds={ingredients.map(i => i.ingredientRefId)}
          onSelect={ref => addIngredient(ref.id)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}