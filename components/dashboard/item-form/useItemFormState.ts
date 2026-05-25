'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Category, IngredientLibrary, IngredientRef, ProcessingType } from '@/types'
import { systemLibraries } from '@/lib/mock-data'
import { useCategoriesQuery, useIngredientsQuery, useCreateCategory } from '@/lib/queries/menu-client'
import { defaultItemFormValues, itemFormSchema, type ItemFormValues } from './schema'
import { compositionReducer, initialCompositionState, type ManualNutri } from './composition-reducer'
import { buildMenuItem } from './buildMenuItem'
import { buildLoadedItemState } from './loadItemFromApi'
import { calcNutriForSize } from './nutri-calc'
import { useVariantGroups } from './useVariantGroups'
import { useAddonGroups } from './useAddonGroups'

// ─── Domain types (used by sections) ───────────────────────────────────────
export interface ApiVariantOption { id: string; ingredientRefId?: string; label?: string; weight?: number; weightUnit?: string; calories?: number; protein?: number; fat?: number; carbs?: number; price?: number }
export interface ApiVariantGroup { id: string; label?: string; required?: boolean; replacesIngredientRefId?: string; options?: ApiVariantOption[] }
export interface ApiModifier { id: string; ingredientRefId?: string; label?: string; price?: number; weight?: number }
export interface ApiModifierGroup { id: string; label?: string; allowCustomGrams?: boolean; modifiers?: ApiModifier[] }

export interface IngredientItem {
  id: string
  ingredientRefId: string
  name: string
  unit: 'г' | 'мл' | 'шт' | 'кг' | 'л'
  processing?: ProcessingType  // ТТК: способ обработки
  yieldOverride?: number  // ТТК: ручной коэффициент выхода (если перебивает ГОСТ/ref)
  locked?: boolean         // true = гость не может убрать ингредиент (тесто, основа)
  // Вложенные компаньоны
  parentIngredientId?: string         // form-state id родителя (если эта строка — дочерний companion)
  companionKind?: 'oil' | 'water' | 'ice'
  companionRatio?: number              // ratio × parent.brutto на момент добавления
  manualChildAmount?: boolean          // true = пользователь редактировал ребёнка вручную, авто-пересчёт выключен (v2)
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
  weight?: number  // граммы на одну порцию добавки (по умолчанию 100)
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
  onSaved?: () => void | Promise<void>
  /** Куда переходить после успешного сохранения. По умолчанию /dashboard/menu. Для /demo — /demo/preview. */
  redirectAfterSave?: string
}

