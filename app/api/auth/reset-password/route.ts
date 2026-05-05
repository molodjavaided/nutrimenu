import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(6).max(100),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
  }

  const { token, password } = parsed.data

  const record = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Ссылка недействительна или устарела' }, { status: 400 })
  }

  const passwordHash = await hashPassword(password)

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])

  return NextResponse.json({ ok: true })
}
