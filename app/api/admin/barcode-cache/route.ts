import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [total, negative] = await Promise.all([
    db.barcodeCache.count(),
    db.barcodeCache.count({ where: { found: false } }),
  ])

  return NextResponse.json({ total, negative, positive: total - negative })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const mode = req.nextUrl.searchParams.get('mode') ?? 'negative'
  const where = mode === 'all' ? {} : { found: false }
  const result = await db.barcodeCache.deleteMany({ where })

  return NextResponse.json({ deleted: result.count })
}
