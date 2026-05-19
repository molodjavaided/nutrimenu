import { IngredientLibrary } from '@/types'
import { foodDatabaseLibrary } from '@/lib/data/foodDatabase'

/**
 * Системные библиотеки от сервиса Plate.
 * Подключаются как read-only справочник для владельца.
 */
export const systemLibraries: IngredientLibrary[] = [
  foodDatabaseLibrary,
]
