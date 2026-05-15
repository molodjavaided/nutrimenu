import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, isFileCategory } from '@/lib/venue-files'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const files = await db.venueFile.findMany({
    where: { venueId: id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(files)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  const venue = await db.venue.findUnique({ where: { id }, select: { id: true } })
  if (!venue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const form = await req.formData()
  const file = form.get('file')
  const category = form.get('category')
  const notes = form.get('notes')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Тип ${file.type} не разрешён` }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Максимум 10 MB' }, { status: 400 })
  }
  if (!isFileCategory(category)) {
    return NextResponse.json({ error: 'Неверная категория' }, { status: 400 })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Vercel Blob не настроен' }, { status: 500 })
  }

  const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(0, 80)
  const blobPath = `venue-files/${id}/${Date.now()}-${safeName}`

  const blob = await put(blobPath, file, { access: 'public', addRandomSuffix: true })

  const saved = await db.venueFile.create({
    data: {
      venueId: id,
      uploadedById: session.userId,
      uploaderRole: 'ADMIN',
      category,
      filename: file.name,
      url: blob.url,
      size: file.size,
      mimeType: file.type,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    },
  })
  return NextResponse.json(saved, { status: 201 })
}
