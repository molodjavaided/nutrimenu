import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const venue = await db.venue.findUnique({ where: { slug }, select: { id: true } })
  if (!venue) return NextResponse.json({ ok: false }, { status: 404 })

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  await db.menuView.upsert({
    where: { venueId_date: { venueId: venue.id, date: today } },
    update: { count: { increment: 1 } },
    create: { venueId: venue.id, date: today, count: 1 },
  })

  return NextResponse.json({ ok: true })
}
