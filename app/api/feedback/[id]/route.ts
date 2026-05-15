import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const fb = await db.feedback.findUnique({
    where: { id },
    include: { replies: { orderBy: { createdAt: 'asc' } } },
  })
  if (!fb) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = session.role === 'OWNER' && fb.userId === session.userId
  const isAdmin = session.role === 'ADMIN'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Mark as read for the viewer
  if (isAdmin && fb.adminUnread) {
    await db.feedback.update({ where: { id }, data: { adminUnread: false } })
  } else if (isOwner && fb.ownerUnread) {
    await db.feedback.update({ where: { id }, data: { ownerUnread: false } })
  }

  return NextResponse.json(fb)
}
