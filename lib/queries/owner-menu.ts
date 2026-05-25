import { db } from '@/lib/db'
import { resolveCategory } from '@/lib/cooking-coefficients'

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

/** Venue по id — для SSR /dashboard, /dashboard/settings. */
export async function getOwnerVenue(venueId: string) {
  return db.venue.findUnique({ where: { id: venueId } })
}

/** Личные ингредиенты владельца — для SSR /dashboard/ingredients.
 *  Возвращает в том же формате, что GET /api/ingredients (с resolveCategory). */
export async function getOwnerIngredients(venueId: string) {
  const ingredients = await db.ingredientRef.findMany({
    where: { venueId },
    orderBy: { name: 'asc' },
  })
  return ingredients.map(i => ({ ...i, category: resolveCategory(i.category ?? undefined, i.name) ?? null }))
}

/** Просмотры меню за всё время + сегодня/неделя — для виджета /dashboard. */
export async function getMenuViewsStats(venueId: string) {
  if (!venueId) return { total: 0, today: 0, week: 0 }
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)
  const weekStart = new Date(todayStart)
  weekStart.setUTCDate(weekStart.getUTCDate() - 6)

  const rows = await db.menuView.findMany({
    where: { venueId, date: { gte: weekStart } },
    select: { date: true, count: true },
  })
  const today = rows.find(r => r.date.getTime() === todayStart.getTime())?.count ?? 0
  const week = rows.reduce((s, r) => s + r.count, 0)

  const totalRow = await db.menuView.aggregate({
    where: { venueId },
    _sum: { count: true },
  })
  return { total: totalRow._sum.count ?? 0, today, week }
}
