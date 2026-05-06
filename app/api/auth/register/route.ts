import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0]
import { hashPassword, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'
import { authRatelimit } from '@/lib/ratelimit'

const schema = z.object({
  venueName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
})

function makeSlug(name: string): string {
  const id = Math.random().toString(36).slice(2, 7)
  const base = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 20)
    .replace(/-+$/, '')
  return base ? `${base}-${id}` : `venue-${id}`
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await authRatelimit.limit(`register:${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте через 15 минут.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные', details: parsed.error.flatten() }, { status: 400 })
  }

  const { venueName, email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return NextResponse.json({ error: 'Email уже зарегистрирован' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)

  const { user, venue } = await db.$transaction(async (tx: TransactionClient) => {
    const user = await tx.user.create({
      data: { email: normalizedEmail, passwordHash },
    })
    const venue = await tx.venue.create({
      data: {
        name: venueName,
        slug: makeSlug(venueName),
        ownerId: user.id,
        status: 'PENDING',
      },
    })
    return { user, venue }
  })

  const token = await createSessionToken({ email: user.email, userId: user.id, venueId: venue.id, role: 'OWNER' })

  const res = NextResponse.json({ ok: true, venueId: venue.id }, { status: 201 })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return res
}
