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

  const deepseekKey = process.env.DEEPSEEK_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!deepseekKey && !geminiKey) {
    return NextResponse.json({ error: 'Не настроен ни DEEPSEEK_API_KEY, ни GEMINI_API_KEY' }, { status: 503 })
  }

  try {
    // Try DeepSeek first; fall back to Gemini on balance error
    let result
    if (deepseekKey) {
      try {
        result = await validateTTKDishes(sheets, deepseekKey, examples)
      } catch (err) {
        const isNoBalance = (err as { code?: string }).code === 'NO_BALANCE'
        if (!isNoBalance || !geminiKey) throw err
        result = await validateTTKDishes(sheets, geminiKey, examples)
      }
    } else {
      result = await validateTTKDishes(sheets, geminiKey!, examples)
    }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
