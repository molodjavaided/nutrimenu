import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getSession } from '@/lib/auth'
import { captureException } from '@/lib/observability'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only images allowed' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Max file size 5MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `dishes/${session.venueId}/${Date.now()}.${ext}`

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    logger.error('blob_token_missing', { venueId: session.venueId })
    return NextResponse.json(
      { error: 'Vercel Blob не настроен. Добавьте BLOB_READ_WRITE_TOKEN в переменные окружения.' },
      { status: 500 }
    )
  }

  try {
    const blob = await put(filename, file, { access: 'public', addRandomSuffix: true })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    captureException('blob_upload_failed', err, { venueId: session.venueId })
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Не удалось загрузить: ${message}` }, { status: 500 })
  }
}
