import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

const schema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
  }

  const venue = await db.venue.update({
    where: { id },
    data: { status: parsed.data.status },
  })

  return NextResponse.json(venue)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const venue = await db.venue.findUnique({ where: { id }, select: { ownerId: true } })
  if (!venue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete the owner user — cascade removes venue and all data
  await db.user.delete({ where: { id: venue.ownerId } })

  return NextResponse.json({ ok: true })
}
