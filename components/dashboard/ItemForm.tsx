'use client'

import { useEffect, useState, useCallback, useRef, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import type { Category, IngredientLibrary, IngredientRef, SizeOption } from '@/types'
import { systemLibraries } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import IngredientPickerModal from './IngredientPickerModal'

interface IngredientItem {
  id: string
  ingredientRefId: string
  name: string
  unit: 'г' | 'мл' | 'шт' | 'кг' | 'л'
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

// ─── Shared sub-components ───────────────────────────────────

function FormField({ label, required = false, children }: {
  label: string
  required?: boolean
  children: ComponentProps<'div'>['children']
}) {
  return (
    <div className="mb-5">
      <label className="text-sm font-medium mb-1.5 block" style={{ color: '#2C2950' }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.5)',
  color: '#2C2950',
  boxShadow: '0 1px 4px rgba(139,92,246,0.06)',
}

function FormInput({ className, style, ...props }: ComponentProps<'input'>) {
  return (
    <input
      {...props}
      className={cn('h-10 px-3 rounded-xl text-sm outline-none', className)}
      style={{ ...inputStyle, ...style }}
    />
  )
}

function FormSelect({ className, style, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      {...props}
      className={cn('h-10 px-3 rounded-xl text-sm outline-none', className)}
      style={{ ...inputStyle, ...style }}
    >
      {children}
    </select>
  )
}

function FormTextarea({ className, style, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      {...props}
      className={cn('w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none', className)}
      style={{ ...inputStyle, ...style }}
    />
  )
}

const NUTRI_FIELDS = [
  { key: 'calories' as const, label: 'ккал', step: undefined },
  { key: 'protein' as const, label: 'белки', step: '0.1' },
  { key: 'fat' as const, label: 'жиры', step: '0.1' },
  { key: 'carbs' as const, label: 'углеводы', step: '0.1' },
]

function NutriFields({ nutri, onChange }: {
  nutri: { calories: number; protein: number; fat: number; carbs: number }
  onChange: (field: string, value: number) => void
}) {
  return (
    <div className="flex gap-4 text-sm flex-wrap items-center">
      {NUTRI_FIELDS.map(({ key, label, step }) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6B6490' }}>{label}</span>
          <input
            type="number"
            value={nutri[key]}
            onChange={e => onChange(key, Number(e.target.value))}
            step={step}
            className="w-20 h-8 px-2 rounded-lg text-sm outline-none text-center"
            style={{ background: 'rgba(255,255,255,0.7)', border: '0.5px solid rgba(255,255,255,0.5)', color: '#2C2950' }}
          />
        </div>
      ))}
    </div>
  )
}

function RemoveButton({ onClick, size = 'md', variant = 'default' }: {
  onClick: () => void
  size?: 'sm' | 'md'
  variant?: 'default' | 'light'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg flex items-center justify-center shrink-0',
        size === 'sm' ? 'w-7 h-7' : 'w-8 h-8',
      )}
      style={{
        color: '#9D99B8',
        background: variant === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(139,92,246,0.08)',
        border: '0.5px solid rgba(255,255,255,0.5)',
      }}
    >
      ✕
    </button>
  )
}

