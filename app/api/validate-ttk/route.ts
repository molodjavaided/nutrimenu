/**
 * POST /api/validate-ttk
 *
 * Body: {
 *   sheets: SheetInput[]
 *   examples?: TTKExample[]  — few-shot examples from localStorage
 * }
 *
 * Returns: { dishes: ParsedDish[], corrections: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateTTKDishes, type SheetInput } from '@/lib/gemini-ttk'
import type { TTKExample } from '@/lib/ttk-examples'

export async function POST(req: NextRequest) {
  let body: { sheets: SheetInput[]; examples?: TTKExample[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { sheets, examples = [] } = body
  if (!Array.isArray(sheets) || sheets.length === 0) {
    return NextResponse.json({ error: 'sheets обязателен' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY не настроен' }, { status: 503 })
  }

  try {
    const result = await validateTTKDishes(sheets, apiKey, examples)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
