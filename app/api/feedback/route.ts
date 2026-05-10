import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { feedbackRatelimit } from '@/lib/ratelimit'
import { sendTelegramMessage, escapeHtml } from '@/lib/telegram'

const schema = z.object({
  source: z.enum(['OWNER', 'GUEST']),
  category: z.enum(['bug', 'idea', 'question', 'other']).default('other'),
  message: z.string().trim().min(3).max(4000),
  rating: z.number().int().min(1).max(5).optional(),
  email: z.string().email().max(200).optional(),
  pageUrl: z.string().max(500).optional(),
  venueSlug: z.string().max(100).optional(),
})

const CATEGORY_ICON: Record<string, string> = {
  bug: '🐛',
  idea: '💡',
  question: '❓',
  other: '💬',
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await feedbackRatelimit.limit(`feedback:${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Слишком много отправок, попробуйте позже' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
  }
  const data = parsed.data

  const session = await getSession()
  let venueId: string | null = null
  let venueName: string | null = null
  let userId: string | null = null
  let userEmail: string | null = null

  if (data.source === 'OWNER') {
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    userId = session.userId
    userEmail = session.email
    venueId = session.venueId
    const v = await db.venue.findUnique({ where: { id: venueId }, select: { name: true } })
    venueName = v?.name ?? null
  } else if (data.venueSlug) {
    const v = await db.venue.findUnique({ where: { slug: data.venueSlug }, select: { id: true, name: true } })
    if (v) {
      venueId = v.id
      venueName = v.name
    }
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 300) ?? null

  const feedback = await db.feedback.create({
    data: {
      source: data.source,
      category: data.category,
      message: data.message,
      rating: data.rating ?? null,
      email: data.email ?? userEmail ?? null,
      pageUrl: data.pageUrl ?? null,
      userAgent,
      venueId,
      userId,
    },
  })

  const icon = CATEGORY_ICON[data.category]
  const sourceLabel = data.source === 'OWNER' ? 'Владелец' : 'Гость'
  const ratingLine = data.rating ? `\nОценка: ${'⭐'.repeat(data.rating)} (${data.rating}/5)` : ''
  const venueLine = venueName ? `\nЗаведение: <b>${escapeHtml(venueName)}</b>` : ''
  const emailLine = (data.email || userEmail) ? `\nКонтакт: ${escapeHtml(data.email || userEmail || '')}` : ''
  const pageLine = data.pageUrl ? `\nСтраница: <code>${escapeHtml(data.pageUrl)}</code>` : ''

  const text = `${icon} <b>${data.category.toUpperCase()}</b> · ${sourceLabel}${venueLine}${emailLine}${pageLine}${ratingLine}\n\n${escapeHtml(data.message)}\n\n<i>id: ${feedback.id}</i>`

  await sendTelegramMessage(text)

  return NextResponse.json({ ok: true, id: feedback.id }, { status: 201 })
}
