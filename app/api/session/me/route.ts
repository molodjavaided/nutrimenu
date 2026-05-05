import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let venueName: string | undefined
  if (session.impersonatingVenueId) {
    const venue = await db.venue.findUnique({
      where: { id: session.impersonatingVenueId },
      select: { name: true },
    })
    venueName = venue?.name
  }

  return NextResponse.json({
    role: session.role,
    impersonatingVenueId: session.impersonatingVenueId,
    venueName,
  })
}
