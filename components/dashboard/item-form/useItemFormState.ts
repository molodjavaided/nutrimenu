'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Category, IngredientLibrary, IngredientRef, ProcessingType, SizeOption } from '@/types'
import { systemLibraries } from '@/lib/mock-data'
import { defaultItemFormValues, itemFormSchema, type ItemFormValues } from './schema'
import { compositionReducer, initialCompositionState, type ManualNutri } from './composition-reducer'

// ─── Domain types (used by sections) ───────────────────────────────────────
export interface ApiVariantOption { id: string; ingredientRefId?: string; label?: string; weight?: number; weightUnit?: string; calories?: number; protein?: number; fat?: number; carbs?: number; price?: number }
export interface ApiVariantGroup { id: string; label?: string; required?: boolean; replacesIngredientRefId?: string; options?: ApiVariantOption[] }
export interface ApiModifier { id: string; ingredientRefId?: string; label?: string; price?: number }
export interface ApiModifierGroup { id: string; label?: string; allowCustomGrams?: boolean; modifiers?: ApiModifier[] }

export interface IngredientItem {
  id: string
  ingredientRefId: string
  name: string
  unit: 'г' | 'мл' | 'шт' | 'кг' | 'л'
  processing?: ProcessingType  // ТТК: способ обработки
  yieldOverride?: number  // ТТК: ручной коэффициент выхода (если перебивает ГОСТ/ref)
}

export interface Size {
  id: string
  name: string
  unit: 'г' | 'мл'
  price?: number
}

export interface AmountCell {
  ingredientId: string
  sizeId: string
  amount: number
}

export interface AddonItem {
  id: string
  ingredientRefId: string
  label: string
  price?: number
}

export interface AddonGroup {
  id: string
  label: string
  allowCustomGrams: boolean
  addons: AddonItem[]
}

export interface VariantOption {
  id: string
  label: string
  required: boolean
  options: VariantChoice[]
  replacesIngredientRefId?: string
}

export interface VariantChoice {
  id: string
  ingredientRefId?: string
  label: string
  weight: number
  weightUnit: 'г' | 'мл'
  calories: number
  protein: number
  fat: number
  carbs: number
  price?: number
  isManual?: boolean
}

export const MAX_SIZES = 5

export interface UseItemFormStateArgs {
  itemId?: string
  initialCategoryId?: string
}

