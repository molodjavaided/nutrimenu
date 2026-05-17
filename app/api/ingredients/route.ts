import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'
import { mirrorIngredientToCache } from '@/lib/barcode-cache-upsert'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const ingredients = await db.ingredientRef.findMany({
    where: { venueId: venueId },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(ingredients)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const body = await req.json().catch(() => null)
  if (!body?.name) return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })

  const ingredient = await db.ingredientRef.create({
    data: {
      venueId: venueId,
      name: body.name,
      unit: body.unit ?? 'г',
      weightPerUnit: body.weightPerUnit ?? null,
      caloriesPer100: body.caloriesPer100 ?? 0,
      proteinPer100: body.proteinPer100 ?? 0,
      fatPer100: body.fatPer100 ?? 0,
      carbsPer100: body.carbsPer100 ?? 0,
      category: body.category ?? null,
      type: body.type ?? 'mono',
      composition: body.composition ?? null,
      compositionText: body.compositionText ?? null,
      instructions: body.instructions ?? null,
      barcode: body.barcode?.trim() || null,
      manufacturer: body.manufacturer?.trim() || null,
      packageSize: body.packageSize?.trim() || null,
      yieldCoefficients: body.yieldCoefficients ?? null,
      coldLossPercent: body.coldLossPercent ?? null,
      pricePerKg: body.pricePerKg ?? null,
    },
  })

  await mirrorIngredientToCache({
    barcode: ingredient.barcode,
    name: ingredient.name,
    brand: null,
    manufacturer: ingredient.manufacturer,
    category: ingredient.category,
    packageSize: ingredient.packageSize,
    caloriesPer100: ingredient.caloriesPer100,
    proteinPer100: ingredient.proteinPer100,
    fatPer100: ingredient.fatPer100,
    carbsPer100: ingredient.carbsPer100,
    compositionText: ingredient.compositionText,
  })

  return NextResponse.json(ingredient, { status: 201 })
}
