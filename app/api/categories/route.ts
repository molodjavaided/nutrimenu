import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'
import { getOwnerCategoriesByVenue } from '@/lib/queries/owner-menu'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)
  return NextResponse.json(await getOwnerCategoriesByVenue(venueId))
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
  })

  // Новая категория пустая (без items) — отдаём в том же формате, что getOwnerCategoriesByVenue
  return NextResponse.json({
    id: category.id,
    name: category.name,
    venueId: category.venueId,
    order: category.sortOrder,
    items: [],
  }, { status: 201 })
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
