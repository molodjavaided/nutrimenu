import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getEffectiveLimits } from '@/lib/plans'

/**
 * Возвращает текущие квоты AI-обогащения для UI.
 * Используется в /dashboard/ingredients для показа кнопки bulk-enrich и tooltip.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true, plan: true, trialEndsAt: true, paidUntil: true,
      bonusItems: true, bonusAiImports: true, bonusAiEnriches: true, bonusTtkExports: true,
      aiEnrichCount: true, aiEnrichMonth: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.role === 'ADMIN') {
    return NextResponse.json({ canEnrich: true, used: 0, limit: null, remaining: null, plan: user.plan })
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
  const monthLimit = limits.aiEnrichPerMonth
  const currentMonth = new Date().getMonth() + 1
  const used = user.aiEnrichMonth === currentMonth ? user.aiEnrichCount : 0
  const remaining = monthLimit === Infinity ? null : Math.max(0, monthLimit - used)

  return NextResponse.json({
    canEnrich: limits.canEnrichAi && (remaining === null || remaining > 0),
    used,
    limit: monthLimit === Infinity ? null : monthLimit,
    remaining,
    plan: user.plan,
    state: limits.state,
  })
}
