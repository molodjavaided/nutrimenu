import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

const schema = z.object({
  plan: z.enum(['START', 'STANDARD', 'CUSTOM']).optional(),
  /** ISO string or null to clear */
  paidUntil: z.union([z.string().datetime(), z.null()]).optional(),
  /** Days to extend from max(now, paidUntil). Mutually exclusive with paidUntil. */
  extendDays: z.number().int().min(1).max(3650).optional(),
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
    return NextResponse.json({ error: 'Неверные данные', details: parsed.error.flatten() }, { status: 400 })
  }

  const venue = await db.venue.findUnique({
    where: { id },
    select: { ownerId: true, owner: { select: { paidUntil: true } } },
  })
  if (!venue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (parsed.data.plan !== undefined) data.plan = parsed.data.plan

  if (parsed.data.extendDays !== undefined) {
    const now = new Date()
    const base = venue.owner.paidUntil && venue.owner.paidUntil > now ? venue.owner.paidUntil : now
    data.paidUntil = new Date(base.getTime() + parsed.data.extendDays * 24 * 60 * 60 * 1000)
  } else if (parsed.data.paidUntil !== undefined) {
    data.paidUntil = parsed.data.paidUntil ? new Date(parsed.data.paidUntil) : null
  }

  const user = await db.user.update({
    where: { id: venue.ownerId },
    data,
    select: { plan: true, paidUntil: true, trialEndsAt: true },
  })
  return NextResponse.json(user)
}
