import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'

const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string().default('г'),
  weightPerUnit: z.number().nullable().optional(),
  caloriesPer100: z.number().default(0),
  proteinPer100: z.number().default(0),
  fatPer100: z.number().default(0),
  carbsPer100: z.number().default(0),
  category: z.string().nullable().optional(),
  type: z.string().default('mono'),
  composition: z.unknown().optional(),
  instructions: z.string().nullable().optional(),
})

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  weight: z.number().default(0),
  weightUnit: z.string().default('г'),
  calories: z.number().default(0),
  protein: z.number().default(0),
  fat: z.number().default(0),
  carbs: z.number().default(0),
  isAvailable: z.boolean().default(true),
  sizes: z.unknown().optional(),
  composition: z.unknown().optional(),
  variantGroups: z.unknown().optional(),
  modifierGroups: z.unknown().optional(),
  sortOrder: z.number().default(0),
})

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().default(0),
  items: z.array(itemSchema).default([]),
})

const schema = z.object({
  categories: z.array(categorySchema),
  ingredients: z.array(ingredientSchema).default([]),
  // IDs of existing categories/items to overwrite (delete items first)
  overwriteCategoryIds: z.array(z.string()).default([]),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные', details: parsed.error.flatten() }, { status: 400 })
  }

  const { categories, ingredients, overwriteCategoryIds } = parsed.data

  await db.$transaction(async (tx) => {
    // Save/update personal ingredients
    for (const ing of ingredients) {
      await tx.ingredientRef.upsert({
        where: { id: ing.id },
        create: {
          id: ing.id,
          venueId,
          name: ing.name,
          unit: ing.unit,
          weightPerUnit: ing.weightPerUnit ?? null,
          caloriesPer100: ing.caloriesPer100,
          proteinPer100: ing.proteinPer100,
          fatPer100: ing.fatPer100,
          carbsPer100: ing.carbsPer100,
          category: ing.category ?? null,
          type: ing.type,
          composition: ing.composition ?? undefined,
          instructions: ing.instructions ?? null,
        },
        update: {
          name: ing.name,
          unit: ing.unit,
          weightPerUnit: ing.weightPerUnit ?? null,
          caloriesPer100: ing.caloriesPer100,
          proteinPer100: ing.proteinPer100,
          fatPer100: ing.fatPer100,
          carbsPer100: ing.carbsPer100,
        },
      })
    }

    // For overwrite categories: delete all their items first
    if (overwriteCategoryIds.length > 0) {
      await tx.menuItem.deleteMany({
        where: { categoryId: { in: overwriteCategoryIds }, venueId },
      })
    }

    // Get current max sortOrder for new categories
    const existingCats = await tx.category.findMany({
      where: { venueId },
      select: { id: true, sortOrder: true },
    })
    const existingIds = new Set(existingCats.map(c => c.id))
    let nextOrder = existingCats.length

    for (const cat of categories) {
      if (existingIds.has(cat.id)) {
        // Update existing category items
        for (let i = 0; i < cat.items.length; i++) {
          const item = cat.items[i]
          await tx.menuItem.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              categoryId: cat.id,
              venueId,
              name: item.name,
              description: item.description ?? null,
              weight: item.weight,
              weightUnit: item.weightUnit,
              calories: item.calories,
              protein: item.protein,
              fat: item.fat,
              carbs: item.carbs,
              isAvailable: item.isAvailable,
              sizes: item.sizes ?? [],
              composition: item.composition ?? [],
              variantGroups: item.variantGroups ?? [],
              modifierGroups: item.modifierGroups ?? [],
              sortOrder: i,
            },
            update: {
              name: item.name,
              description: item.description ?? null,
              weight: item.weight,
              weightUnit: item.weightUnit,
              calories: item.calories,
              protein: item.protein,
              fat: item.fat,
              carbs: item.carbs,
              sizes: item.sizes ?? [],
              composition: item.composition ?? [],
              variantGroups: item.variantGroups ?? [],
              modifierGroups: item.modifierGroups ?? [],
              sortOrder: i,
            },
          })
        }
      } else {
        // Create new category with items
        await tx.category.create({
          data: {
            id: cat.id,
            venueId,
            name: cat.name,
            sortOrder: nextOrder++,
            items: {
              create: cat.items.map((item, i) => ({
                id: item.id,
                venueId,
                name: item.name,
                description: item.description ?? null,
                weight: item.weight,
                weightUnit: item.weightUnit,
                calories: item.calories,
                protein: item.protein,
                fat: item.fat,
                carbs: item.carbs,
                isAvailable: item.isAvailable,
                sizes: item.sizes ?? [],
                composition: item.composition ?? [],
                variantGroups: item.variantGroups ?? [],
                modifierGroups: item.modifierGroups ?? [],
                sortOrder: i,
              })),
            },
          },
        })
      }
    }
  })

  return NextResponse.json({ ok: true })
}
