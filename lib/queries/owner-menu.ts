import { db } from '@/lib/db'

/**
 * Чтение категорий+блюд владельца для SSR-рендера /dashboard/menu и /api/categories.
 * Возвращает структуру в том же формате, что отдаёт `GET /api/categories`,
 * чтобы клиент-компонент мог принимать одинаковую форму данных.
 */
export async function getOwnerCategoriesByVenue(venueId: string) {
  const categories = await db.category.findMany({
    where: { venueId },
    orderBy: { sortOrder: 'asc' },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  })

  return categories.map(c => ({
    id: c.id,
    name: c.name,
    venueId: c.venueId,
    order: c.sortOrder,
    items: c.items.map(i => ({
      id: i.id,
      categoryId: i.categoryId,
      venueId: i.venueId,
      name: i.name,
      description: i.description ?? undefined,
      photo: i.photo ?? undefined,
      weight: i.weight,
      weightUnit: i.weightUnit,
      calories: i.calories,
      protein: i.protein,
      fat: i.fat,
      carbs: i.carbs,
      isAvailable: i.isAvailable,
      sortOrder: i.sortOrder,
      sizes: (i.sizes as unknown[]) ?? [],
      composition: (i.composition as unknown[]) ?? [],
      variantGroups: (i.variantGroups as unknown[]) ?? [],
      modifierGroups: (i.modifierGroups as unknown[]) ?? [],
    })),
  }))
}
