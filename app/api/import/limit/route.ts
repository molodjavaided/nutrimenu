import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const FREE_IMPORT_LIMIT = 3

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { emailVerified: true, ttkImportCount: true, role: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const isAdmin = user.role === 'ADMIN'
  const remaining = isAdmin ? Infinity : Math.max(0, FREE_IMPORT_LIMIT - user.ttkImportCount)

  return NextResponse.json({
    emailVerified: user.emailVerified,
    ttkImportCount: user.ttkImportCount,
    limit: FREE_IMPORT_LIMIT,
    remaining,
    canImport: (user.emailVerified || isAdmin) && (isAdmin || remaining > 0),
  })
}
