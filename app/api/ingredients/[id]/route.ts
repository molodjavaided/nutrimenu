import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'
import { mirrorIngredientToCache } from '@/lib/barcode-cache-upsert'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })

  const ingredient = await db.ingredientRef.update({
    where: { id, venueId: venueId },
    data: {
      name: body.name,
      unit: body.unit,
      weightPerUnit: body.weightPerUnit ?? null,
      caloriesPer100: body.caloriesPer100,
      proteinPer100: body.proteinPer100,
      fatPer100: body.fatPer100,
      carbsPer100: body.carbsPer100,
      category: body.category ?? null,
      type: body.type,
      composition: body.composition ?? null,
      compositionText: body.compositionText ?? null,
      instructions: body.instructions ?? null,
      barcode: body.barcode?.trim() || null,
      manufacturer: body.manufacturer?.trim() || null,
      packageSize: body.packageSize?.trim() || null,
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

  return NextResponse.json(ingredient)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const { id } = await params
  await db.ingredientRef.delete({ where: { id, venueId: venueId } })

  return NextResponse.json({ ok: true })
}
