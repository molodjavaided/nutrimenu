import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ count: 0 })

  if (session.role === 'ADMIN') {
    // While impersonating a venue, mirror that owner's unread so the badge matches the panel.
    if (session.impersonatingVenueId) {
      const venue = await db.venue.findUnique({
        where: { id: session.impersonatingVenueId },
        select: { ownerId: true },
      })
      if (venue) {
        const count = await db.feedback.count({
          where: { userId: venue.ownerId, ownerUnread: true },
        })
        return NextResponse.json({ count })
      }
    }
    const count = await db.feedback.count({ where: { adminUnread: true } })
    return NextResponse.json({ count })
  }

  const count = await db.feedback.count({
    where: { userId: session.userId, ownerUnread: true },
  })
  return NextResponse.json({ count })
}
