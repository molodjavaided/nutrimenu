import { NextResponse } from 'next/server'
import { getSession, createSessionToken, setSessionCookie } from '@/lib/auth'

export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Re-issue token without impersonatingVenueId
  const token = await createSessionToken({
    email: session.email,
    userId: session.userId,
    venueId: session.venueId,
    role: 'ADMIN',
  })

  const res = NextResponse.json({ ok: true })
  setSessionCookie(res, token)
  return res
}
