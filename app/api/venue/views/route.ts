import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const venueId = session.impersonatingVenueId ?? session.venueId
  if (!venueId) return NextResponse.json({ total: 0, today: 0, week: 0 })

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  const weekStart = new Date(todayStart)
  weekStart.setUTCDate(weekStart.getUTCDate() - 6)

  const rows = await db.menuView.findMany({
    where: { venueId, date: { gte: weekStart } },
    select: { date: true, count: true },
  })

  const today = rows.find(r => r.date.getTime() === todayStart.getTime())?.count ?? 0
  const week = rows.reduce((s, r) => s + r.count, 0)

  const totalRow = await db.menuView.aggregate({
    where: { venueId },
    _sum: { count: true },
  })
  const total = totalRow._sum.count ?? 0

  return NextResponse.json({ total, today, week })
}
