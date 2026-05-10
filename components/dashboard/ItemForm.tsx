'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Category, IngredientLibrary, IngredientRef, SizeOption } from '@/types'
import { systemLibraries } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { FormField, FormInput, FormSelect, FormTextarea, NutriFields } from '@/components/ui/form-fields'
import { RemoveButton } from '@/components/ui/RemoveButton'
import IngredientPickerModal from './IngredientPickerModal'

// Типы для API-ответа (raw JSON, без строгой валидации на клиенте)
interface ApiVariantOption { id: string; ingredientRefId?: string; label?: string; weight?: number; weightUnit?: string; calories?: number; protein?: number; fat?: number; carbs?: number }
interface ApiVariantGroup { id: string; label?: string; required?: boolean; replacesIngredientRefId?: string; options?: ApiVariantOption[] }
interface ApiModifier { id: string; ingredientRefId?: string; label?: string }
interface ApiModifierGroup { id: string; label?: string; allowCustomGrams?: boolean; modifiers?: ApiModifier[] }

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
  price?: number
}

interface AmountCell {
  ingredientId: string
  sizeId: string
  amount: number
}

// ─── Типы для шага 3 (Добавки) ──────────────────────────────
interface AddonItem {
  id: string
  ingredientRefId: string
  label: string
}

interface AddonGroup {
  id: string
  label: string
  allowCustomGrams: boolean
  addons: AddonItem[]
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

// ─── Local sub-components ────────────────────────────────────

// ─────────────────────────────────────────────────────────────

export default function ItemForm({ itemId, categoryId: initialCategoryId }: { itemId?: string; categoryId?: string }) {
  const router = useRouter()

  // Шаг 1: Основные поля
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? '')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
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