export function useItemFormState({ itemId, initialCategoryId }: UseItemFormStateArgs) {
  const router = useRouter()

  // ── RHF: validated form fields (basic + quick + mode) ───────────────────
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { ...defaultItemFormValues, categoryId: initialCategoryId ?? '' },
    mode: 'onSubmit',
  })

  const values = form.watch()

  function makePlainSetter<K extends keyof ItemFormValues>(key: K) {
    return (v: ItemFormValues[K]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.setValue(key as any, v as any, { shouldDirty: true })
    }
  }
  function makeUpdaterSetter<K extends keyof ItemFormValues>(key: K) {
    return (v: ItemFormValues[K] | ((prev: ItemFormValues[K]) => ItemFormValues[K])) => {
      const current = form.getValues(key) as ItemFormValues[K]
      const next = typeof v === 'function' ? (v as (p: ItemFormValues[K]) => ItemFormValues[K])(current) : v
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.setValue(key as any, next as any, { shouldDirty: true })
    }
  }

  const categoryId = values.categoryId
  const setCategoryId = makePlainSetter('categoryId')
  const name = values.name
  const setName = makePlainSetter('name')
  const price = values.price
  const setPrice = makePlainSetter('price')
  const isAvailable = values.isAvailable
  const setIsAvailable = makeUpdaterSetter('isAvailable')
  const description = values.description
  const setDescription = makePlainSetter('description')
  const photo = values.photo
  const setPhoto = makePlainSetter('photo')
  const photoPosition = values.photoPosition
  const setPhotoPosition = makePlainSetter('photoPosition')

  // ── basic ────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [ingredientRefs, setIngredientRefs] = useState<IngredientRef[]>([])
  const [libraries, setLibraries] = useState<IngredientLibrary[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [variantPickerTarget, setVariantPickerTarget] = useState<{ groupId: string; optionId: string } | null>(null)

  // composition (typed reducer — replaces 5 useState calls)
  const [composition, dispatch] = useReducer(compositionReducer, initialCompositionState)
  const { ingredients, sizes, amounts, manualNutri, hasMultipleSizes } = composition

  const setIngredients = useCallback((arr: IngredientItem[]) => dispatch({ type: 'SET_INGREDIENTS', ingredients: arr }), [])
  const setSizes = useCallback((arr: Size[]) => dispatch({ type: 'SET_SIZES', sizes: arr }), [])
  const setAmounts = useCallback((arr: AmountCell[]) => dispatch({ type: 'SET_AMOUNTS', amounts: arr }), [])
  const setManualNutri = useCallback((m: ManualNutri) => dispatch({ type: 'SET_MANUAL_NUTRI', manualNutri: m }), [])
  const setHasMultipleSizes = useCallback((v: boolean) => dispatch({ type: 'SET_HAS_MULTIPLE_SIZES', value: v }), [])

  // inline category create
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // mode (in RHF)
  const mode = values.mode
  const setMode = makePlainSetter('mode')

  // quick mode (in RHF)
  const quickWeight = values.quickWeight
  const setQuickWeight = makePlainSetter('quickWeight')
  const quickWeightUnit = values.quickWeightUnit
  const setQuickWeightUnit = makePlainSetter('quickWeightUnit')
  const quickCalories = values.quickCalories
  const setQuickCalories = makePlainSetter('quickCalories')
  const quickProtein = values.quickProtein
  const setQuickProtein = makePlainSetter('quickProtein')
  const quickFat = values.quickFat
  const setQuickFat = makePlainSetter('quickFat')
  const quickCarbs = values.quickCarbs
  const setQuickCarbs = makePlainSetter('quickCarbs')

  // ТТК (in RHF)
  const finalWeight = values.finalWeight
  const setFinalWeight = makePlainSetter('finalWeight')
  const servingSize = values.servingSize
  const setServingSize = makePlainSetter('servingSize')

  // variants (in RHF)
  const variantGroups = values.variantGroups as VariantOption[]
  const setVariantGroups = useCallback((arr: VariantOption[] | ((prev: VariantOption[]) => VariantOption[])) => {
    const current = form.getValues('variantGroups') as VariantOption[]
    const next = typeof arr === 'function' ? arr(current) : arr
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.setValue('variantGroups', next as any, { shouldDirty: true })
  }, [form])

  // addons (in RHF)
  const addonGroups = values.addonGroups as AddonGroup[]
  const setAddonGroups = useCallback((arr: AddonGroup[] | ((prev: AddonGroup[]) => AddonGroup[])) => {
    const current = form.getValues('addonGroups') as AddonGroup[]
    const next = typeof arr === 'function' ? arr(current) : arr
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.setValue('addonGroups', next as any, { shouldDirty: true })
  }, [form])
  const [addonPickerTarget, setAddonPickerTarget] = useState<{ groupId: string; addonId: string } | null>(null)

  // allergens (in RHF)
  const allergens = values.allergens
  const setAllergens = makeUpdaterSetter('allergens')

  // load flags
  const isInitialLoad = useRef(true)
  const [isReady, setIsReady] = useState(false)

  const isEdit = !!itemId

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

  // ── load references ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.ok ? r.json() : []),
      fetch('/api/ingredients').then(r => r.ok ? r.json() : []),
    ]).then(([cats, personalIngredients]) => {
      setCategories(cats)
      if (cats.length > 0 && !initialCategoryId) setCategoryId(cats[0].id)
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

  // ── load existing item ───────────────────────────────────────────────────
  useEffect(() => { void loadItem() }, [isReady, ingredientRefs, itemId]) // eslint-disable-line react-hooks/exhaustive-deps
  async function loadItem() {
    if (!isReady) return
    if (ingredientRefs.length === 0) return
    if (!itemId || !isInitialLoad.current) return

    const found = await fetch(`/api/items/${itemId}`).then(r => r.ok ? r.json() : null).then(item => item ? { item, categoryId: item.categoryId } : null)

    if (found) {
      setName(found.item.name)
      setPrice(found.item.price != null ? String(found.item.price) : '')
      setIsAvailable(found.item.isAvailable ?? true)
      setDescription(found.item.description ?? '')
      setPhoto(found.item.photo ?? '')
      setPhotoPosition(found.item.photoPosition ?? 'center')
      setCategoryId(found.categoryId)
      setAllergens(found.item.allergens ?? [])

      const hasComposition = (found.item.sizes?.length > 0 && found.item.sizes[0]?.composition?.length > 0)
        || (found.item.composition?.length > 0)

      if (!hasComposition) {
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

      setMode((found.item.creationMode === 'ttk' ? 'ttk' : 'composition'))
      if (typeof found.item.finalWeight === 'number') setFinalWeight(found.item.finalWeight)
      if (typeof found.item.servingSize === 'number') setServingSize(found.item.servingSize)

      if (found.item.sizes && found.item.sizes.length > 0) {
        const sizesData = found.item.sizes as Array<{ id: string; name?: string; weight: number; weightUnit: string; calories: number; protein: number; fat: number; carbs: number; composition?: Array<{ ingredientId: string; unit?: string; amount: number; processing?: ProcessingType; yieldOverride?: number }> }>
        const compositionData = sizesData[0].composition || []

        const ingredientIdMap = new Map<string, string>()

        if (compositionData.length > 0) {
          const loadedIngredients = compositionData.map((comp) => {
            const newId = crypto.randomUUID()
            const ref = ingredientRefs.find(r => r.id === comp.ingredientId)
            ingredientIdMap.set(comp.ingredientId, newId)
            return {
              id: newId,
              ingredientRefId: comp.ingredientId,
              name: ref?.name || `Неизвестный ингредиент (${comp.ingredientId})`,
              unit: (ref?.unit || comp.unit || 'г') as IngredientItem['unit'],
              processing: comp.processing,
              yieldOverride: comp.yieldOverride,
            }
          })
          setIngredients(loadedIngredients)

          const loadedAmounts: AmountCell[] = []
          for (const size of sizesData) {
            for (const comp of size.composition || []) {
              const mappedId = ingredientIdMap.get(comp.ingredientId)
              if (mappedId) {
                loadedAmounts.push({ ingredientId: mappedId, sizeId: size.id, amount: comp.amount })
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
            unit: (sizesData[0].weightUnit || 'г') as 'г' | 'мл',
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
        const compositionData = found.item.composition as Array<{ ingredientId: string; unit?: string; amount: number; processing?: ProcessingType; yieldOverride?: number }>
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
            processing: comp.processing,
            yieldOverride: comp.yieldOverride,
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

      if (found.item.modifierGroups && found.item.modifierGroups.length > 0) {
        const loadedAddonGroups: AddonGroup[] = (found.item.modifierGroups as ApiModifierGroup[]).map(mg => ({
          id: mg.id,
          label: mg.label ?? '',
          allowCustomGrams: mg.allowCustomGrams ?? false,
          addons: (mg.modifiers ?? []).map(m => ({
            id: m.id,
            ingredientRefId: m.ingredientRefId ?? '',
            label: m.label ?? '',
            price: m.price,
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
          options: (vg.options ?? []).map((opt) => {
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
              price: opt.price,
              isManual: true,
            }
          }),
        }))
        setVariantGroups(loadedVariantGroups)
      }
    }

    isInitialLoad.current = false
  }

  // ── variants ─────────────────────────────────────────────────────────────
  const addVariantGroup = useCallback(() => {
    setVariantGroups(prev => [...prev, { id: crypto.randomUUID(), label: '', required: false, options: [] }])
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

  // ── addons ───────────────────────────────────────────────────────────────
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

  // ── nutri calc ───────────────────────────────────────────────────────────
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

  // ── save (validated via zod on submit) ───────────────────────────────────
  const handleSave = form.handleSubmit(async () => {
    if (mode === 'quick') {
      const quickItem = {
        id: itemId ?? crypto.randomUUID(),
        name,
        price: price ? parseFloat(price) : undefined,
        description: description || undefined,
        photo: photo || undefined,
        photoPosition: photo ? photoPosition : undefined,
        weight: quickWeight,
        weightUnit: quickWeightUnit,
        calories: quickCalories,
        protein: quickProtein,
        fat: quickFat,
        carbs: quickCarbs,
        isAvailable,
        allergens: allergens.length > 0 ? allergens : undefined,
        composition: [],
        sizes: [],
        variantGroups: [],
        creationMode: 'quick',
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

    if (ingredients.length === 0) {
      toast.error('Добавьте хотя бы один ингредиент')
      return
    }

    if (sizes.length > 1 && sizes.some(s => !s.name.trim())) {
      toast.error('Назовите все размеры (например, S/M/L)')
      return
    }

    const replacedIngredientRefIds = new Set(
      variantGroups
        .map(g => g.replacesIngredientRefId)
        .filter((id): id is string => Boolean(id)),
    )

    if (sizes.length > 1 && replacedIngredientRefIds.size > 0) {
      for (const refId of replacedIngredientRefIds) {
        const ing = ingredients.find(i => i.ingredientRefId === refId)
        if (!ing) continue
        const missingSize = sizes.find(s =>
          !(amounts.find(a => a.ingredientId === ing.id && a.sizeId === s.id)?.amount),
        )
        if (missingSize) {
          toast.error(`Заполните количество «${ing.name}» для размера «${missingSize.name}»`)
          return
        }
      }
    }

    const sizesToSave: SizeOption[] = sizes.map(size => {
      const composition = ingredients.flatMap(ingredient => {
        const amountCell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
        const amount = amountCell?.amount || 0
        const isReplaced = replacedIngredientRefIds.has(ingredient.ingredientRefId)
        if (amount === 0 && !isReplaced) return []
        return [{
          ingredientId: ingredient.ingredientRefId,
          amount,
          unit: ingredient.unit,
          ...(mode === 'ttk' && ingredient.processing && ingredient.processing !== 'raw'
            ? { processing: ingredient.processing }
            : {}),
          ...(mode === 'ttk' && ingredient.yieldOverride !== undefined && ingredient.yieldOverride > 0
            ? { yieldOverride: ingredient.yieldOverride }
            : {}),
        }]
      })

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

    const variantGroupsToSave = variantGroups.map(group => {
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
                price: opt.price || undefined,
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
            price: opt.price || undefined,
          }
        }),
      }
    })

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
            price: a.price || undefined,
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
      photoPosition: photo ? photoPosition : undefined,
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
      allergens: allergens.length > 0 ? allergens : undefined,
      creationMode: mode,
      finalWeight: mode === 'ttk' ? finalWeight : undefined,
      servingSize: mode === 'ttk' ? servingSize : undefined,
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
  }, () => {
    toast.error('Проверьте обязательные поля')
  })

  // ── composition handlers (all via reducer dispatch) ──────────────────────
  const addIngredient = useCallback((ingredientRefId: string) => {
    const ref = ingredientRefs.find(r => r.id === ingredientRefId)
    if (!ref) return
    const ingredient: IngredientItem = {
      id: crypto.randomUUID(),
      ingredientRefId,
      name: ref.name,
      unit: ref.unit,
    }
    dispatch({ type: 'ADD_INGREDIENT', ingredient })
  }, [ingredientRefs])

  const removeIngredient = useCallback((ingredientId: string) => {
    dispatch({ type: 'REMOVE_INGREDIENT', ingredientId })
  }, [])

  const updateIngredientProcessing = useCallback((ingredientId: string, processing: ProcessingType | undefined) => {
    dispatch({
      type: 'SET_INGREDIENTS',
      ingredients: ingredients.map(i => i.id === ingredientId
        ? { ...i, processing, yieldOverride: processing === 'raw' ? undefined : i.yieldOverride }
        : i),
    })
  }, [ingredients])

  const addCompanionIngredient = useCallback((sourceIngredientId: string, refId: string, ratio: number) => {
    const ref = ingredientRefs.find(r => r.id === refId)
    if (!ref) return
    if (ingredients.some(i => i.ingredientRefId === refId)) return
    const newId = crypto.randomUUID()
    const newIngredient: IngredientItem = {
      id: newId,
      ingredientRefId: refId,
      name: ref.name,
      unit: ref.unit,
    }
    dispatch({ type: 'ADD_INGREDIENT', ingredient: newIngredient })
    for (const size of sizes) {
      const src = amounts.find(a => a.ingredientId === sourceIngredientId && a.sizeId === size.id)
      const baseAmount = src?.amount ?? 0
      if (baseAmount <= 0) continue
      const computed = Math.max(1, Math.round(baseAmount * ratio))
      dispatch({ type: 'UPDATE_AMOUNT', ingredientId: newId, sizeId: size.id, amount: computed })
    }
  }, [ingredientRefs, ingredients, sizes, amounts])

  const updateIngredientYieldOverride = useCallback((ingredientId: string, yieldOverride: number | undefined) => {
    dispatch({
      type: 'SET_INGREDIENTS',
      ingredients: ingredients.map(i => i.id === ingredientId ? { ...i, yieldOverride } : i),
    })
  }, [ingredients])

  const addSize = useCallback(() => dispatch({ type: 'ADD_SIZE' }), [])
  const updateSizeName = useCallback((sizeId: string, name: string) =>
    dispatch({ type: 'UPDATE_SIZE_NAME', sizeId, name }), [])
  const updateSizeUnit = useCallback((sizeId: string, unit: 'г' | 'мл') =>
    dispatch({ type: 'UPDATE_SIZE_UNIT', sizeId, unit }), [])
  const updateSizePrice = useCallback((sizeId: string, price: number | undefined) =>
    dispatch({ type: 'UPDATE_SIZE_PRICE', sizeId, price }), [])
  const applySizePreset = useCallback((preset: { name: string; unit: 'г' | 'мл' }[]) =>
    dispatch({ type: 'APPLY_SIZE_PRESET', preset }), [])
  const removeSize = useCallback((sizeId: string) =>
    dispatch({ type: 'REMOVE_SIZE', sizeId }), [])
  const updateAmount = useCallback((ingredientId: string, sizeId: string, amount: number) =>
    dispatch({ type: 'UPDATE_AMOUNT', ingredientId, sizeId, amount }), [])
  const updateManualNutri = useCallback((sizeId: string, field: string, value: number) =>
    dispatch({ type: 'UPDATE_MANUAL_NUTRI', sizeId, field, value }), [])

  const getAmountFromComposition = useCallback((ingredientRefId: string, sizeId: string): number => {
    const ingredient = ingredients.find(i => i.ingredientRefId === ingredientRefId)
    if (!ingredient) return 0
    return amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === sizeId)?.amount ?? 0
  }, [ingredients, amounts])

  return {
    // refs / loaded
    categories, libraries, ingredientRefs,
    setIngredientRefs, setLibraries,
    // basic
    categoryId, setCategoryId, name, setName, price, setPrice,
    isAvailable, setIsAvailable, description, setDescription,
    photo, setPhoto, photoPosition, setPhotoPosition,
    photoUploading, setPhotoUploading, photoError, setPhotoError,
    allergens, setAllergens,
    addingCategory, setAddingCategory,
    newCategoryName, setNewCategoryName,
    handleCreateCategory,
    // mode
    mode, setMode,
    // quick
    quickWeight, setQuickWeight, quickWeightUnit, setQuickWeightUnit,
    quickCalories, setQuickCalories, quickProtein, setQuickProtein,
    quickFat, setQuickFat, quickCarbs, setQuickCarbs,
    // ttk
    finalWeight, setFinalWeight, servingSize, setServingSize,
    // composition
    ingredients, setIngredients,
    hasMultipleSizes, setHasMultipleSizes,
    sizes, setSizes,
    amounts, setAmounts,
    manualNutri, setManualNutri,
    addIngredient, removeIngredient, updateIngredientProcessing, updateIngredientYieldOverride, addCompanionIngredient,
    addSize, updateSizeName, updateSizeUnit, updateSizePrice, applySizePreset, removeSize,
    updateAmount, updateManualNutri,
    calculateNutriForSize, getAmountFromComposition,
    // variants
    variantGroups, setVariantGroups,
    addVariantGroup, updateVariantGroup, removeVariantGroup,
    addVariantOption, updateVariantOption, removeVariantOption,
    // addons
    addonGroups, setAddonGroups,
    addAddonGroup, updateAddonGroup, removeAddonGroup,
    addAddonToGroup, updateAddon, removeAddon,
    // pickers
    pickerOpen, setPickerOpen,
    variantPickerTarget, setVariantPickerTarget,
    addonPickerTarget, setAddonPickerTarget,
    // save / meta
    handleSave, isReady, isEdit,
  }
}

export type ItemFormState = ReturnType<typeof useItemFormState>
