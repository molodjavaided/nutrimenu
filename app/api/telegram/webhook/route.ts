import { NextRequest, NextResponse } from 'next/server'

/**
 * Telegram bot webhook receiver.
 * Validates the secret token header set when registering the webhook.
 *
 * NOTE (2026-06-16): incoming-message handling is intentionally PAUSED.
 * The bot is outbound-only for now — it only notifies the admin of new venue
 * registrations (see app/api/auth/register/route.ts). The sales-lead AI ("Александр"),
 * owner briefing, and two-way feedback mirroring still live in lib/* but are no longer
 * dispatched here. Restore the dispatch from git history when the bot becomes
 * tech-support / in-Telegram payments later.
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

  // Incoming messages are acknowledged and ignored — bot is outbound-only for now.
  return NextResponse.json({ ok: true })
}
