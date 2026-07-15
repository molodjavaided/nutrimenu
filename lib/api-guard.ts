import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, type SessionPayload } from '@/lib/auth'
import { getEffectiveLimits } from '@/lib/plans'

type GuardOk = { ok: true; session: SessionPayload }
type GuardFail = { ok: false; response: NextResponse }
export type GuardResult = GuardOk | GuardFail

/**
 * Auth + plan gate for AI features. Caller must be logged in AND allowed to use
 * AI import on their current plan (admins bypass). Mirrors the gate used by
 * /api/import/limit so parse/validate/import stay consistent.
 */
export async function requireAiImport(): Promise<GuardResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (session.role === 'ADMIN') return { ok: true, session }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      plan: true, trialEndsAt: true, paidUntil: true,
      bonusItems: true, bonusAiImports: true, bonusAiEnriches: true, bonusTtkExports: true,
    },
  })
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  }

  const limits = getEffectiveLimits({
    plan: user.plan,
    trialEndsAt: user.trialEndsAt,
    paidUntil: user.paidUntil,
    bonusItems: user.bonusItems,
    bonusAiImports: user.bonusAiImports,
    bonusAiEnriches: user.bonusAiEnriches,
    bonusTtkExports: user.bonusTtkExports,
  })
  if (!limits.canImportAi) {
    return { ok: false, response: NextResponse.json({ error: 'AI-импорт недоступен на вашем тарифе' }, { status: 403 }) }
  }
  return { ok: true, session }
}

/**
 * Sliding-window rate limit by key. Returns a 429 response when the limit is
 * exceeded, otherwise null (caller proceeds).
 */
export async function enforceRateLimit(
  limiter: { limit: (key: string) => Promise<{ success: boolean }> },
  key: string,
): Promise<NextResponse | null> {
  const { success } = await limiter.limit(key)
  if (!success) {
    return NextResponse.json({ error: 'Слишком много запросов. Попробуйте позже.' }, { status: 429 })
  }
  return null
}
