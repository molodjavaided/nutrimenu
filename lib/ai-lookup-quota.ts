/**
 * Месячная квота на дешёвые AI-lookup'ы (штрихкод + мета ингредиента).
 * Считаем ТОЛЬКО реальные платные AI-вызовы: кэш / локальная база / OpenFoodFacts — бесплатны.
 * Зеркалит паттерн aiEnrich (lib/plans.ts + User.aiLookup*).
 */

import { db } from '@/lib/db'
import { getEffectiveLimits } from '@/lib/plans'
import type { SessionPayload } from '@/lib/auth'

export interface LookupQuota {
  isAdmin: boolean
  limit: number // Infinity = безлимит
  used: number
  remaining: number // Infinity = безлимит
}

/** Текущее состояние квоты пользователя. Админ — без лимита. */
export async function getLookupQuota(session: SessionPayload): Promise<LookupQuota> {
  if (session.role === 'ADMIN') {
    return { isAdmin: true, limit: Infinity, used: 0, remaining: Infinity }
  }
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      plan: true, trialEndsAt: true, paidUntil: true,
      bonusItems: true, bonusAiImports: true, bonusAiEnriches: true, bonusAiLookups: true, bonusTtkExports: true,
      aiLookupCount: true, aiLookupMonth: true,
    },
  })
  if (!user) return { isAdmin: false, limit: 0, used: 0, remaining: 0 }

  const limit = getEffectiveLimits(user).aiLookupPerMonth
  const currentMonth = new Date().getMonth() + 1
  const used = user.aiLookupMonth === currentMonth ? user.aiLookupCount : 0
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used)
  return { isAdmin: false, limit, used, remaining }
}

/** Инкремент счётчика с месячным сбросом. Не вызывать для админа. */
export async function bumpLookupCount(userId: string): Promise<void> {
  const currentMonth = new Date().getMonth() + 1
  const u = await db.user.findUnique({ where: { id: userId }, select: { aiLookupMonth: true } })
  await db.user.update({
    where: { id: userId },
    data: u?.aiLookupMonth === currentMonth
      ? { aiLookupCount: { increment: 1 } }
      : { aiLookupCount: 1, aiLookupMonth: currentMonth },
  })
}
