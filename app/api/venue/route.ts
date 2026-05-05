import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId, SESSION_COOKIE } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const venue = await db.venue.findUnique({ where: { id: venueId } })
  if (!venue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(venue)
}

const schema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  workingHours: z.string().optional(),
  logo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  allowAdminEdit: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })

  const { allowAdminEdit, ...rest } = parsed.data
  // allowAdminEdit can only be changed by the actual venue owner, not an impersonating admin
  const data = session.impersonatingVenueId
    ? rest
    : { ...rest, ...(allowAdminEdit !== undefined ? { allowAdminEdit } : {}) }

  const venue = await db.venue.update({
    where: { id: venueId },
    data,
  })

  return NextResponse.json(venue)
}

export async function DELETE() {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete the user — cascade removes venue, categories, items, ingredients
  await db.user.delete({ where: { id: session.userId } })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
