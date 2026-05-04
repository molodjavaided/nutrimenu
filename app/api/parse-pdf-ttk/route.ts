/**
 * POST /api/parse-pdf-ttk
 *
 * Body: { fileData: string (base64), mimeType: string, examples?: TTKExample[] }
 *
 * Flow:
 *   PDF  → pdfjs text extraction → DeepSeek (text)
 *   PDF scan / image → Gemini Vision (requires GEMINI_API_KEY)
 *
 * Returns: { dishes: ParsedDish[], corrections: string[], method: string }
 */

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
      { error: `Неподдерживаемый тип: ${mimeType}. Поддерживаются PDF, JPEG, PNG, WebP` },
      { status: 400 },
    )
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (!deepseekKey && !geminiKey) {
    return NextResponse.json({ error: 'Не настроен ни DEEPSEEK_API_KEY, ни GEMINI_API_KEY' }, { status: 503 })
  }

  try {
    // Text PDFs → pdfjs extraction → DeepSeek
    if (mimeType === 'application/pdf' && deepseekKey) {
      const buffer = new Uint8Array(Buffer.from(fileData, 'base64'))

      let extracted: Awaited<ReturnType<typeof extractPDFText>> | null = null
      try {
        extracted = await extractPDFText(buffer)
      } catch {
        // pdfjs failed — fall through to Vision
      }

      if (extracted?.hasText) {
        const result = await parsePDFTextTTK(extracted.text, deepseekKey, examples)
        return NextResponse.json({ ...result, method: 'deepseek-text' })
      }
    }

    // Images and scan PDFs → Gemini Vision
    if (!geminiKey) {
      return NextResponse.json(
        { error: 'Скан PDF и изображения требуют GEMINI_API_KEY (DeepSeek не поддерживает Vision)' },
        { status: 503 },
      )
    }

    const result = await parsePDFTTK(fileData, mimeType, geminiKey, examples)
    return NextResponse.json({ ...result, method: 'gemini-vision' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
