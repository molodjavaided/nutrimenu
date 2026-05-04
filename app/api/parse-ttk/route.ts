/**
 * POST /api/parse-ttk
 *
 * Body (JSON): { url: string }   — Google Sheets URL
 *
 * Returns: { dishes, errors, strategy, usedAI, corrections }
 *
 * Flow:
 *  1. Fetch Google Sheet as XLSX
 *  2. For each sheet: convert to 2D string array
 *  3. Run multi-strategy heuristic parser; pick best result per sheet
 *  4. Always run Gemini validation:
 *       - confidence < CONFIDENCE_THRESHOLD or 0 dishes → extract mode (dishes: [])
 *       - otherwise                                      → validate+correct mode
 *  5. Return merged ParsedDish[] with corrections list
 */

import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { detectAndParse, CONFIDENCE_THRESHOLD, type StrategyResult } from '@/lib/ttk-strategies'
import { validateTTKDishes } from '@/lib/gemini-ttk'
import type { ParsedDish } from '@/lib/ttk-types'
import type { TTKExample } from '@/lib/ttk-examples'

const SHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/

// ─── Fetch Google Sheet as XLSX buffer ─────────────────────────

async function fetchSheetBuffer(url: string): Promise<{ buffer: ArrayBuffer; error?: string }> {
  const match = url.match(SHEET_ID_RE)
  if (!match) return { buffer: new ArrayBuffer(0), error: 'Неверная ссылка на Google Таблицу' }

  const id = match[1]
  const gidM = url.match(/[?&#]gid=(\d+)/)
  const exportUrl = gidM
    ? `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx&gid=${gidM[1]}`
    : `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`

  let res: Response
  try {
    res = await fetch(exportUrl, { headers: { 'User-Agent': 'NutriMenu/1.0' }, redirect: 'follow' })
  } catch {
    return { buffer: new ArrayBuffer(0), error: 'Не удалось подключиться к Google' }
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return {
        buffer: new ArrayBuffer(0),
        error: 'Таблица закрыта. Откройте доступ: Файл → Поделиться → Все, у кого есть ссылка.',
      }
    }
    return { buffer: new ArrayBuffer(0), error: `Google вернул ошибку ${res.status}` }
  }

  return { buffer: await res.arrayBuffer() }
}

// ─── Convert XLSX worksheet to 2D string array ─────────────────

function worksheetToRows(ws: XLSX.WorkSheet): string[][] {
  const ref = ws['!ref']
  if (!ref) return []
  const range = XLSX.utils.decode_range(ref)
  const rows: string[][] = []

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      const val = cell?.v != null ? String(cell.v).trim() : ''
      row.push(val.replace(/\r\n|\r/g, '\n'))
    }
    rows.push(row)
  }
  return rows
}

// ─── Main handler ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { url?: string; examples?: TTKExample[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { url, examples = [] } = body
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const { buffer, error: fetchError } = await fetchSheetBuffer(url)
  if (fetchError) return NextResponse.json({ error: fetchError }, { status: 502 })

  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(new Uint8Array(buffer), { cellStyles: true })
  } catch {
    return NextResponse.json({ error: 'Не удалось прочитать файл' }, { status: 422 })
  }

  const errors: string[] = []
  const strategiesUsed = new Set<string>()

  // Per-sheet data for Gemini validation
  interface SheetData {
    name: string
    rows: string[][]
    heuristicDishes: ParsedDish[]
    heuristicConfidence: number
  }
  const sheetsData: SheetData[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const rows = worksheetToRows(ws)
    if (rows.length === 0) continue

    const result: StrategyResult = detectAndParse(rows, sheetName)
    strategiesUsed.add(result.strategy)
    sheetsData.push({
      name: sheetName,
      rows,
      heuristicDishes: result.dishes,
      heuristicConfidence: result.confidence,
    })
  }

  // ─── Gemini validation/extraction ──────────────────────────
  const apiKey = process.env.DEEPSEEK_API_KEY
  let allDishes: ParsedDish[] = []
  let usedAI = false
  let corrections: string[] = []

  if (apiKey && sheetsData.length > 0) {
    try {
      const geminiSheets = sheetsData.map(s => ({
        name: s.name,
        rows: s.rows,
        // Use empty dishes for low-confidence sheets so Gemini extracts from scratch;
        // pass parsed dishes for good-confidence sheets so Gemini validates and corrects.
        dishes: s.heuristicConfidence < CONFIDENCE_THRESHOLD || s.heuristicDishes.length === 0
          ? []
          : s.heuristicDishes,
      }))

      const result = await validateTTKDishes(geminiSheets, apiKey, examples)
      allDishes = result.dishes
      corrections = result.corrections
      usedAI = true
      strategiesUsed.add('ai-validate')
    } catch (err) {
      errors.push(`AI валидация: ${String(err)}`)
      // Fall back to heuristic results
      allDishes = sheetsData.flatMap(s => s.heuristicDishes)
    }
  } else {
    allDishes = sheetsData.flatMap(s => s.heuristicDishes)
  }

  // Deduplicate by id
  const seen = new Map<string, ParsedDish>()
  for (const d of allDishes) {
    if (!seen.has(d.id)) seen.set(d.id, d)
  }

  return NextResponse.json({
    dishes: Array.from(seen.values()),
    errors,
    strategy: Array.from(strategiesUsed).join('+'),
    usedAI,
    corrections,
  })
}
