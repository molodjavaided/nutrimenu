import type { AmountCell, IngredientItem, Size } from './useItemFormState'
import { MAX_SIZES } from './useItemFormState'

export type ManualNutri = Record<string, { calories: number; protein: number; fat: number; carbs: number; isManual: boolean }>

export interface CompositionState {
  ingredients: IngredientItem[]
  sizes: Size[]
  amounts: AmountCell[]
  manualNutri: ManualNutri
  hasMultipleSizes: boolean
}

export const initialCompositionState: CompositionState = {
  ingredients: [],
  sizes: [{ id: 'default', name: '', unit: 'г' }],
  amounts: [],
  manualNutri: {},
  hasMultipleSizes: false,
}

export type CompositionAction =
  | { type: 'SET_INGREDIENTS'; ingredients: IngredientItem[] }
  | { type: 'ADD_INGREDIENT'; ingredient: IngredientItem }
  | { type: 'REMOVE_INGREDIENT'; ingredientId: string }
  | { type: 'SET_SIZES'; sizes: Size[] }
  | { type: 'ADD_SIZE' }
  | { type: 'REMOVE_SIZE'; sizeId: string }
  | { type: 'UPDATE_SIZE_NAME'; sizeId: string; name: string }
  | { type: 'UPDATE_SIZE_UNIT'; sizeId: string; unit: 'г' | 'мл' }
  | { type: 'UPDATE_SIZE_PRICE'; sizeId: string; price: number | undefined }
  | { type: 'APPLY_SIZE_PRESET'; preset: { name: string; unit: 'г' | 'мл' }[] }
  | { type: 'SET_AMOUNTS'; amounts: AmountCell[] }
  | { type: 'UPDATE_AMOUNT'; ingredientId: string; sizeId: string; amount: number }
  | { type: 'SET_MANUAL_NUTRI'; manualNutri: ManualNutri }
  | { type: 'UPDATE_MANUAL_NUTRI'; sizeId: string; field: string; value: number }
  | { type: 'SET_HAS_MULTIPLE_SIZES'; value: boolean }
  | { type: 'LOAD'; ingredients: IngredientItem[]; sizes: Size[]; amounts: AmountCell[]; manualNutri: ManualNutri; hasMultipleSizes: boolean }

export function compositionReducer(state: CompositionState, action: CompositionAction): CompositionState {
  switch (action.type) {
    case 'SET_INGREDIENTS':
      return { ...state, ingredients: action.ingredients }
    case 'ADD_INGREDIENT':
      return { ...state, ingredients: [...state.ingredients, action.ingredient] }
    case 'REMOVE_INGREDIENT':
      return {
        ...state,
        ingredients: state.ingredients.filter(i => i.id !== action.ingredientId),
        amounts: state.amounts.filter(a => a.ingredientId !== action.ingredientId),
      }
    case 'SET_SIZES':
      return { ...state, sizes: action.sizes }
    case 'ADD_SIZE': {
      if (state.sizes.length >= MAX_SIZES) {
        alert(`Максимум ${MAX_SIZES} размеров`)
        return state
      }
      return { ...state, sizes: [...state.sizes, { id: crypto.randomUUID(), name: '', unit: 'г' }] }
    }
    case 'REMOVE_SIZE': {
      if (state.sizes.length <= 1) return state
      const newManual = { ...state.manualNutri }
      delete newManual[action.sizeId]
      return {
        ...state,
        sizes: state.sizes.filter(s => s.id !== action.sizeId),
        amounts: state.amounts.filter(a => a.sizeId !== action.sizeId),
        manualNutri: newManual,
      }
    }
    case 'UPDATE_SIZE_NAME':
      return { ...state, sizes: state.sizes.map(s => s.id === action.sizeId ? { ...s, name: action.name } : s) }
    case 'UPDATE_SIZE_UNIT':
      return { ...state, sizes: state.sizes.map(s => s.id === action.sizeId ? { ...s, unit: action.unit } : s) }
    case 'UPDATE_SIZE_PRICE':
      return { ...state, sizes: state.sizes.map(s => s.id === action.sizeId ? { ...s, price: action.price } : s) }
    case 'APPLY_SIZE_PRESET':
      return {
        ...state,
        sizes: action.preset.map(p => ({ id: crypto.randomUUID(), name: p.name, unit: p.unit })),
        amounts: [],
        manualNutri: {},
      }
    case 'SET_AMOUNTS':
      return { ...state, amounts: action.amounts }
    case 'UPDATE_AMOUNT': {
      const existing = state.amounts.find(a => a.ingredientId === action.ingredientId && a.sizeId === action.sizeId)
      const amounts = existing
        ? state.amounts.map(a =>
            a.ingredientId === action.ingredientId && a.sizeId === action.sizeId
              ? { ...a, amount: action.amount }
              : a)
        : [...state.amounts, { ingredientId: action.ingredientId, sizeId: action.sizeId, amount: action.amount }]
      let manualNutri = state.manualNutri
      if (manualNutri[action.sizeId]?.isManual) {
        manualNutri = { ...manualNutri }
        delete manualNutri[action.sizeId]
      }
      return { ...state, amounts, manualNutri }
    }
    case 'SET_MANUAL_NUTRI':
      return { ...state, manualNutri: action.manualNutri }
    case 'UPDATE_MANUAL_NUTRI': {
      const current = state.manualNutri[action.sizeId] || { calories: 0, protein: 0, fat: 0, carbs: 0, isManual: true }
      return {
        ...state,
        manualNutri: { ...state.manualNutri, [action.sizeId]: { ...current, [action.field]: action.value, isManual: true } },
      }
    }
    case 'SET_HAS_MULTIPLE_SIZES':
      return { ...state, hasMultipleSizes: action.value }
    case 'LOAD':
      return {
        ingredients: action.ingredients,
        sizes: action.sizes,
        amounts: action.amounts,
        manualNutri: action.manualNutri,
        hasMultipleSizes: action.hasMultipleSizes,
      }
  }
}
