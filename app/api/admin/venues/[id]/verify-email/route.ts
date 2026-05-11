import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const venue = await db.venue.findUnique({ where: { id }, select: { ownerId: true } })
  if (!venue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.user.update({
    where: { id: venue.ownerId },
    data: { emailVerified: true },
  })

  return NextResponse.json({ ok: true })
}
