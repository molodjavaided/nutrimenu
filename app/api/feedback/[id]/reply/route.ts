import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { feedbackRatelimit } from '@/lib/ratelimit'
import { sendTelegramMessage, escapeHtml } from '@/lib/telegram'

const schema = z.object({ message: z.string().trim().min(1).max(4000) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await feedbackRatelimit.limit(`feedback-reply:${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Слишком много отправок' }, { status: 429 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
  }

  const fb = await db.feedback.findUnique({
    where: { id },
    select: { id: true, userId: true, venueId: true, category: true, message: true },
  })
  if (!fb) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = session.role === 'OWNER' && fb.userId === session.userId
  const isAdmin = session.role === 'ADMIN'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const reply = await db.$transaction(async tx => {
    const r = await tx.feedbackReply.create({
      data: {
        feedbackId: id,
        authorRole: isAdmin ? 'ADMIN' : 'OWNER',
        authorId: session.userId,
        message: parsed.data.message,
      },
    })
    await tx.feedback.update({
      where: { id },
      data: {
        lastReplyAt: now,
        adminUnread: isOwner ? true : false,
        ownerUnread: isAdmin ? true : false,
      },
    })
    return r
  })

  // Notify admin via TG when owner replies
  if (isOwner) {
    let venueName: string | null = null
    if (fb.venueId) {
      const v = await db.venue.findUnique({ where: { id: fb.venueId }, select: { name: true } })
      venueName = v?.name ?? null
    }
    const venueLine = venueName ? `\nЗаведение: <b>${escapeHtml(venueName)}</b>` : ''
    const text = `💬 <b>Ответ от владельца</b>${venueLine}\n\n${escapeHtml(parsed.data.message)}\n\n<i>thread: ${id}</i>`
    void sendTelegramMessage(text)
  }

  return NextResponse.json(reply, { status: 201 })
}
