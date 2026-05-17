import { z } from 'zod'

const variantChoiceSchema = z.object({
  id: z.string(),
  ingredientRefId: z.string().optional(),
  label: z.string(),
  weight: z.number(),
  weightUnit: z.enum(['г', 'мл']),
  calories: z.number(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
  price: z.number().optional(),
  isManual: z.boolean().optional(),
})

const variantGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  required: z.boolean(),
  options: z.array(variantChoiceSchema),
  replacesIngredientRefId: z.string().optional(),
})

const addonItemSchema = z.object({
  id: z.string(),
  ingredientRefId: z.string(),
  label: z.string(),
  price: z.number().optional(),
})

const addonGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  allowCustomGrams: z.boolean(),
  addons: z.array(addonItemSchema),
})

export const itemFormSchema = z.object({
  categoryId: z.string().min(1, 'Выберите категорию'),
  name: z.string().min(1, 'Введите название'),
  price: z.string(),
  isAvailable: z.boolean(),
  description: z.string(),
  photo: z.string(),
  photoPosition: z.enum(['top', 'center', 'bottom']),
  allergens: z.array(z.string()),
  mode: z.enum(['quick', 'composition', 'ttk']),
  quickWeight: z.number().min(0),
  quickWeightUnit: z.enum(['г', 'мл']),
  quickCalories: z.number().min(0),
  quickProtein: z.number().min(0),
  quickFat: z.number().min(0),
  quickCarbs: z.number().min(0),
  // ТТК-поля (используются в режиме 'ttk')
  finalWeight: z.number().min(0).optional(),
  servingSize: z.number().min(0).optional(),
  variantGroups: z.array(variantGroupSchema),
  addonGroups: z.array(addonGroupSchema),
})

export type ItemFormValues = z.infer<typeof itemFormSchema>

export const defaultItemFormValues: ItemFormValues = {
  categoryId: '',
  name: '',
  price: '',
  isAvailable: true,
  description: '',
  photo: '',
  photoPosition: 'center',
  allergens: [],
  mode: 'quick',
  quickWeight: 0,
  quickWeightUnit: 'г',
  quickCalories: 0,
  quickProtein: 0,
  quickFat: 0,
  quickCarbs: 0,
  finalWeight: undefined,
  servingSize: undefined,
  variantGroups: [],
  addonGroups: [],
}
