import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const venue = await db.venue.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { sortOrder: 'asc' },
        include: { items: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } },
      },
    },
  })

  if (!venue) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Public sheet must resolve nutrition for variant replacements that reference
  // venue-owned IngredientRefs (custom ingredients like "Кокосовое молоко"),
  // not just system libraries. Fetch both.
  const ingredientRefs = await db.ingredientRef.findMany({
    where: { OR: [{ venueId: venue.id }, { isSystem: true }] },
  })

  const categories = venue.categories.map(c => ({
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
      price: i.price ?? undefined,
      weight: i.weight,
      weightUnit: i.weightUnit,
      calories: i.calories,
      protein: i.protein,
      fat: i.fat,
      carbs: i.carbs,
      isAvailable: i.isAvailable,
      sizes: i.sizes ?? [],
      composition: i.composition ?? [],
      variantGroups: i.variantGroups ?? [],
      modifierGroups: i.modifierGroups ?? [],
    })),
  }))

  return NextResponse.json({
    venue: {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      address: venue.address ?? undefined,
      description: venue.description ?? undefined,
      workingHours: venue.workingHours ?? undefined,
      logo: venue.logo ?? undefined,
      tags: venue.tags,
    },
    categories,
    ingredientRefs: ingredientRefs.map(r => ({
      id: r.id,
      name: r.name,
      unit: r.unit,
      weightPerUnit: r.weightPerUnit ?? undefined,
      caloriesPer100: r.caloriesPer100,
      proteinPer100: r.proteinPer100,
      fatPer100: r.fatPer100,
      carbsPer100: r.carbsPer100,
      isSystem: r.isSystem,
    })),
  })
}
