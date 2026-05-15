import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, createSessionToken, setSessionCookie, IMPERSONATION_TTL_MS } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const venue = await db.venue.findUnique({ where: { id }, select: { id: true, allowAdminEdit: true } })
  if (!venue) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!venue.allowAdminEdit) return NextResponse.json({ error: 'Venue has not granted edit access' }, { status: 403 })

  const token = await createSessionToken({
    email: session.email,
    userId: session.userId,
    venueId: session.venueId,
    role: 'ADMIN',
    impersonatingVenueId: id,
    impersonationExpiresAt: Date.now() + IMPERSONATION_TTL_MS,
  })

  const res = NextResponse.json({ ok: true })
  setSessionCookie(res, token)
  return res
}
