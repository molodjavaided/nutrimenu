import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as 'new' | 'triaged' | 'resolved' | 'wontfix' | null
  const source = searchParams.get('source') as 'OWNER' | 'GUEST' | null
  const category = searchParams.get('category') as 'bug' | 'idea' | 'question' | 'other' | null
  const q = searchParams.get('q')?.trim()

  const items = await db.feedback.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...(category ? { category } : {}),
      ...(q ? { message: { contains: q, mode: 'insensitive' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Resolve venue names in one query
  const venueIds = [...new Set(items.map(i => i.venueId).filter(Boolean) as string[])]
  const venues = venueIds.length
    ? await db.venue.findMany({ where: { id: { in: venueIds } }, select: { id: true, name: true, slug: true } })
    : []
  const venueMap = new Map(venues.map(v => [v.id, v]))

  return NextResponse.json(
    items.map(i => ({
      ...i,
      venue: i.venueId ? venueMap.get(i.venueId) ?? null : null,
    })),
  )
}
