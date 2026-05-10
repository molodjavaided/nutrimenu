import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const venue = await db.venue.findUnique({
    where: { id },
    include: {
      owner: { select: { email: true, emailVerified: true, ttkImportCount: true, createdAt: true } },
      categories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              photo: true,
              price: true,
              weight: true,
              weightUnit: true,
              calories: true,
              protein: true,
              fat: true,
              carbs: true,
              isAvailable: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  })

  if (!venue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(venue)
}