  // ─── Шаг 3: Добавки для гостя ────────────────────────────
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([])
  const [addonPickerTarget, setAddonPickerTarget] = useState<{ groupId: string; addonId: string } | null>(null)

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
      if (cats.length > 0 && !initialCategoryId) setCategoryId(cats[0].id)
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
  }, [initialCategoryId])

  // ─── Загрузка существующего блюда ─────────────────────────
  useEffect(() => { void loadItem() }, [isReady, ingredientRefs, itemId]) // eslint-disable-line react-hooks/exhaustive-deps
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
      setPrice(found.item.price != null ? String(found.item.price) : '')
      setIsAvailable(found.item.isAvailable ?? true)
      setDescription(found.item.description ?? '')
      setPhoto(found.item.photo ?? '')
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
            unit: (s.weightUnit || 'г') as 'г' | 'мл',
            price: (s as { price?: number }).price,
          })))
        }

        const loadedManual: Record<string, { calories: number; protein: number; fat: number; carbs: number; isManual: boolean }> = {}
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
      // ─── Загрузка добавок (шаг 3) ─────────────────────────
      if (found.item.modifierGroups && found.item.modifierGroups.length > 0) {
        const loadedAddonGroups: AddonGroup[] = (found.item.modifierGroups as ApiModifierGroup[]).map(mg => ({
          id: mg.id,
          label: mg.label ?? '',
          allowCustomGrams: mg.allowCustomGrams ?? false,
          addons: (mg.modifiers ?? []).map(m => ({
            id: m.id,
            ingredientRefId: m.ingredientRefId ?? '',
            label: m.label ?? '',
          })),
        }))
        setAddonGroups(loadedAddonGroups)
      }

      if (found.item.variantGroups && found.item.variantGroups.length > 0) {
        const loadedVariantGroups: VariantOption[] = (found.item.variantGroups as ApiVariantGroup[]).map(vg => ({
          id: vg.id,
          label: vg.label ?? '',
          required: vg.required ?? false,
          replacesIngredientRefId: vg.replacesIngredientRefId,
          options: (vg.options ?? []).map((opt: ApiVariantOption) => {
            const ref = ingredientRefs.find(r => r.id === opt.ingredientRefId)
            return {
              id: opt.id,
              ingredientRefId: opt.ingredientRefId || '',
              label: ref?.name || opt.label || '',
              weight: opt.weight ?? 100,
              weightUnit: (opt.weightUnit ?? 'г') as 'г' | 'мл',
              calories: opt.calories ?? 0,
              protein: opt.protein ?? 0,
              fat: opt.fat ?? 0,
              carbs: opt.carbs ?? 0,
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

  // ─── Функции для шага 3 (Добавки) ────────────────────────
  const addAddonGroup = useCallback(() => {
    setAddonGroups(prev => [...prev, { id: crypto.randomUUID(), label: '', allowCustomGrams: false, addons: [] }])
  }, [])

  const updateAddonGroup = useCallback((groupId: string, updates: Partial<AddonGroup>) => {
    setAddonGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g))
  }, [])

  const removeAddonGroup = useCallback((groupId: string) => {
    setAddonGroups(prev => prev.filter(g => g.id !== groupId))
  }, [])

  const addAddonToGroup = useCallback((groupId: string) => {
    setAddonGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, addons: [...g.addons, { id: crypto.randomUUID(), ingredientRefId: '', label: '' }] }
        : g
    ))
  }, [])

  const updateAddon = useCallback((groupId: string, addonId: string, updates: Partial<AddonItem>) => {
    setAddonGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, addons: g.addons.map(a => a.id === addonId ? { ...a, ...updates } : a) }
        : g
    ))
  }, [])

  const removeAddon = useCallback((groupId: string, addonId: string) => {
    setAddonGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, addons: g.addons.filter(a => a.id !== addonId) } : g
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
        price: price ? parseFloat(price) : undefined,
        description: description || undefined,
        photo: photo || undefined,
        weight: quickWeight,
        weightUnit: quickWeightUnit,
        calories: quickCalories,
        protein: quickProtein,
        fat: quickFat,
        carbs: quickCarbs,
        isAvailable,
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
      toast.success(isEdit ? 'Блюдо сохранено' : 'Блюдо добавлено')
      router.push('/dashboard/menu')
      return
    }

    if (ingredients.length === 0) return

    if (sizes.length > 1 && sizes.some(s => !s.name.trim())) {
      toast.error('Назовите все размеры (например, S/M/L)')
      return
    }

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
        price: size.price,
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

    // Сохраняем добавки (шаг 3)
    const modifierGroupsToSave = addonGroups.map(group => {
      const modifiers = group.addons
        .filter(a => a.ingredientRefId)
        .map(a => {
          const ref = ingredientRefs.find(r => r.id === a.ingredientRefId)
          return {
            id: a.id,
            label: a.label || ref?.name || '',
            ingredientRefId: a.ingredientRefId,
            calories: ref?.caloriesPer100 ?? 0,
            protein: ref?.proteinPer100 ?? 0,
            fat: ref?.fatPer100 ?? 0,
            carbs: ref?.carbsPer100 ?? 0,
            weight: 100,
            weightUnit: 'г' as const,
          }
        })
      return {
        id: group.id,
        label: group.label,
        multi: true,
        required: false,
        type: 'addon' as const,
        allowCustomGrams: group.allowCustomGrams,
        modifiers,
      }
    }).filter(g => g.modifiers.length > 0)

    const newItem = {
      id: itemId ?? crypto.randomUUID(),
      name,
      price: price ? parseFloat(price) : undefined,
      description: description || undefined,
      photo: photo || undefined,
      weight: sizesToSave[0].weight,
      weightUnit: sizesToSave[0].weightUnit,
      calories: sizesToSave[0].calories,
      protein: sizesToSave[0].protein,
      fat: sizesToSave[0].fat,
      carbs: sizesToSave[0].carbs,
      composition: sizesToSave[0].composition,
      sizes: sizesToSave,
      variantGroups: variantGroupsToSave.length > 0 ? variantGroupsToSave : undefined,
      modifierGroups: modifierGroupsToSave.length > 0 ? modifierGroupsToSave : undefined,
      categoryId,
      venueId: '1',
      isAvailable,
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

    toast.success(isEdit ? 'Блюдо сохранено' : 'Блюдо добавлено')
    router.push('/dashboard/menu')
  }, [name, categoryId, description, photo, price, isAvailable, mode, quickWeight, quickWeightUnit, quickCalories, quickProtein, quickFat, quickCarbs, ingredients, sizes, amounts, ingredientRefs, variantGroups, addonGroups, isEdit, itemId, router, calculateNutriForSize])

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

  const updateSizePrice = useCallback((sizeId: string, newPrice: number | undefined) => {
    setSizes(prev => prev.map(s => s.id === sizeId ? { ...s, price: newPrice } : s))
  }, [])

  const applySizePreset = useCallback((preset: { name: string; unit: 'г' | 'мл' }[]) => {
    setSizes(preset.map(p => ({ id: crypto.randomUUID(), name: p.name, unit: p.unit })))
    setAmounts([])
    setManualNutri({})
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
    <div className="px-4 py-6 md:p-8 max-w-5xl mx-auto">
      <button onClick={() => router.back()} className="mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        ← Назад
      </button>

      <h1 className="text-xl font-medium mb-6" style={{ color: 'var(--color-text-primary)' }}>
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
              ? { background: 'var(--color-text-primary)', color: '#FEFEF2' }
              : { color: 'var(--color-text-secondary)' }
            }
          >
            {m === 'quick' ? 'Быстро' : 'С составом'}
          </button>
        ))}
      </div>

      {/* ==================== ШАГ 1 ==================== */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--color-text-primary)' }}>Основное</h2>

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
                style={{ background: 'var(--color-text-primary)', color: '#FEFEF2' }}
              >
                Создать
              </button>
              <button
                type="button"
                onClick={() => setAddingCategory(false)}
                className="px-3 h-10 rounded-xl text-sm"
                style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
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
                style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)', border: '0.5px dashed rgba(176,166,223,0.6)' }}
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

        {/* Цена */}
        <FormField label="Цена (необязательно)">
          <div className="relative">
            <FormInput
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              className="w-full pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>₽</span>
          </div>
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

        {/* Доступность */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Показывать гостям</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Скрытые блюда не видны на публичном меню</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailable(v => !v)}
            className="w-11 h-6 rounded-full transition-colors relative shrink-0"
            style={{ background: isAvailable ? '#8B5CF6' : '#E2E8F0' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: isAvailable ? 'translateX(18px)' : 'translateX(0px)' }}
            />
          </button>
        </div>

        {/* Фото */}
        <FormField label="Фото блюда (необязательно)">
          <div className="flex items-center gap-3">
            {photo ? (
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt="Фото блюда"
                  className="w-20 h-20 rounded-xl object-cover"
                  style={{ border: '0.5px solid rgba(255,255,255,0.5)' }}
                  onError={() => {
                    console.error('Photo failed to load:', photo)
                    setPhotoError('Не удалось загрузить картинку')
                  }}
                />
                <button
                  onClick={() => setPhoto('')}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ background: 'var(--color-text-muted)', color: '#fff' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                style={{ background: 'rgba(255,255,255,0.4)', border: '0.5px dashed rgba(176,166,223,0.6)' }}
              >
                🍽️
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label
                className="cursor-pointer flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all"
                style={{ background: '#EAE7F8', color: 'var(--color-text-primary)', opacity: photoUploading ? 0.6 : 1 }}
              >
                {photoUploading ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Загружаем...
                  </>
                ) : photo ? 'Заменить фото' : 'Загрузить фото'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={photoUploading}
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setPhotoUploading(true)
                    setPhotoError('')
                    try {
                      const form = new FormData()
                      form.append('file', file)
                      const res = await fetch('/api/upload', { method: 'POST', body: form })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok && data.url) {
                        console.log('Photo uploaded:', data.url)
                        setPhoto(data.url)
                      } else {
                        console.error('Upload failed:', res.status, data)
                        setPhotoError(data.error ?? `Ошибка загрузки (${res.status})`)
                      }
                    } catch (err) {
                      console.error('Upload error:', err)
                      setPhotoError('Нет соединения')
                    } finally {
                      setPhotoUploading(false)
                      e.target.value = ''
                    }
                  }}
                />
              </label>
              {photoError && (
                <p className="text-xs" style={{ color: '#DC2626' }}>{photoError}</p>
              )}
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>JPG, PNG, WebP · до 5 МБ</p>
            </div>
          </div>
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
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
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
                <span className="flex-1 px-3 py-2 rounded-xl text-sm" style={{ background: '#EAE7F8', color: 'var(--color-text-primary)' }}>
                  {ing.name}
                </span>
                <RemoveButton onClick={() => removeIngredient(ing.id)} />
              </div>
            ))}

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full h-10 px-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-secondary)' }}
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
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Один размер</span>
            </label>

            {!hasMultipleSizes && (
              <div className="ml-6 flex gap-2">
                <FormInput
                  value={sizes[0]?.name || ''}
                  onChange={e => updateSizeName(sizes[0]?.id || 'default', e.target.value)}
                  placeholder="Название (необязательно, например: Стандартный)"
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
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Несколько размеров</span>
            </label>

            {hasMultipleSizes && (
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
                      onClick={() => applySizePreset(p.preset)}
                      className="text-xs px-2.5 py-1 rounded-full transition-all active:scale-95"
                      style={{ color: '#534AB7', background: '#EAE7F8' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2 mb-3">
                  {sizes.map((size, idx) => (
                    <div key={size.id} className="flex items-center gap-1 flex-wrap">
                      <FormInput
                        value={size.name}
                        onChange={e => updateSizeName(size.id, e.target.value)}
                        placeholder={idx === 0 ? "Маленькая" : idx === 1 ? "Средняя" : "Большая"}
                        className="w-32 h-11 px-2 rounded-lg"
                      />
                      <FormSelect
                        value={size.unit}
                        onChange={e => updateSizeUnit(size.id, e.target.value as 'г' | 'мл')}
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
                          onChange={e => updateSizePrice(size.id, e.target.value === '' ? undefined : Number(e.target.value))}
                          placeholder="Цена"
                          className="w-24 h-11 px-2 rounded-lg text-sm outline-none"
                          style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                        />
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>₽</span>
                      </div>
                      {sizes.length > 1 && (
                        <RemoveButton size="sm" onClick={() => removeSize(size.id)} />
                      )}
                    </div>
                  ))}
                  {sizes.length < MAX_SIZES && (
                    <button
                      type="button"
                      onClick={addSize}
                      className="text-sm px-3 py-1.5 rounded-lg self-start"
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
          <div className="mb-5">
            {/* Mobile: стек по размерам */}
            <div className="md:hidden space-y-3">
              {sizes.map((size, sizeIdx) => {
                const sizeNutri = calculateNutriForSize(size.id)
                let sizeWeight = 0
                for (const ingredient of ingredients) {
                  const cell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
                  if (!cell?.amount) continue
                  if (ingredient.unit === 'шт') {
                    const ref = ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
                    sizeWeight += ref?.weightPerUnit ? cell.amount * ref.weightPerUnit : cell.amount
                  } else {
                    sizeWeight += cell.amount
                  }
                }
                return (
                <div key={size.id} className="rounded-xl overflow-hidden" style={{ border: '0.5px solid rgba(176,166,223,0.3)' }}>
                  <div className="px-3 py-2 text-xs font-medium" style={{ background: '#EAE7F8', color: '#534AB7' }}>
                    {size.name || (hasMultipleSizes ? `Размер ${sizeIdx + 1}` : 'Порция')} ({size.unit})
                  </div>
                  <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.15)' }}>
                    {ingredients.map(ingredient => {
                      const unit = ingredient.unit
                      const isCount = unit === 'шт'
                      const amount = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)?.amount || 0
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
                              onChange={e => updateAmount(ingredient.id, size.id, isCount ? parseInt(e.target.value, 10) || 0 : Number(e.target.value))}
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

            {/* Desktop: таблица */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Ингредиент</th>
                    {sizes.map((size, idx) => (
                      <th key={size.id} className="text-center py-2 px-2 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        {size.name || (hasMultipleSizes ? `Размер ${idx + 1}` : 'Порция')}
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
                        <td className="py-2 px-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {ingredient.name}
                          <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>({unit})</span>
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
                    {sizes.map(size => {
                      const n = calculateNutriForSize(size.id)
                      let w = 0
                      for (const ingredient of ingredients) {
                        const cell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
                        if (!cell?.amount) continue
                        if (ingredient.unit === 'шт') {
                          const ref = ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
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

        {/* Итоговое КБЖУ */}
        {sizes.length > 0 && ingredients.length > 0 && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: '#EAE7F8' }}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>Итоговое КБЖУ (на порцию)</p>
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
        <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--color-text-primary)' }}>Выборы для гостя</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
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
                className="flex-1 h-11 px-3 rounded-xl text-sm outline-none"
                style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
              />
              <label className="flex items-center gap-2 text-xs cursor-pointer shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
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
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Заменяет:</span>
                <select
                  value={group.replacesIngredientRefId || ''}
                  onChange={e => updateVariantGroup(group.id, { replacesIngredientRefId: e.target.value || undefined })}
                  className="flex-1 h-11 px-3 rounded-xl text-sm outline-none"
                  style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
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
                  <div className="flex items-center gap-1 flex-wrap">
                    {replacedAmountsPerSize.map(({ size, amount }, idx) => (
                      <span key={size.id} className="px-2 py-0.5 rounded-lg text-xs"
                        style={{ background: '#D8D4F0', color: '#534AB7' }}>
                        {size.name || (sizes.length === 1 ? 'порция' : `Размер ${idx + 1}`)}: {amount} {size.unit}
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
                  <div key={opt.id} className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: '#FEFEF2' }}>
                    {/* Строка 1: ингредиент + удалить */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setVariantPickerTarget({ groupId: group.id, optionId: opt.id })}
                        className="flex-1 h-10 px-3 rounded-lg text-sm text-left truncate transition-colors"
                        style={{
                          background: '#EAE7F8',
                          border: '0.5px solid rgba(176,166,223,0.3)',
                          color: selectedRef ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        }}
                      >
                        {selectedRef ? selectedRef.name : '— Выбрать ингредиент'}
                      </button>
                      <RemoveButton size="sm" onClick={() => removeVariantOption(group.id, opt.id)} />
                    </div>

                    {/* Строка 2: вес / унаследованные объёмы + ккал */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {replacedAmountsPerSize ? (
                        <>
                          {replacedAmountsPerSize.map(({ size, amount }, idx) => (
                            <span key={size.id} className="px-2 py-1 rounded-lg text-xs"
                              style={{ background: '#EAE7F8', color: '#534AB7' }}>
                              {size.name || (sizes.length === 1 ? 'порция' : `Размер ${idx + 1}`)}: {amount} {size.unit}
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
                            className="w-20 h-10 px-2 rounded-l-lg text-sm outline-none text-center"
                            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                          />
                          <select
                            value={opt.weightUnit}
                            onChange={e => updateVariantOption(group.id, opt.id, { weightUnit: e.target.value as 'г' | 'мл' })}
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
                    </div>
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

      {/* ==================== ШАГ 3: Добавки для гостя ==================== */}
      {mode === 'detailed' && (
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Добавки для гостя</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Ингредиенты, которые гость может добавить к блюду (сахар, молоко, соус и т.д.)
        </p>

        {addonGroups.map(group => (
          <div key={group.id} className="mb-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(176,166,223,0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <FormInput
                value={group.label}
                onChange={e => updateAddonGroup(group.id, { label: e.target.value })}
                placeholder="Название группы (напр. Сахар)"
                className="flex-1"
              />
              <button
                onClick={() => removeAddonGroup(group.id)}
                className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
                style={{ background: '#EAE7F8', color: 'var(--color-text-muted)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Чекбокс: ввод граммов */}
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={group.allowCustomGrams}
                onChange={e => updateAddonGroup(group.id, { allowCustomGrams: e.target.checked })}
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
              const ref = ingredientRefs.find(r => r.id === addon.ingredientRefId)
              return (
                <div key={addon.id} className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setAddonPickerTarget({ groupId: group.id, addonId: addon.id })}
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
                  <button
                    onClick={() => removeAddon(group.id, addon.id)}
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
              onClick={() => addAddonToGroup(group.id)}
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
          onClick={addAddonGroup}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm w-full justify-center"
          style={{ border: '0.5px dashed rgba(176,166,223,0.6)', color: '#B0A6DF', background: '#EAE7F8' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          + Добавить группу добавок
        </button>
      </div>
      )}

      {/* Кнопки */}
      <div className="flex justify-between pt-4 border-t" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
        <button
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={!name || !categoryId || (mode === 'detailed' && ingredients.length === 0)}
          className="px-6 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: name && categoryId && (mode === 'quick' || ingredients.length > 0) ? '#B0A6DF' : '#EAE7F8',
            color: name && categoryId && (mode === 'quick' || ingredients.length > 0) ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
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

      {addonPickerTarget && libraries.length > 0 && (
        <IngredientPickerModal
          libraries={libraries}
          allRefs={ingredientRefs}
          alreadyAddedIds={[]}
          onSelect={ref => {
            const { groupId, addonId } = addonPickerTarget
            updateAddon(groupId, addonId, { ingredientRefId: ref.id, label: ref.name })
            setAddonPickerTarget(null)
          }}
          onClose={() => setAddonPickerTarget(null)}
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