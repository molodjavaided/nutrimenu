import { NextRequest, NextResponse } from 'next/server'
import { parsePDFTTK, parsePDFTextTTK } from '@/lib/gemini-ttk'
import { extractPDFText } from '@/lib/pdf-extract'
import type { TTKExample } from '@/lib/ttk-examples'

const SUPPORTED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
])

export async function POST(req: NextRequest) {
  let body: { fileData?: string; mimeType?: string; examples?: TTKExample[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { fileData, mimeType, examples = [] } = body

  if (!fileData || !mimeType) {
    return NextResponse.json({ error: 'fileData и mimeType обязательны' }, { status: 400 })
  }

  if (!SUPPORTED_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `Неподдерживаемый тип: ${mimeType}` },
      { status: 400 },
    )
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY не настроен' }, { status: 503 })
  }

  try {
    // Text PDF → extract text first (cheaper), fallback to Vision
    if (mimeType === 'application/pdf') {
      const buffer = new Uint8Array(Buffer.from(fileData, 'base64'))
      let extracted: Awaited<ReturnType<typeof extractPDFText>> | null = null
      try {
        extracted = await extractPDFText(buffer)
      } catch {
        // pdfjs failed — fall through to Vision
      }

      if (extracted?.hasText) {
        const result = await parsePDFTextTTK(extracted.text, apiKey, examples)
        return NextResponse.json({ ...result, method: 'text' })
      }
    }

    // Images and scan PDFs → Vision
    const result = await parsePDFTTK(fileData, mimeType, apiKey, examples)
    return NextResponse.json({ ...result, method: 'vision' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
