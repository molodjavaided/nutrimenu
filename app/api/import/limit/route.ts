import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getEffectiveLimits, getUserState } from '@/lib/plans'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { emailVerified: true, ttkImportCount: true, ttkImportMonth: true, role: true, plan: true, trialEndsAt: true, paidUntil: true, bonusItems: true, bonusAiImports: true, bonusTtkExports: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const isAdmin = user.role === 'ADMIN'
  if (isAdmin) {
    return NextResponse.json({ emailVerified: true, ttkImportCount: 0, limit: Infinity, remaining: Infinity, canImport: true })
  }

  const limits = getEffectiveLimits({
    plan: user.plan,
    trialEndsAt: user.trialEndsAt,
    paidUntil: user.paidUntil,
    bonusItems: user.bonusItems,
    bonusAiImports: user.bonusAiImports,
    bonusTtkExports: user.bonusTtkExports,
  })
  const monthLimit = limits.aiImportPerMonth

  // Reset count if calendar month changed
  const currentMonth = new Date().getMonth() + 1
  const usedThisMonth = user.ttkImportMonth === currentMonth ? user.ttkImportCount : 0

  const remaining = monthLimit === Infinity ? Infinity : Math.max(0, monthLimit - usedThisMonth)

  return NextResponse.json({
    emailVerified: user.emailVerified,
    ttkImportCount: usedThisMonth,
    limit: monthLimit,
    remaining,
    canImport: user.emailVerified && limits.canImportAi && remaining > 0,
    plan: user.plan,
    state: limits.state,
    trialActive: limits.state === 'trial',
    trialEndsAt: user.trialEndsAt,
    paidUntil: user.paidUntil,
  })
}
