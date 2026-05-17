import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const { id } = await params
  const item = await db.menuItem.findFirst({ where: { id, venueId: venueId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })

  const { id: _id, venueId: _v, categoryId, ...data } = body

  // If moving to different category, verify it belongs to venue
  if (categoryId) {
    const cat = await db.category.findFirst({ where: { id: categoryId, venueId: venueId } })
    if (!cat) return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
  }

  // Partial update: only touch fields that were actually sent.
  // Prevents wiping photo / other fields when a client PATCHes a subset.
  const updateData: Record<string, unknown> = {}
  if (categoryId !== undefined) updateData.categoryId = categoryId
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description ?? null
  if (data.photo !== undefined) updateData.photo = data.photo ?? null
  if (data.price !== undefined) updateData.price = data.price ?? null
  if (data.weight !== undefined) updateData.weight = data.weight
  if (data.weightUnit !== undefined) updateData.weightUnit = data.weightUnit
  if (data.calories !== undefined) updateData.calories = data.calories
  if (data.protein !== undefined) updateData.protein = data.protein
  if (data.fat !== undefined) updateData.fat = data.fat
  if (data.carbs !== undefined) updateData.carbs = data.carbs
  if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable
  if (data.sizes !== undefined) updateData.sizes = data.sizes
  if (data.composition !== undefined) updateData.composition = data.composition
  if (data.variantGroups !== undefined) updateData.variantGroups = data.variantGroups
  if (data.modifierGroups !== undefined) updateData.modifierGroups = data.modifierGroups
  if (data.creationMode !== undefined) updateData.creationMode = data.creationMode ?? null
  if (data.finalWeight !== undefined) updateData.finalWeight = data.finalWeight ?? null
  if (data.servingSize !== undefined) updateData.servingSize = data.servingSize ?? null

  const item = await db.menuItem.update({
    where: { id, venueId: venueId },
    data: updateData,
  })

  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const { id } = await params
  await db.menuItem.delete({ where: { id, venueId: venueId } })

  return NextResponse.json({ ok: true })
}
