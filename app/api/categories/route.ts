import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'

function mapCategory(c: {
  id: string; name: string; venueId: string; sortOrder: number;
  items: {
    id: string; name: string; description: string | null; photo: string | null
    weight: number; weightUnit: string; calories: number; protein: number
    fat: number; carbs: number; isAvailable: boolean; sortOrder: number
    categoryId: string; venueId: string
    sizes: unknown; composition: unknown; variantGroups: unknown; modifierGroups: unknown
  }[]
}) {
  return {
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
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const categories = await db.category.findMany({
    where: { venueId: venueId },
    orderBy: { sortOrder: 'asc' },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  })

  return NextResponse.json(categories.map(mapCategory))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const { name } = await req.json().catch(() => ({}))
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })
  }

  const count = await db.category.count({ where: { venueId: venueId } })
  const category = await db.category.create({
    data: { name, venueId: venueId, sortOrder: count },
    include: { items: true },
  })

  return NextResponse.json(mapCategory(category), { status: 201 })
}

const reorderSchema = z.array(z.object({ id: z.string(), sortOrder: z.number() }))

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const body = await req.json().catch(() => null)
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })

  await db.$transaction(
    parsed.data.map(({ id, sortOrder }) =>
      db.category.update({ where: { id, venueId: venueId }, data: { sortOrder } })
    )
  )

  return NextResponse.json({ ok: true })
}
