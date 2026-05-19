import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/** Конечное состояние («завершено»). */
const COMPLETED_STEP = -1
/** Сколько глав всего. Соответствует roadmap project_onboarding_redesign.md. */
const TOTAL_STEPS = 7

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { onboardingStep: true, onboardingCompletedAt: true, onboardingDismissedAt: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    step: user.onboardingStep,
    totalSteps: TOTAL_STEPS,
    completedAt: user.onboardingCompletedAt,
    dismissedAt: user.onboardingDismissedAt,
    isCompleted: user.onboardingStep === COMPLETED_STEP,
    isDismissed: !!user.onboardingDismissedAt && user.onboardingStep !== COMPLETED_STEP,
  })
}

/** POST {action: 'next'|'goto'|'skip'|'complete'|'restart'|'dismiss', step?: number} */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const action = body?.action as string | undefined
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { onboardingStep: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let updateData: Record<string, unknown>
  switch (action) {
    case 'next': {
      // Не выходим за TOTAL_STEPS. Если уже на последнем — завершаем.
      const current = user.onboardingStep
      const nextStep = current + 1 > TOTAL_STEPS ? COMPLETED_STEP : current + 1
      updateData = nextStep === COMPLETED_STEP
        ? { onboardingStep: COMPLETED_STEP, onboardingCompletedAt: new Date() }
        : { onboardingStep: nextStep }
      break
    }
    case 'goto': {
      const target = Number(body?.step)
      if (!Number.isInteger(target) || target < 0 || target > TOTAL_STEPS) {
        return NextResponse.json({ error: 'invalid step' }, { status: 400 })
      }
      updateData = { onboardingStep: target }
      break
    }
    case 'skip': {
      // Пропустить текущую главу — пойти на следующую без отметки
      const current = user.onboardingStep
      const nextStep = current + 1 > TOTAL_STEPS ? COMPLETED_STEP : current + 1
      updateData = nextStep === COMPLETED_STEP
        ? { onboardingStep: COMPLETED_STEP, onboardingCompletedAt: new Date() }
        : { onboardingStep: nextStep }
      break
    }
    case 'complete':
      updateData = { onboardingStep: COMPLETED_STEP, onboardingCompletedAt: new Date() }
      break
    case 'restart':
      updateData = { onboardingStep: 0, onboardingCompletedAt: null, onboardingDismissedAt: null }
      break
    case 'dismiss':
      // «Не сейчас» — не показывать автоматически, но не помечать как завершённое
      updateData = { onboardingDismissedAt: new Date() }
      break
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: session.userId },
    data: updateData,
    select: { onboardingStep: true, onboardingCompletedAt: true, onboardingDismissedAt: true },
  })

  return NextResponse.json({
    step: updated.onboardingStep,
    totalSteps: TOTAL_STEPS,
    completedAt: updated.onboardingCompletedAt,
    dismissedAt: updated.onboardingDismissedAt,
    isCompleted: updated.onboardingStep === COMPLETED_STEP,
    isDismissed: !!updated.onboardingDismissedAt && updated.onboardingStep !== COMPLETED_STEP,
  })
}