// ─────────────────────────────────────────────────────────────

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
  const [variantPickerTarget, setVariantPickerTarget] = useState<{ groupId: string; optionId: string } | null>(null)

  // Шаг 1: Ингредиенты в составе (без граммовок)
  const [ingredients, setIngredients] = useState<IngredientItem[]>([])

  // Шаг 1: Размеры порций
  const [hasMultipleSizes, setHasMultipleSizes] = useState(false)
  const [sizes, setSizes] = useState<Size[]>([{ id: 'default', name: '', unit: 'г' }])

  // Шаг 1: Таблица граммовок
  const [amounts, setAmounts] = useState<AmountCell[]>([])

  // Шаг 1: Ручное редактирование КБЖУ для размеров
  const [manualNutri, setManualNutri] = useState<Record<string, { calories: number; protein: number; fat: number; carbs: number; isManual: boolean }>>({})

  // ─── Инлайн создание категории ───────────────────────────
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    })
    if (res.ok) {
      const cat = await res.json()
      setCategories(prev => [...prev, cat])
      setCategoryId(cat.id)
    }
    setNewCategoryName('')
    setAddingCategory(false)
  }

  // ─── Режим формы ─────────────────────────────────────────
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick')

  // Быстрый режим: КБЖУ вручную
  const [quickWeight, setQuickWeight] = useState<number>(0)
  const [quickWeightUnit, setQuickWeightUnit] = useState<'г' | 'мл'>('г')
  const [quickCalories, setQuickCalories] = useState<number>(0)
  const [quickProtein, setQuickProtein] = useState<number>(0)
  const [quickFat, setQuickFat] = useState<number>(0)
  const [quickCarbs, setQuickCarbs] = useState<number>(0)

  // ─── Шаг 2: Варианты для гостя (крупа, белок, начинка) ───
  const [variantGroups, setVariantGroups] = useState<VariantOption[]>([])

  // Флаги для загрузки
  const isInitialLoad = useRef(true)
  const [isReady, setIsReady] = useState(false)

  const isEdit = !!itemId
  const MAX_SIZES = 5

  // ─── Загрузка справочников (один раз) ─────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.ok ? r.json() : []),
      fetch('/api/ingredients').then(r => r.ok ? r.json() : []),
    ]).then(([cats, personalIngredients]) => {
      setCategories(cats)
      // Merge system libraries with personal ingredients from DB
      const personalLib = {
        id: 'my-library',
        name: 'Мои ингредиенты',
        isSystem: false,
        ingredients: personalIngredients,
      }
      const allLibs = [...systemLibraries, personalLib]
      setLibraries(allLibs)
      setIngredientRefs(allLibs.flatMap((l: { ingredients: IngredientRef[] }) => l.ingredients))
      setIsReady(true)
    })
  }, [])

  // ─── Загрузка существующего блюда ─────────────────────────
  useEffect(() => { void loadItem() }, [isReady, ingredientRefs, itemId])
  async function loadItem() {
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

    const found = await fetch(`/api/items/${itemId}`).then(r => r.ok ? r.json() : null).then(item => item ? { item, categoryId: item.categoryId } : null)
    console.log('Найденное блюдо:', found)

    if (found) {
      setName(found.item.name)
      setDescription(found.item.description ?? '')
      setCategoryId(found.categoryId)

      const hasComposition = (found.item.sizes?.length > 0 && found.item.sizes[0]?.composition?.length > 0)
        || (found.item.composition?.length > 0)

      if (!hasComposition) {
        // Quick mode — load flat КБЖУ
        setMode('quick')
        setQuickWeight(found.item.weight ?? 0)
        setQuickWeightUnit((found.item.weightUnit ?? 'г') as 'г' | 'мл')
        setQuickCalories(found.item.calories ?? 0)
        setQuickProtein(found.item.protein ?? 0)
        setQuickFat(found.item.fat ?? 0)
        setQuickCarbs(found.item.carbs ?? 0)
        isInitialLoad.current = false
        return
      }

      setMode('detailed')

      // Загрузка размеров и граммовок (шаг 1)
      if (found.item.sizes && found.item.sizes.length > 0) {
        const sizesData = found.item.sizes as Array<{ id: string; name?: string; weight: number; weightUnit: string; calories: number; protein: number; fat: number; carbs: number; composition?: Array<{ ingredientId: string; unit?: string; amount: number }> }>
        const compositionData = sizesData[0].composition || []

        const ingredientIdMap = new Map<string, string>()

        if (compositionData.length > 0) {
          const loadedIngredients = compositionData.map((comp: { ingredientId: string; unit?: string; amount: number }) => {
            const newId = crypto.randomUUID()
            const ref = ingredientRefs.find(r => r.id === comp.ingredientId)
            ingredientIdMap.set(comp.ingredientId, newId)
            return {
              id: newId,
              ingredientRefId: comp.ingredientId,
              name: ref?.name || `Неизвестный ингредиент (${comp.ingredientId})`,
              unit: (ref?.unit || comp.unit || 'г') as IngredientItem['unit'],
            }
          })
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
          setAmounts(loadedAmounts)
        }

        if (sizesData.length === 1) {
          setHasMultipleSizes(false)
          setSizes([{
            id: sizesData[0].id,
            name: sizesData[0].name || '',
            unit: (sizesData[0].weightUnit || 'г') as 'г' | 'мл'
          }])
        } else {
          setHasMultipleSizes(true)
          setSizes(sizesData.map(s => ({
            id: s.id,
            name: s.name || `${s.weight}${s.weightUnit}`,
            unit: (s.weightUnit || 'г') as 'г' | 'мл'
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
      } else if (found.item.composition && found.item.composition.length > 0) {
        // Flat composition — imported dish without a sizes structure
        const compositionData = found.item.composition as Array<{ ingredientId: string; unit?: string; amount: number }>
        const ingredientIdMap = new Map<string, string>()

        const loadedIngredients = compositionData.map(comp => {
          const newId = crypto.randomUUID()
          const ref = ingredientRefs.find(r => r.id === comp.ingredientId)
          ingredientIdMap.set(comp.ingredientId, newId)
          return {
            id: newId,
            ingredientRefId: comp.ingredientId,
            name: ref?.name || `ID: ${comp.ingredientId}`,
            unit: (ref?.unit || comp.unit || 'г') as IngredientItem['unit'],
          }
        })
        setIngredients(loadedIngredients)

        const loadedAmounts: AmountCell[] = compositionData
          .map(comp => ({
            ingredientId: ingredientIdMap.get(comp.ingredientId) ?? '',
            sizeId: 'default',
            amount: comp.amount,
          }))
          .filter(a => a.ingredientId)
        setAmounts(loadedAmounts)

        // Seed КБЖУ from item-level values so the summary shows meaningful data
        setManualNutri({
          default: {
            calories: found.item.calories,
            protein: found.item.protein,
            fat: found.item.fat,
            carbs: found.item.carbs,
            isManual: true,
          },
        })
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
  }

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

      const effectiveGrams = (ingredient.unit === 'шт' && ref.weightPerUnit)
        ? amountCell.amount * ref.weightPerUnit
        : amountCell.amount
      const ratio = effectiveGrams / 100
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
  const handleSave = useCallback(async () => {
    if (!name || !categoryId) return

    // ─── Быстрый режим ────────────────────────────────────
    if (mode === 'quick') {
      const quickItem = {
        id: itemId ?? crypto.randomUUID(),
        name,
        description: description || undefined,
        weight: quickWeight,
        weightUnit: quickWeightUnit,
        calories: quickCalories,
        protein: quickProtein,
        fat: quickFat,
        carbs: quickCarbs,
        isAvailable: true,
        composition: [],
        sizes: [],
        variantGroups: [],
        categoryId,
      }
      if (isEdit) {
        await fetch(`/api/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quickItem),
        })
      } else {
        await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quickItem),
        })
      }
      router.push('/dashboard/menu')
      return
    }

    if (ingredients.length === 0) return

    // Сохраняем размеры (шаг 1)
    const sizesToSave: SizeOption[] = sizes.map(size => {
      const composition = ingredients.map(ingredient => {
        const amountCell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
        return {
          ingredientId: ingredient.ingredientRefId,
          amount: amountCell?.amount || 0,
          unit: ingredient.unit,
        }
      }).filter(comp => comp.amount > 0)

      const nutri = calculateNutriForSize(size.id)
      const totalWeight = composition.reduce((sum, comp) => {
        const ref = ingredientRefs.find(r => r.id === comp.ingredientId)
        const grams = (comp.unit === 'шт' && ref?.weightPerUnit)
          ? comp.amount * ref.weightPerUnit
          : comp.amount
        return sum + grams
      }, 0)

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
      composition: sizesToSave[0].composition,
      sizes: sizesToSave,
      variantGroups: variantGroupsToSave.length > 0 ? variantGroupsToSave : undefined,
      categoryId,
      venueId: '1',
      isAvailable: true,
    }

    if (isEdit) {
      await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, categoryId }),
      })
    } else {
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, categoryId }),
      })
    }

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
      unit: ref.unit,
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

      {/* ─── Переключатель режима ─── */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: '#EAE7F8' }}>
        {(['quick', 'detailed'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={mode === m
              ? { background: '#2C2950', color: '#FEFEF2' }
              : { color: '#6B6490' }
            }
          >
            {m === 'quick' ? 'Быстро' : 'С составом'}
          </button>
        ))}
      </div>

      {/* ==================== ШАГ 1 ==================== */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4" style={{ color: '#2C2950' }}>Основное</h2>

        {/* Категория */}
        <FormField label="Категория" required>
          {addingCategory ? (
            <div className="flex gap-2">
              <FormInput
                autoFocus
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateCategory()
                  if (e.key === 'Escape') setAddingCategory(false)
                }}
                placeholder="Название категории"
                className="flex-1"
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                className="px-3 h-10 rounded-xl text-sm font-medium"
                style={{ background: '#2C2950', color: '#FEFEF2' }}
              >
                Создать
              </button>
              <button
                type="button"
                onClick={() => setAddingCategory(false)}
                className="px-3 h-10 rounded-xl text-sm"
                style={{ background: '#EAE7F8', color: '#6B6490' }}
              >
                Отмена
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <FormSelect value={categoryId} onChange={e => setCategoryId(e.target.value)} className="flex-1">
                {categories.length === 0 && <option value="">— нет категорий —</option>}
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </FormSelect>
              <button
                type="button"
                onClick={() => setAddingCategory(true)}
                className="px-3 h-10 rounded-xl text-sm whitespace-nowrap"
                style={{ background: '#EAE7F8', color: '#6B6490', border: '0.5px dashed rgba(176,166,223,0.6)' }}
              >
                + Новая
              </button>
            </div>
          )}
        </FormField>

        {/* Название */}
        <FormField label="Название" required>
          <FormInput
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Например: Боул"
            className="w-full"
          />
        </FormField>

        {/* Описание */}
        <FormField label="Описание (необязательно)">
          <FormTextarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Состав, особенности приготовления..."
          />
        </FormField>

        {/* ─── Быстрый режим: вес + КБЖУ вручную ─── */}
        {mode === 'quick' && (
          <>
            <FormField label="Вес порции">
              <div className="flex gap-2">
                <FormInput
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={quickWeight || ''}
                  onChange={e => setQuickWeight(Number(e.target.value))}
                  placeholder="0"
                  className="flex-1"
                />
                <FormSelect
                  value={quickWeightUnit}
                  onChange={e => setQuickWeightUnit(e.target.value as 'г' | 'мл')}
                  className="w-24"
                >
                  <option value="г">г</option>
                  <option value="мл">мл</option>
                </FormSelect>
              </div>
            </FormField>

            <FormField label="КБЖУ на порцию" required>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Калории', value: quickCalories, set: setQuickCalories },
                  { label: 'Белки', value: quickProtein, set: setQuickProtein },
                  { label: 'Жиры', value: quickFat, set: setQuickFat },
                  { label: 'Углеводы', value: quickCarbs, set: setQuickCarbs },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <p className="text-xs mb-1" style={{ color: '#6B6490' }}>{label}</p>
                    <FormInput
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.1}
                      value={value || ''}
                      onChange={e => set(Number(e.target.value))}
                      placeholder="0"
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </FormField>
          </>
        )}

        {/* Состав */}
        {mode === 'detailed' && <FormField label="Состав" required>
          <div className="space-y-2">
            {ingredients.map(ing => (
              <div key={ing.id} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-2 rounded-xl text-sm" style={{ background: '#EAE7F8', color: '#2C2950' }}>
                  {ing.name}
                </span>
                <RemoveButton onClick={() => removeIngredient(ing.id)} />
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
        </FormField>}

        {/* Размер порции */}
        {mode === 'detailed' && <>
        <FormField label="Размер порции" required>
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
                <FormInput
                  value={sizes[0]?.name || ''}
                  onChange={e => updateSizeName(sizes[0]?.id || 'default', e.target.value)}
                  placeholder="Название размера (например: Стандартный)"
                  className="flex-1"
                />
                <FormSelect
                  value={sizes[0]?.unit || 'г'}
                  onChange={e => updateSizeUnit(sizes[0]?.id || 'default', e.target.value as 'г' | 'мл')}
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
                      <FormInput
                        value={size.name}
                        onChange={e => updateSizeName(size.id, e.target.value)}
                        placeholder={idx === 0 ? "Средний" : "Большой"}
                        className="w-28 h-9 px-2 rounded-lg"
                      />
                      <FormSelect
                        value={size.unit}
                        onChange={e => updateSizeUnit(size.id, e.target.value as 'г' | 'мл')}
                        className="w-20 h-9 px-2 rounded-lg"
                      >
                        <option value="г">г</option>
                        <option value="мл">мл</option>
                      </FormSelect>
                      {sizes.length > 1 && (
                        <RemoveButton size="sm" onClick={() => removeSize(size.id)} />
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
        </FormField>

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
                  const unit = ingredient.unit
                  const isCount = unit === 'шт'
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
                                inputMode={isCount ? 'numeric' : 'decimal'}
                                step={isCount ? 1 : 0.1}
                                min={0}
                                value={amount || ''}
                                onChange={e => updateAmount(ingredient.id, size.id, isCount ? parseInt(e.target.value, 10) || 0 : Number(e.target.value))}
                                placeholder={isCount ? 'шт' : '0'}
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
                    if (ingredient.unit === 'шт') {
                      const ref = ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
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
                    <NutriFields
                      nutri={nutri}
                      onChange={(field, value) => updateManualNutri(size.id, field, value)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </>}
      </div>

      {/* ==================== ШАГ 2 ==================== */}
      {mode === 'detailed' && <>
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
              <RemoveButton variant="light" onClick={() => removeVariantGroup(group.id)} />
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
                    <button
                      onClick={() => setVariantPickerTarget({ groupId: group.id, optionId: opt.id })}
                      className="flex-1 h-8 px-3 rounded-lg text-sm text-left truncate transition-colors"
                      style={{
                        background: '#EAE7F8',
                        border: '0.5px solid rgba(176,166,223,0.3)',
                        color: selectedRef ? '#2C2950' : '#9D99B8',
                      }}
                    >
                      {selectedRef ? selectedRef.name : '— Выбрать ингредиент'}
                    </button>

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

                    <RemoveButton size="sm" onClick={() => removeVariantOption(group.id, opt.id)} />
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
      </>}

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
          allRefs={ingredientRefs}
          alreadyAddedIds={ingredients.map(i => i.ingredientRefId)}
          onSelect={ref => addIngredient(ref.id)}
          onClose={() => setPickerOpen(false)}
          onIngredientCreated={ref => {
            setIngredientRefs(prev => [...prev, ref])
            setLibraries(prev => prev.map(l =>
              l.id === 'my-library' ? { ...l, ingredients: [...l.ingredients, ref] } : l
            ))
          }}
        />
      )}

      {variantPickerTarget && libraries.length > 0 && (
        <IngredientPickerModal
          libraries={libraries}
          allRefs={ingredientRefs}
          alreadyAddedIds={[]}
          onSelect={ref => {
            const { groupId, optionId } = variantPickerTarget
            const group = variantGroups.find(g => g.id === groupId)
            const opt = group?.options.find(o => o.id === optionId)
            if (!group || !opt) return
            const amount = group.replacesIngredientRefId
              ? getAmountFromComposition(group.replacesIngredientRefId, sizes[0]?.id ?? '')
              : (opt.weight || 100)
            const rawUnit = group.replacesIngredientRefId ? (sizes[0]?.unit ?? 'г') : ref.unit
            const unit: 'г' | 'мл' = rawUnit === 'мл' ? 'мл' : 'г'
            const ratio = amount / 100
            updateVariantOption(groupId, optionId, {
              ingredientRefId: ref.id,
              label: ref.name,
              weight: amount,
              weightUnit: unit,
              calories: Math.round(ref.caloriesPer100 * ratio),
              protein: Math.round(ref.proteinPer100 * ratio * 10) / 10,
              fat: Math.round(ref.fatPer100 * ratio * 10) / 10,
              carbs: Math.round(ref.carbsPer100 * ratio * 10) / 10,
            })
            setVariantPickerTarget(null)
          }}
          onClose={() => setVariantPickerTarget(null)}
        />
      )}
    </div>
  )
}