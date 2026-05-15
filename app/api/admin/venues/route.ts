import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [venues, counts] = await Promise.all([
    db.venue.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { email: true, trialEndsAt: true, paidUntil: true } },
        _count: { select: { categories: true } },
      },
    }),
    db.venue.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ])

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const newThisWeek = venues.filter(v => new Date(v.createdAt) >= weekAgo).length

  const stats = {
    total: venues.length,
    newThisWeek,
    byStatus: Object.fromEntries(counts.map(c => [c.status, c._count._all])) as Record<string, number>,
  }

  return NextResponse.json({ venues, stats })
}
