import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/** Owner's own feedback threads. When an admin is impersonating a venue, returns that owner's threads. */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve which owner's threads to show.
  let userId: string | null = null
  if (session.role === 'OWNER') {
    userId = session.userId
  } else if (session.role === 'ADMIN' && session.impersonatingVenueId) {
    const venue = await db.venue.findUnique({
      where: { id: session.impersonatingVenueId },
      select: { ownerId: true },
    })
    userId = venue?.ownerId ?? null
  }
  // Admin not impersonating has no owner thread list — return empty (admin inbox lives at /admin/feedback).
  if (!userId) return NextResponse.json([])

  const threads = await db.feedback.findMany({
    where: { userId, source: 'OWNER' },
    orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      createdAt: true,
      lastReplyAt: true,
      category: true,
      status: true,
      message: true,
      ownerUnread: true,
      _count: { select: { replies: true } },
    },
    take: 100,
  })

  return NextResponse.json(threads)
}
