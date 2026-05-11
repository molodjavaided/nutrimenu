import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { randomBytes } from 'crypto'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const venue = await db.venue.findUnique({
    where: { id },
    select: { ownerId: true },
  })
  if (!venue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

  await db.passwordResetToken.create({
    data: { token, userId: venue.ownerId, expiresAt },
  })

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://plate.menu'
  return NextResponse.json({ link: `${base}/auth/reset-password?token=${token}` })
}