export function useItemFormState({ itemId, initialCategoryId, onSaved, redirectAfterSave = '/dashboard/menu' }: UseItemFormStateArgs) {
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
  const { data: categories = [] } = useCategoriesQuery()
  const { data: personalIngredients = [] } = useIngredientsQuery()
  const createCategoryMutation = useCreateCategory()
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const libraries = useMemo<IngredientLibrary[]>(() => {
    const personalLib: IngredientLibrary = {
      id: 'my-library',
      name: 'Мои ингредиенты',
      isSystem: false,
      ingredients: personalIngredients,
    }
    return [...systemLibraries, personalLib]
  }, [personalIngredients])

  const ingredientRefs = useMemo<IngredientRef[]>(
    () => libraries.flatMap(l => l.ingredients),
    [libraries],
  )
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
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    const tempId = `temp-${Date.now()}`
    const cat = await createCategoryMutation.mutateAsync({ tempId, name: trimmed })
    setCategoryId(cat.id)
    setNewCategoryName('')
    setAddingCategory(false)
  }

  // ── initial side effects when references arrive ──────────────────────────
  // One-time: pick default category + apply tour prefill. Triggers once when
  // both queries have data (initialData = []; real data flips length > 0 or stays
  // empty after fetch completes — we still want to fire once).
  const sideEffectsApplied = useRef(false)
  useEffect(() => {
    if (sideEffectsApplied.current) return
    if (!categories) return
    sideEffectsApplied.current = true

    if (!initialCategoryId) {
      const prefillCat = sessionStorage.getItem('nm-tour-prefill-category')
      const matched = prefillCat ? categories.find(c => c.name === prefillCat) : null
      setCategoryId(matched ? matched.id : categories[0]?.id ?? '')
    }
    const prefillName = sessionStorage.getItem('nm-tour-prefill-name')
    if (prefillName && !itemId) {
      form.setValue('name', prefillName, { shouldDirty: true })
      sessionStorage.removeItem('nm-tour-prefill-name')
      sessionStorage.removeItem('nm-tour-prefill-category')
    }
    setIsReady(true)
  }, [categories]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── load existing item (uses pure builder, just applies setters) ─────────
  useEffect(() => { void loadItem() }, [isReady, ingredientRefs, itemId]) // eslint-disable-line react-hooks/exhaustive-deps
  async function loadItem() {
    if (!isReady) return
    if (ingredientRefs.length === 0) return
    if (!itemId || !isInitialLoad.current) return

    const apiItem = await fetch(`/api/items/${itemId}`).then(r => r.ok ? r.json() : null)
    if (!apiItem) { isInitialLoad.current = false; return }

    const s = buildLoadedItemState(apiItem, ingredientRefs)
    setName(s.name); setPrice(s.price); setIsAvailable(s.isAvailable)
    setDescription(s.description); setPhoto(s.photo); setPhotoPosition(s.photoPosition)
    setCategoryId(s.categoryId); setAllergens(s.allergens)
    setMode(s.mode)
    if (s.mode === 'quick') {
      setQuickWeight(s.quickWeight); setQuickWeightUnit(s.quickWeightUnit)
      setQuickCalories(s.quickCalories); setQuickProtein(s.quickProtein)
      setQuickFat(s.quickFat); setQuickCarbs(s.quickCarbs)
    } else {
      if (s.finalWeight !== undefined) setFinalWeight(s.finalWeight)
      if (s.servingSize !== undefined) setServingSize(s.servingSize)
      setIngredients(s.ingredients); setAmounts(s.amounts); setSizes(s.sizes)
      setHasMultipleSizes(s.hasMultipleSizes); setManualNutri(s.manualNutri)
      if (s.variantGroups.length > 0) setVariantGroups(s.variantGroups)
      if (s.addonGroups.length > 0) setAddonGroups(s.addonGroups)
    }

    isInitialLoad.current = false
  }

  // ── variants / addons / nutri (extracted into focused hooks/fn) ──────────
  const variantHandlers = useVariantGroups(setVariantGroups)
  const addonHandlers = useAddonGroups(setAddonGroups)
  const calculateNutriForSize = useCallback(
    (sizeId: string) => calcNutriForSize(sizeId, ingredients, amounts, ingredientRefs, manualNutri),
    [ingredients, amounts, ingredientRefs, manualNutri],
  )

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
      if (onSaved) await onSaved()
      router.push(redirectAfterSave)
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

    const newItem = buildMenuItem(
      {
        mode, name, description, photo, photoPosition, price, categoryId, isAvailable, allergens,
        quickWeight, quickWeightUnit, quickCalories, quickProtein, quickFat, quickCarbs,
        finalWeight, servingSize,
        ingredients, amounts, sizes, variantGroups, addonGroups, ingredientRefs,
        calculateNutriForSize,
      },
      { id: itemId ?? crypto.randomUUID() },
    )

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
    if (onSaved) await onSaved()
    router.push(redirectAfterSave)
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
      locked: true,
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
        ? { ...i, processing, yieldOverride: undefined }
        : i),
    })
  }, [ingredients])

  const addCompanionIngredient = useCallback((sourceIngredientId: string, refId: string, ratio: number, kind?: 'oil' | 'water' | 'ice') => {
    const ref = ingredientRefs.find(r => r.id === refId)
    if (!ref) return
    // Запрет дубликата: тот же companion ref у того же родителя
    if (ingredients.some(i => i.ingredientRefId === refId && i.parentIngredientId === sourceIngredientId)) return
    const newId = crypto.randomUUID()
    const newIngredient: IngredientItem = {
      id: newId,
      ingredientRefId: refId,
      name: ref.name,
      unit: ref.unit,
      parentIngredientId: sourceIngredientId,
      companionKind: kind,
      companionRatio: ratio,
      manualChildAmount: false,
      locked: true,
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

  const toggleIngredientLocked = useCallback((ingredientId: string) => {
    dispatch({
      type: 'SET_INGREDIENTS',
      ingredients: ingredients.map(i => i.id === ingredientId ? { ...i, locked: !i.locked } : i),
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
    addIngredient, removeIngredient, updateIngredientProcessing, updateIngredientYieldOverride, toggleIngredientLocked, addCompanionIngredient,
    addSize, updateSizeName, updateSizeUnit, updateSizePrice, applySizePreset, removeSize,
    updateAmount, updateManualNutri,
    calculateNutriForSize, getAmountFromComposition,
    // variants
    variantGroups, setVariantGroups,
    ...variantHandlers,
    // addons
    addonGroups, setAddonGroups,
    ...addonHandlers,
    // pickers
    pickerOpen, setPickerOpen,
    variantPickerTarget, setVariantPickerTarget,
    addonPickerTarget, setAddonPickerTarget,
    // save / meta
    handleSave, isReady, isEdit,
  }
}

export type ItemFormState = ReturnType<typeof useItemFormState>
