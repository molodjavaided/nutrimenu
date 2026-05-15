import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id, fileId } = await params

  const file = await db.venueFile.findUnique({ where: { id: fileId } })
  if (!file || file.venueId !== id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) await del(file.url)
  } catch (err) {
    console.error('Blob delete failed (continuing):', err)
  }

  await db.venueFile.delete({ where: { id: fileId } })
  return NextResponse.json({ ok: true })
}
