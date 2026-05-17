import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { lookupIngredientMeta } from '@/lib/gemini-ingredient-meta'

// GET — статистика: сколько ингредиентов всего и сколько без ТТК-меты
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [total, missing] = await Promise.all([
    db.ingredientRef.count(),
    db.ingredientRef.count({
      where: { yieldCoefficients: { equals: null as never }, coldLossPercent: null },
    }),
  ])

  return NextResponse.json({ total, missing, filled: total - missing })
}

// POST — обогатить ОДИН ингредиент по id. Клиент-сайд цикл вызывает по очереди и рисует прогресс.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const id = body?.id
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const ing = await db.ingredientRef.findUnique({ where: { id } })
  if (!ing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await lookupIngredientMeta(ing.name)
  if (result.status !== 'ok') {
    return NextResponse.json({ ok: false, reason: result.status === 'transient' ? result.reason : 'not-found' }, { status: 502 })
  }

  const updated = await db.ingredientRef.update({
    where: { id },
    data: {
      category: result.meta.category,
      coldLossPercent: result.meta.coldLossPercent ?? null,
      yieldCoefficients: result.meta.yieldCoefficients ? (result.meta.yieldCoefficients as object) : undefined,
    },
  })

  return NextResponse.json({ ok: true, ingredient: { id: updated.id, name: updated.name, category: updated.category }, source: result.source })
}
