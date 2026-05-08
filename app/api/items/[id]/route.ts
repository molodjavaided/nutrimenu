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

  const item = await db.menuItem.update({
    where: { id, venueId: venueId },
    data: {
      ...(categoryId ? { categoryId } : {}),
      name: data.name,
      description: data.description ?? null,
      photo: data.photo ?? null,
      price: data.price ?? null,
      weight: data.weight ?? 0,
      weightUnit: data.weightUnit ?? 'г',
      calories: data.calories ?? 0,
      protein: data.protein ?? 0,
      fat: data.fat ?? 0,
      carbs: data.carbs ?? 0,
      isAvailable: data.isAvailable ?? true,
      sizes: data.sizes ?? [],
      composition: data.composition ?? [],
      variantGroups: data.variantGroups ?? [],
      modifierGroups: data.modifierGroups ?? [],
    },
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
