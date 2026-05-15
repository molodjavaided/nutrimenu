import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

const schema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
})

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
  }

  const result = await db.venue.updateMany({
    where: { id: { in: parsed.data.ids } },
    data: { status: parsed.data.status },
  })
  return NextResponse.json({ updated: result.count })
}
