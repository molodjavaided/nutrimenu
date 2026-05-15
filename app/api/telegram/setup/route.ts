import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

/**
 * One-time admin endpoint: registers the webhook URL with Telegram.
 * Call from admin only. Usage:
 *   POST /api/telegram/setup
 */
export async function POST(_req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const token = process.env.TELEGRAM_BOT_TOKEN
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const base = process.env.NEXT_PUBLIC_BASE_URL
  if (!token || !secret || !base) {
    return NextResponse.json(
      { error: 'Missing env: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, NEXT_PUBLIC_BASE_URL' },
      { status: 500 },
    )
  }
  const webhookUrl = `${base.replace(/\/$/, '')}/api/telegram/webhook`

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message'],
    }),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json({ status: res.status, body, webhookUrl })
}
