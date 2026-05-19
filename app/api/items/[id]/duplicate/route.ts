import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'
import { getEffectiveLimits } from '@/lib/plans'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const { id } = await params
  const original = await db.menuItem.findFirst({ where: { id, venueId } })
  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!session.impersonatingVenueId) {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { plan: true, trialEndsAt: true, paidUntil: true, role: true, bonusItems: true, bonusAiImports: true, bonusTtkExports: true },
    })
    if (user && user.role !== 'ADMIN') {
      const limits = getEffectiveLimits({
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
        paidUntil: user.paidUntil,
        bonusItems: user.bonusItems,
        bonusAiImports: user.bonusAiImports,
        bonusTtkExports: user.bonusTtkExports,
      })
      if (!limits.canAddItems) {
        return NextResponse.json({ error: 'Добавление блюд недоступно на текущем тарифе.' }, { status: 403 })
      }
      if (limits.maxItems !== Infinity) {
        const totalItems = await db.menuItem.count({ where: { venueId } })
        if (totalItems >= limits.maxItems) {
          return NextResponse.json(
            { error: `Достигнут лимит тарифа: ${limits.maxItems} блюд. Перейдите на Стандарт.` },
            { status: 403 }
          )
        }
      }
    }
  }

  const count = await db.menuItem.count({ where: { categoryId: original.categoryId } })

  const copy = await db.menuItem.create({
    data: {
      categoryId: original.categoryId,
      venueId: original.venueId,
      name: `Копия — ${original.name}`,
      description: original.description,
      photo: original.photo,
      price: original.price,
      weight: original.weight,
      weightUnit: original.weightUnit,
      calories: original.calories,
      protein: original.protein,
      fat: original.fat,
      carbs: original.carbs,
      isAvailable: original.isAvailable,
      sizes: (original.sizes ?? []) as object,
      composition: (original.composition ?? []) as object,
      variantGroups: (original.variantGroups ?? []) as object,
      modifierGroups: (original.modifierGroups ?? []) as object,
      creationMode: original.creationMode,
      finalWeight: original.finalWeight,
      servingSize: original.servingSize,
      sortOrder: count,
    },
  })

  return NextResponse.json(copy, { status: 201 })
}
