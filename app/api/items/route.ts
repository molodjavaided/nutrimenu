import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, getEffectiveVenueId } from '@/lib/auth'
import { getEffectiveLimits } from '@/lib/plans'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const body = await req.json().catch(() => null)
  if (!body || !body.categoryId || !body.name) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
  }

  // Verify category belongs to venue
  const category = await db.category.findFirst({
    where: { id: body.categoryId, venueId: venueId },
  })
  if (!category) return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })

  // Enforce plan dish limit (skip for admin impersonation)
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
        const msg = limits.state === 'grace' || limits.state === 'expired'
          ? 'Пробный период завершён. Оплатите тариф, чтобы добавлять блюда.'
          : 'Добавление блюд недоступно на текущем тарифе.'
        return NextResponse.json({ error: msg }, { status: 403 })
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

  const count = await db.menuItem.count({ where: { categoryId: body.categoryId } })

  const { categoryId, ...rest } = body
  const item = await db.menuItem.create({
    data: {
      categoryId,
      venueId: venueId,
      name: rest.name,
      description: rest.description ?? null,
      photo: rest.photo ?? null,
      price: rest.price ?? null,
      weight: rest.weight ?? 0,
      weightUnit: rest.weightUnit ?? 'г',
      calories: rest.calories ?? 0,
      protein: rest.protein ?? 0,
      fat: rest.fat ?? 0,
      carbs: rest.carbs ?? 0,
      isAvailable: rest.isAvailable ?? true,
      sizes: rest.sizes ?? [],
      composition: rest.composition ?? [],
      variantGroups: rest.variantGroups ?? [],
      modifierGroups: rest.modifierGroups ?? [],
      sortOrder: count,
    },
  })

  return NextResponse.json({ ...item, categoryId: item.categoryId }, { status: 201 })
}
