import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/** Owner's own feedback threads. */
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threads = await db.feedback.findMany({
    where: { userId: session.userId, source: 'OWNER' },
    orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      createdAt: true,
      lastReplyAt: true,
      category: true,
      status: true,
      message: true,
      ownerUnread: true,
      _count: { select: { replies: true } },
    },
    take: 100,
  })

  return NextResponse.json(threads)
}
