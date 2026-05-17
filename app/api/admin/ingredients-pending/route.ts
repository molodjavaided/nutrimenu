import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Возвращает список id+name ингредиентов, у которых нет ТТК-меты.
// Клиент идёт по списку и POST-ит /api/admin/ingredients-backfill для каждого.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pending = await db.ingredientRef.findMany({
    where: { yieldCoefficients: { equals: null as never }, coldLossPercent: null },
    select: { id: true, name: true, venueId: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ ingredients: pending })
}
