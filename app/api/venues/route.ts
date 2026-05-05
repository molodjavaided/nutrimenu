import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const search = new URL(req.url).searchParams.get('q') ?? ''

  const venues = await db.venue.findMany({
    where: {
      status: 'APPROVED',
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      description: true,
      workingHours: true,
      logo: true,
      tags: true,
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(venues)
}
