import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { signStartToken } from '@/lib/telegram'
import { initialState, type BriefingState } from '@/lib/telegram-briefing'

interface PageProps {
  searchParams: Promise<{ plan?: string }>
}

export const dynamic = 'force-dynamic'

export default async function GoTelegramPage({ searchParams }: PageProps) {
  const { plan } = await searchParams
  const planParam = plan ? `?plan=${encodeURIComponent(plan)}` : ''
  const returnTo = `/go/telegram${planParam}`

  const session = await getSession()
  if (!session) {
    redirect(`/auth/register?returnTo=${encodeURIComponent(returnTo)}`)
  }
  if (session.role !== 'OWNER') {
    redirect('/admin')
  }

  const username = process.env.TELEGRAM_BOT_USERNAME
  if (!username) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm" style={{ color: '#6B6490' }}>
          Telegram-бот не настроен. Свяжитесь с админом по email.
        </p>
      </main>
    )
  }

  if (plan) {
    const venue = await db.venue.findUnique({
      where: { id: session.venueId },
      select: { briefingState: true },
    })
    const current = (venue?.briefingState as BriefingState | null) ?? initialState()
    current.answers = { ...current.answers, plan }
    await db.venue.update({
      where: { id: session.venueId },
      data: { briefingState: current as unknown as object },
    })
  }

  const token = signStartToken(session.venueId)
  redirect(`https://t.me/${username}?start=${token}`)
}
