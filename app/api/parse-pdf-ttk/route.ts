import { NextRequest, NextResponse } from 'next/server'
import { parsePDFTTK, parsePDFTextTTK } from '@/lib/gemini-ttk'
import { extractPDFText } from '@/lib/pdf-extract'
import type { TTKExample } from '@/lib/ttk-examples'
import { requireAiImport, enforceRateLimit } from '@/lib/api-guard'
import { aiRatelimit } from '@/lib/ratelimit'

const SUPPORTED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
])

export async function POST(req: NextRequest) {
  const guard = await requireAiImport()
  if (!guard.ok) return guard.response
  const limited = await enforceRateLimit(aiRatelimit, `ai:${guard.session.userId}`)
  if (limited) return limited

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

  // Cap payload before decoding/Vision so an oversized upload can't burn a full expensive call.
  // base64 is ~1.37× the raw bytes; 10 MB base64 ≈ 7.3 MB file.
  const MAX_FILE_DATA_CHARS = 10 * 1024 * 1024
  if (fileData.length > MAX_FILE_DATA_CHARS) {
    return NextResponse.json(
      { error: 'Файл слишком большой (макс. ~7 МБ)' },
      { status: 413 },
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
