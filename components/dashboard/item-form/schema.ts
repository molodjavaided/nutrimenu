import { z } from 'zod'

export const itemFormSchema = z.object({
  categoryId: z.string().min(1, 'Выберите категорию'),
  name: z.string().min(1, 'Введите название'),
  price: z.string(),
  isAvailable: z.boolean(),
  description: z.string(),
  photo: z.string(),
  photoPosition: z.enum(['top', 'center', 'bottom']),
  allergens: z.array(z.string()),
  mode: z.enum(['quick', 'detailed']),
  quickWeight: z.number().min(0),
  quickWeightUnit: z.enum(['г', 'мл']),
  quickCalories: z.number().min(0),
  quickProtein: z.number().min(0),
  quickFat: z.number().min(0),
  quickCarbs: z.number().min(0),
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
}
