import { MenuItem } from '@/types'
import { ItemFormState } from './useItemFormState'
import { buildMenuItem } from './buildMenuItem'

/** Превью «как у гостя» — собирает тот же MenuItem что и save, но с id='preview' и без сохранения. */
export function buildPreviewItem(s: ItemFormState): MenuItem {
  return buildMenuItem(
    {
      mode: s.mode,
      name: s.name || 'Без названия',
      description: s.description,
      photo: s.photo,
      photoPosition: s.photoPosition,
      price: s.price,
      categoryId: s.categoryId || 'preview',
      isAvailable: s.isAvailable,
      allergens: s.allergens,
      quickWeight: s.quickWeight,
      quickWeightUnit: s.quickWeightUnit,
      quickCalories: s.quickCalories,
      quickProtein: s.quickProtein,
      quickFat: s.quickFat,
      quickCarbs: s.quickCarbs,
      finalWeight: s.finalWeight,
      servingSize: s.servingSize,
      ingredients: s.ingredients,
      amounts: s.amounts,
      sizes: s.sizes,
      variantGroups: s.variantGroups,
      addonGroups: s.addonGroups,
      ingredientRefs: s.ingredientRefs,
      calculateNutriForSize: s.calculateNutriForSize,
    },
    { id: 'preview', venueId: 'preview' },
  )
}
