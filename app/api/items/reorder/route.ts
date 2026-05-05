import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'

const schema = z.array(z.object({ id: z.string(), sortOrder: z.number() }))

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })

  await db.$transaction(
    parsed.data.map(({ id, sortOrder }) =>
      db.menuItem.update({ where: { id, venueId: venueId }, data: { sortOrder } })
    )
  )

  return NextResponse.json({ ok: true })
}
