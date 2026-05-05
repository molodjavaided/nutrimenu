import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const venues = await db.venue.findMany({
    orderBy: { createdAt: 'desc' },
    include: { owner: { select: { email: true } } },
  })

  return NextResponse.json(venues)
}
