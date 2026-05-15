import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendToChat, verifyStartToken } from '@/lib/telegram'
import { handleBriefingMessage, startBriefing } from '@/lib/telegram-briefing'

/**
 * Telegram bot webhook receiver.
 * Validates the secret token header set when registering the webhook.
 * Dispatches /start with a signed venue token, otherwise forwards to the briefing state machine.
 */
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  const received = req.headers.get('x-telegram-bot-api-secret-token')
  if (received !== expectedSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const update = await req.json().catch(() => null)
  if (!update || typeof update !== 'object') {
    return NextResponse.json({ ok: true })
  }

  const message = (update as { message?: unknown }).message as
    | {
        chat: { id: number; username?: string }
        from?: { id: number; username?: string }
        text?: string
        document?: { file_id: string; file_name?: string; mime_type?: string }
        photo?: Array<{ file_id: string; width: number; height: number }>
      }
    | undefined

  if (!message) {
    return NextResponse.json({ ok: true })
  }

  const chatId = message.chat.id
  const tgUsername = message.from?.username ?? message.chat.username ?? null

  // /start handler — links chat to venue
  if (message.text?.startsWith('/start')) {
    const param = message.text.slice('/start'.length).trim()
    const venueId = param ? verifyStartToken(param) : null
    if (!venueId) {
      await sendToChat(
        chatId,
        'Здравствуйте! Этот бот используется владельцами заведений Plate. Перейдите по ссылке из дашборда, чтобы начать.',
      )
      return NextResponse.json({ ok: true })
    }
    const venue = await db.venue.findUnique({
      where: { id: venueId },
      select: { id: true, ownerId: true },
    })
    if (!venue) {
      await sendToChat(chatId, 'Заведение не найдено.')
      return NextResponse.json({ ok: true })
    }
    if (tgUsername) {
      await db.user.update({ where: { id: venue.ownerId }, data: { telegramUsername: tgUsername } }).catch(() => {})
    }
    await startBriefing(venue.id, venue.ownerId, chatId)
    return NextResponse.json({ ok: true })
  }

  // For non-/start messages, find venue by linked chatId
  const user = await db.user.findUnique({
    where: { telegramChatId: String(chatId) },
    select: { id: true, venue: { select: { id: true } } },
  })
  if (!user?.venue) {
    await sendToChat(chatId, 'Ваш чат не привязан к заведению. Перейдите по ссылке из дашборда заново.')
    return NextResponse.json({ ok: true })
  }

  await handleBriefingMessage(user.venue.id, user.id, {
    chatId,
    text: message.text,
    document: message.document,
    photo: message.photo,
  })

  return NextResponse.json({ ok: true })
}
