import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { authRatelimit } from '@/lib/ratelimit'
import { Resend } from 'resend'
import { captureException } from '@/lib/observability'

const resend = new Resend(process.env.RESEND_API)
const FROM = process.env.RESEND_FROM ?? 'Plate <noreply@nutrimenu.ru>'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await authRatelimit.limit(`forgot:${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Слишком много попыток.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: true }) // don't reveal whether email exists
  }

  const email = parsed.data.email.toLowerCase()
  const user = await db.user.findUnique({ where: { email } })

  // Always return ok to prevent email enumeration
  if (!user) {
    return NextResponse.json({ ok: true })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/reset-password/${token}`

  // A failing email provider must NOT 500 the route — that would leak that the
  // email exists (enumeration). Log it and still return ok.
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Сброс пароля Plate',
      html: `
        <p>Вы запросили сброс пароля.</p>
        <p><a href="${resetUrl}">Нажмите здесь для сброса пароля</a></p>
        <p>Ссылка действительна 1 час.</p>
        <p>Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
      `,
    })
  } catch (err) {
    captureException('password_reset_email_failed', err, { userId: user.id })
  }

  return NextResponse.json({ ok: true })
}
