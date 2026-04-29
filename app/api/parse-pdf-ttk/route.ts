/**
 * POST /api/parse-pdf-ttk
 *
 * Body (JSON): {
 *   fileData: string       — base64-encoded file content
 *   mimeType: string       — "application/pdf" | "image/jpeg" | "image/png" | "image/webp"
 *   examples?: TTKExample[] — few-shot examples from localStorage for better accuracy
 * }
 *
 * Returns: { dishes: ParsedDish[], corrections: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { parsePDFTTK } from '@/lib/gemini-ttk'
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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY не настроен' }, { status: 503 })
  }

  try {
    const result = await parsePDFTTK(fileData, mimeType, apiKey, examples)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
