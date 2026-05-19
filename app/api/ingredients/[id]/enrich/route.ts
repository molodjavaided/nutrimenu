import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'
import { getEffectiveLimits } from '@/lib/plans'
import { lookupIngredientMeta } from '@/lib/gemini-ingredient-meta'

/**
 * Обогащает ОДИН ингредиент через AI: meta (category, coldLossPercent, yieldCoefficients)
 * + КБЖУ если они пустые. Клиент-сайд цикл дёргает по очереди для bulk-режима.
 *
 * Гейт: canEnrichAi (платный тариф). Квота: aiEnrichCount/Month с месячным сбросом.
 * Админ — без лимитов.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)
  if (!venueId) return NextResponse.json({ error: 'No venue' }, { status: 400 })

  const { id } = await params
  const [user, ingredient] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: {
        role: true, plan: true, trialEndsAt: true, paidUntil: true,
        bonusItems: true, bonusAiImports: true, bonusAiEnriches: true, bonusTtkExports: true,
        aiEnrichCount: true, aiEnrichMonth: true,
      },
    }),
    db.ingredientRef.findFirst({ where: { id, venueId } }),
  ])
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (!ingredient) return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })

  const isAdmin = user.role === 'ADMIN'

  // Тарифный гейт + квота
  let used = 0
  let monthLimit: number = Infinity
  if (!isAdmin) {
    const limits = getEffectiveLimits({
      plan: user.plan,
      trialEndsAt: user.trialEndsAt,
      paidUntil: user.paidUntil,
      bonusItems: user.bonusItems,
      bonusAiImports: user.bonusAiImports,
      bonusAiEnriches: user.bonusAiEnriches,
      bonusTtkExports: user.bonusTtkExports,
    })
    if (!limits.canEnrichAi) {
      return NextResponse.json(
        { ok: false, error: 'AI-обогащение недоступно на вашем тарифе', code: 'plan_required' },
        { status: 402 }
      )
    }
    monthLimit = limits.aiEnrichPerMonth
    const currentMonth = new Date().getMonth() + 1
    used = user.aiEnrichMonth === currentMonth ? user.aiEnrichCount : 0
    const remaining = monthLimit === Infinity ? Infinity : Math.max(0, monthLimit - used)
    if (remaining <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Месячная квота AI-обогащения исчерпана', code: 'quota_exceeded', used, limit: monthLimit },
        { status: 429 }
      )
    }
  }

  // AI lookup
  const result = await lookupIngredientMeta(ingredient.name)
  if (result.status !== 'ok') {
    const reason = result.status === 'transient' ? result.reason : 'not-found'
    return NextResponse.json({ ok: false, reason }, { status: 502 })
  }

  // Решаем что обновляем
  const hasNutri =
    (ingredient.caloriesPer100 ?? 0) > 0 ||
    (ingredient.proteinPer100 ?? 0) > 0 ||
    (ingredient.fatPer100 ?? 0) > 0 ||
    (ingredient.carbsPer100 ?? 0) > 0

  const updateData: Record<string, unknown> = {
    category: result.meta.category,
    coldLossPercent: result.meta.coldLossPercent ?? ingredient.coldLossPercent,
    yieldCoefficients: result.meta.yieldCoefficients
      ? (result.meta.yieldCoefficients as object)
      : ingredient.yieldCoefficients ?? undefined,
  }
  let filledNutri = false
  if (!hasNutri && result.meta.caloriesPer100 !== undefined) {
    updateData.caloriesPer100 = result.meta.caloriesPer100
    updateData.proteinPer100 = result.meta.proteinPer100 ?? 0
    updateData.fatPer100 = result.meta.fatPer100 ?? 0
    updateData.carbsPer100 = result.meta.carbsPer100 ?? 0
    filledNutri = true
  }

  // Атомарно: обновить ингредиент + счётчик
  const currentMonth = new Date().getMonth() + 1
  const counterUpdate = user.aiEnrichMonth === currentMonth
    ? { aiEnrichCount: { increment: 1 } }
    : { aiEnrichCount: 1, aiEnrichMonth: currentMonth }

  const [updated] = await db.$transaction([
    db.ingredientRef.update({ where: { id: ingredient.id }, data: updateData }),
    ...(isAdmin ? [] : [db.user.update({ where: { id: session.userId }, data: counterUpdate })]),
  ])

  return NextResponse.json({
    ok: true,
    ingredient: updated,
    filledNutri,
    source: result.source,
    used: isAdmin ? 0 : used + 1,
    limit: monthLimit === Infinity ? null : monthLimit,
    remaining: isAdmin
      ? null
      : (monthLimit === Infinity ? null : Math.max(0, monthLimit - used - 1)),
  })
}
