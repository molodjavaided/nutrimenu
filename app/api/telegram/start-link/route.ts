import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { signStartToken } from '@/lib/telegram'

/** Returns a deep-link URL for the current owner to start the briefing bot. */
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const username = process.env.TELEGRAM_BOT_USERNAME
  if (!username) {
    return NextResponse.json({ error: 'Bot username not configured' }, { status: 500 })
  }
  const token = signStartToken(session.venueId)
  return NextResponse.json({
    url: `https://t.me/${username}?start=${token}`,
    username,
  })
}
