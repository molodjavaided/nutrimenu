import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifyPassword, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'
import { authRatelimit } from '@/lib/ratelimit'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await authRatelimit.limit(`login:${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте через 15 минут.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
  }

  const { email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { venue: { select: { id: true } } },
  })

  if (!user) {
    return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
  }

  if (user.role === 'OWNER' && !user.venue) {
    return NextResponse.json({ error: 'Заведение не найдено' }, { status: 404 })
  }

  const token = await createSessionToken({
    email: user.email,
    userId: user.id,
    venueId: user.venue?.id ?? '',
    role: user.role as 'OWNER' | 'ADMIN',
  })

  const redirectTo = user.role === 'ADMIN' ? '/admin' : '/dashboard'

  const res = NextResponse.json({ ok: true, redirectTo })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return res
}
