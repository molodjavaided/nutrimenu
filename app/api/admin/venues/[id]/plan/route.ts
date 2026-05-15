import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

const schema = z.object({
  plan: z.enum(['TEST', 'START', 'STANDARD', 'CUSTOM']).optional(),
  paidUntil: z.union([z.string().datetime(), z.null()]).optional(),
  /** Days to extend paidUntil from max(now, paidUntil). */
  extendPaidDays: z.number().int().min(1).max(3650).optional(),
  /** Days to extend trialEndsAt from max(now, trialEndsAt). */
  extendTrialDays: z.number().int().min(1).max(365).optional(),
  /** Set trialEndsAt directly or clear. */
  trialEndsAt: z.union([z.string().datetime(), z.null()]).optional(),
  bonusItems: z.number().int().min(0).max(100000).optional(),
  bonusAiImports: z.number().int().min(0).max(10000).optional(),
  bonusTtkExports: z.number().int().min(0).max(10000).optional(),
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
    select: { ownerId: true, owner: { select: { paidUntil: true, trialEndsAt: true } } },
  })
  if (!venue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  const now = new Date()

  if (parsed.data.plan !== undefined) data.plan = parsed.data.plan

  if (parsed.data.extendPaidDays !== undefined) {
    const base = venue.owner.paidUntil && venue.owner.paidUntil > now ? venue.owner.paidUntil : now
    data.paidUntil = new Date(base.getTime() + parsed.data.extendPaidDays * 24 * 60 * 60 * 1000)
  } else if (parsed.data.paidUntil !== undefined) {
    data.paidUntil = parsed.data.paidUntil ? new Date(parsed.data.paidUntil) : null
  }

  if (parsed.data.extendTrialDays !== undefined) {
    const base = venue.owner.trialEndsAt && venue.owner.trialEndsAt > now ? venue.owner.trialEndsAt : now
    data.trialEndsAt = new Date(base.getTime() + parsed.data.extendTrialDays * 24 * 60 * 60 * 1000)
  } else if (parsed.data.trialEndsAt !== undefined) {
    data.trialEndsAt = parsed.data.trialEndsAt ? new Date(parsed.data.trialEndsAt) : null
  }

  if (parsed.data.bonusItems !== undefined) data.bonusItems = parsed.data.bonusItems
  if (parsed.data.bonusAiImports !== undefined) data.bonusAiImports = parsed.data.bonusAiImports
  if (parsed.data.bonusTtkExports !== undefined) data.bonusTtkExports = parsed.data.bonusTtkExports

  const user = await db.user.update({
    where: { id: venue.ownerId },
    data,
    select: {
      plan: true,
      paidUntil: true,
      trialEndsAt: true,
      bonusItems: true,
      bonusAiImports: true,
      bonusTtkExports: true,
    },
  })
  return NextResponse.json(user)
}
