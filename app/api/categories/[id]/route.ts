import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const { id } = await params
  const { name } = await req.json().catch(() => ({}))
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })
  }

  const category = await db.category.update({
    where: { id, venueId: venueId },
    data: { name },
  })

  return NextResponse.json(category)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const { id } = await params
  await db.category.delete({ where: { id, venueId: venueId } })

  return NextResponse.json({ ok: true })
}
