/**
 * Multi-strategy TTK parser.
 *
 * Each strategy receives the worksheet as a 2D string array (rows × cols)
 * and returns ParsedDish[] + a confidence score [0..1].
 *
 * The orchestrator runs all strategies and picks the best one.
 * If the best score is below CONFIDENCE_THRESHOLD the caller should
 * fall back to AI parsing.
 */

import { type ParsedDish, normalizeIngredientName } from '@/lib/ttk-types'

export const CONFIDENCE_THRESHOLD = 0.45

export interface StrategyResult {
  strategy: string
  dishes: ParsedDish[]
  confidence: number
}

// ─── Shared helpers ────────────────────────────────────────────

const SKIP_RE =
  /^(выход|итого|итог|всего|брутто|нетто|наименование|ингредиент|продукт|сырьё|№|n\s*п|расход|закладка)/i

function isSkip(t: string) { return SKIP_RE.test(t.trim()) }

function isInstruction(t: string) {
  const s = t.trim()
  return s.startsWith('"') || s.startsWith('«') || s.startsWith('*') ||
    /технологи[яи]/i.test(s) || /приготовлени[яе]/i.test(s)
}

/** Parse a weight+unit from a cell string.  Returns {amount, unit} or null. */
function parseWeight(raw: string): { amount: number; unit: 'г' | 'мл' | 'шт' } | null {
  if (!raw) return null
  // "120/100/100" — take first alternative
  const slashM = raw.match(/^(\d+[,.]?\d*)\//)
  const numM = slashM ? slashM : raw.match(/(\d+[,.]?\d*)/)
  if (!numM) return null
  const n = parseFloat(numM[1].replace(',', '.'))
  if (!n || n <= 0) return null
  if (/[кК][гГ]/.test(raw)) return { amount: n * 1000, unit: 'г' }
  if (/\bл\.?\s*$/i.test(raw) && !/[мМ][лЛ]/.test(raw)) return { amount: n * 1000, unit: 'мл' }
  if (/[мМ][лЛ]/.test(raw)) return { amount: n, unit: 'мл' }
  if (/шт\.?/i.test(raw)) return { amount: n, unit: 'шт' }
  if (/шот[аы]?/i.test(raw)) return { amount: n, unit: 'шт' }
  return { amount: n, unit: 'г' }
}

/** Strip leading serial number "1.", "2)" etc from dish name */
function stripSerial(s: string) { return s.replace(/^\d+[.)]\s*/, '').trim() }

// ─── Strategy A: TTK hierarchical ─────────────────────────────
// Dish header = text ONLY in col 0, all other cols empty.
// Ingredient rows have a numeric amount in cols 1-6.
// This mirrors the existing parseTTKSheet logic.

export function strategyHierarchical(
  rows: string[][],
  sheetName: string,
): StrategyResult {
  const category = sheetName || 'Основное'
  const dishes: ParsedDish[] = []
  let current: ParsedDish | null = null
  let totalRows = 0, parsedRows = 0
  // Track ingredient rows with many filled columns — signals per-row format, not hierarchical
  let richIngredientRows = 0, ingredientRows = 0

  function flush() { if (current) { dishes.push(current); current = null } }

  for (const cols of rows) {
    const nonEmpty = cols.filter(c => c.trim())
    if (nonEmpty.length === 0) continue
    totalRows++

    const col0 = cols[0]?.trim() ?? ''
    const col1 = cols[1]?.trim() ?? ''
    // Layout B: col 0 empty, col 1 has ingredient name (ingredient rows)
    const nameColIdx = col0 ? 0 : (col1 ? 1 : -1)
    if (nameColIdx === -1) continue

    const nameRaw = cols[nameColIdx].trim()
    if (isSkip(nameRaw)) continue

    if (isInstruction(nameRaw)) {
      if (current && !current.instructions) current.instructions = nameRaw.replace(/^["«]|["»]$/g, '').trim()
      parsedRows++
      continue
    }

    // Dish header: text in col 0 only
    const allOtherEmpty = cols.slice(1).every(c => !c.trim())
    if (col0 && allOtherEmpty) {
      flush()
      current = {
        id: crypto.randomUUID(), name: stripSerial(col0),
        category, kind: 'dish', ingredients: [],
      }
      parsedRows++
      continue
    }

    if (!current) continue

    // Count non-empty cols to detect per-row format masquerading as hierarchical
    ingredientRows++
    // >2 filled cols with long text = likely a per-row dish row, not an ingredient
    const longCells = nonEmpty.filter(c => c.length > 15)
    if (nonEmpty.length >= 3 && longCells.length >= 2) richIngredientRows++

    // Find weight in cols 1-6
    let amount = 0; let unit: 'г' | 'мл' | 'шт' = 'г'
    for (let ci = 1; ci < cols.length && ci <= 6; ci++) {
      const w = parseWeight(cols[ci])
      if (w && w.amount > 0) { amount = w.amount; unit = w.unit; break }
    }

    let ingredientName = normalizeIngredientName(nameRaw)
    if (!ingredientName) continue

    current.ingredients.push({ ingredientName, netWeight: amount, unit })
    parsedRows++
  }
  flush()

  // If >40% of ingredient rows look like per-row dish rows, this format is wrong for hierarchical
  const richRatio = ingredientRows > 0 ? richIngredientRows / ingredientRows : 0
  const formatPenalty = richRatio > 0.4 ? 0.15 : 1

  const confidence = totalRows > 0
    ? Math.min(1, (parsedRows / totalRows) * (dishes.length > 0 ? 1 : 0)) * formatPenalty
    : 0

  return { strategy: 'hierarchical', dishes: dedup(dishes), confidence }
}

// ─── Strategy B: Columnar (header row + data rows) ─────────────
// First non-empty row treated as headers.
// Looks for columns: dish/name, category, ingredient, weight/amount, instructions.

const COL_DISH_RE = /блюд|dish|наимен|название.*блюд/i
const COL_CAT_RE  = /катего|category/i
const COL_ING_RE  = /ингред|ingredient|продукт|сырьё/i
const COL_WT_RE   = /вес|нетто|вес.*нетто|нетто.*вес|weight|кол|amount|масса/i
const COL_INST_RE = /инстр|описани|технолог|приготовл|instruction/i

export function strategyColumnar(
  rows: string[][],
  sheetName: string,
): StrategyResult {
  // Find header row
  let headerIdx = -1
  let dishCol = -1, catCol = -1, ingCol = -1, wtCol = -1, instCol = -1

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r]
    const d = row.findIndex(c => COL_DISH_RE.test(c))
    const i = row.findIndex(c => COL_ING_RE.test(c))
    if (d !== -1 || i !== -1) {
      headerIdx = r
      dishCol = d
      catCol = row.findIndex(c => COL_CAT_RE.test(c))
      ingCol = i
      wtCol = row.findIndex(c => COL_WT_RE.test(c))
      instCol = row.findIndex(c => COL_INST_RE.test(c))
      break
    }
  }

  if (headerIdx === -1 || (dishCol === -1 && ingCol === -1)) {
    return { strategy: 'columnar', dishes: [], confidence: 0 }
  }

  const map = new Map<string, ParsedDish>()
  let parsedRows = 0, totalRows = 0

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.every(c => !c.trim())) continue
    totalRows++

    const dishName = (dishCol !== -1 ? row[dishCol] : '').trim()
    const category  = (catCol  !== -1 ? row[catCol]  : sheetName).trim() || sheetName
    const ingName   = (ingCol  !== -1 ? row[ingCol]  : '').trim()
    const wtRaw     = (wtCol   !== -1 ? row[wtCol]   : '').trim()
    const inst      = (instCol !== -1 ? row[instCol] : '').trim()

    if (!dishName && !ingName) continue

    const key = `${category.toLowerCase()}|||${dishName.toLowerCase()}`
    if (dishName && !map.has(key)) {
      map.set(key, {
        id: crypto.randomUUID(), name: dishName, category,
        kind: 'dish', instructions: inst || undefined, ingredients: [],
      })
    }

    const dish = map.get(key)
    if (dish && ingName && !isSkip(ingName)) {
      const w = parseWeight(wtRaw)
      dish.ingredients.push({
        ingredientName: normalizeIngredientName(ingName),
        netWeight: w?.amount ?? 0,
        unit: w?.unit ?? 'г',
      })
      if (inst && !dish.instructions) dish.instructions = inst
      parsedRows++
    }
  }

  const dishes = Array.from(map.values())
  const confidence = totalRows > 0
    ? Math.min(1, (parsedRows / totalRows) * (dishes.length > 0 ? 1 : 0) * 1.2)
    : 0

  return { strategy: 'columnar', dishes: dedup(dishes), confidence }
}

// ─── Strategy C: Single-row-per-dish ──────────────────────────
// Each row = one dish. Ingredients are in a single cell, separated by
// newlines, commas, or semicolons.  Weight may be embedded in the ingredient
// text ("Молоко 200мл", "Эспрессо 30г").
// Layout columns heuristic:
//   col 0 = dish name (or serial + name)
//   col 1 = portion / volume (optional, becomes variant label)
//   col 2 = ingredient list (multi-line cell)
//   col 3 = instructions (optional)

const ING_SPLIT_RE = /\n|;|(?<=[а-яёА-ЯЁa-zA-Z])\s*,\s*(?=[А-ЯЁA-Z])/

/** Try to parse "Ингредиент 200мл" or "Ингредиент – 200г" */
function parseInlineIngredient(raw: string): { name: string; amount: number; unit: 'г' | 'мл' | 'шт' } | null {
  const s = raw.trim()
  if (!s) return null
  // "Name – 200мл" or "Name 200г" or "Name: 200 г"
  const m = s.match(/^(.+?)\s*[-–—:]\s*(\d+[,.]?\d*)\s*(кг|л\b|мл|гр?|г|шот[аы]?|шт)\.?\s*(?:\(.*\))?\s*$/i)
    ?? s.match(/^(.+?)\s+(\d+[,.]?\d*)\s*(кг|л\b|мл|гр?|г|шот[аы]?|шт)\.?\s*(?:\(.*\))?\s*$/i)
  if (!m) return { name: normalizeIngredientName(s), amount: 0, unit: 'г' }
  const n = parseFloat(m[2].replace(',', '.'))
  const rawU = m[3].toLowerCase()
  let unit: 'г' | 'мл' | 'шт' = 'г'
  if (/кг/.test(rawU)) { return { name: normalizeIngredientName(m[1]), amount: n * 1000, unit: 'г' } }
  if (/^л$/.test(rawU)) { return { name: normalizeIngredientName(m[1]), amount: n * 1000, unit: 'мл' } }
  if (/мл/.test(rawU)) unit = 'мл'
  else if (/шот/.test(rawU)) unit = 'шт'
  else if (/шт/.test(rawU)) unit = 'шт'
  return { name: normalizeIngredientName(m[1]), amount: n, unit }
}

export function strategyPerRow(
  rows: string[][],
  sheetName: string,
): StrategyResult {
  // Heuristic: at least one cell per row has multi-ingredient content (newlines or long comma list)
  // OR ingredient column header found at top
  let parsedRows = 0, totalRows = 0
  const dishes: ParsedDish[] = []

  // Skip category header row (row 0 with only col 0 filled and no ingredient-like content)
  let startRow = 0
  for (let r = 0; r < Math.min(rows.length, 3); r++) {
    const row = rows[r]
    const nonEmpty = row.filter(c => c.trim())
    // Single filled cell that looks like a section header — skip it
    if (nonEmpty.length === 1 && /^[А-ЯЁ\s,]+$/.test(nonEmpty[0].trim()) && nonEmpty[0].trim().length > 3) {
      startRow = r + 1
    }
    if (row.some(c => isSkip(c) || /^(напит|блюд|наимен)/i.test(c.trim()))) {
      startRow = r + 1; break
    }
  }

  /** True if a cell looks like an ingredient list (not a volume/size column) */
  function looksLikeIngredients(cell: string): boolean {
    if (!cell.trim()) return false
    const lines = cell.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return false
    // Pure volume line: just "350 мл", "ТУ ГО 450мл", "Чайник 550мл" — no real ingredient name
    const pureVolumeRe = /^(ту\s*го|чайник|стакан)?\s*\d+\s*(мл|л)\s*\.?\s*$/i
    // Ingredient line: has a word (ingredient name) followed somewhere by a digit+unit
    const ingredientRe = /[а-яёА-ЯЁ]{3,}.{0,30}\d/
    const ingLines = lines.filter(l => ingredientRe.test(l) && !pureVolumeRe.test(l))
    const volLines = lines.filter(l => pureVolumeRe.test(l))
    // Treat as ingredients only if at least one ingredient-like line and
    // ingredient lines outnumber pure volume lines
    return ingLines.length > 0 && ingLines.length >= volLines.length
  }

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r]
    if (row.every(c => !c.trim())) continue
    totalRows++

    const col0 = row[0]?.trim() ?? ''

    // Skip rows where col 0 is ALL-CAPS category header (no other ingredient-like cols)
    if (/^[А-ЯЁ\s,\/\-–]+$/.test(col0) && col0.length > 4 && row.slice(1).every(c => !c.trim())) continue

    // col 0 is dish name (strip serial number)
    const dishName = stripSerial(col0)
    if (!dishName || isSkip(dishName)) continue

    // Find ingredient cell: scan cols 2, 3, 4 — take first that looks like ingredients
    // Fallback to col 1 if it has newlines (some formats put ingredients there)
    const col1 = row[1]?.trim() ?? ''
    let ingCell = ''
    let instCell = ''
    for (let ci = 2; ci <= 4; ci++) {
      const cell = row[ci]?.trim() ?? ''
      if (looksLikeIngredients(cell)) {
        ingCell = cell
        // Instruction is the next col after ingredients
        instCell = row[ci + 1]?.trim() ?? ''
        break
      }
    }
    if (!ingCell && (col1.includes('\n') || col1.includes(';'))) {
      ingCell = col1
    }
    if (!instCell) {
      // Try to find instruction in remaining cols (long text without weight patterns)
      for (let ci = 2; ci <= 5; ci++) {
        const cell = row[ci]?.trim() ?? ''
        if (cell.length > 30 && !looksLikeIngredients(cell)) { instCell = cell; break }
      }
    }

    // Take only the first variant block (before first double-newline)
    const firstVariantBlock = ingCell.split(/\n\s*\n/)[0] ?? ingCell

    const rawIngredients = firstVariantBlock
      ? firstVariantBlock.split(ING_SPLIT_RE).map(s => s.trim()).filter(Boolean)
      : []

    if (rawIngredients.length === 0 && !ingCell) continue

    const ingredients = rawIngredients
      .map(parseInlineIngredient)
      .filter((x): x is NonNullable<typeof x> => x !== null && x.name.length > 1)
      .map(x => ({ ingredientName: x.name, netWeight: x.amount, unit: x.unit }))

    dishes.push({
      id: crypto.randomUUID(),
      name: dishName,
      category: sheetName || 'Основное',
      kind: 'dish' as const,
      instructions: instCell || undefined,
      ingredients,
    })
    parsedRows++
  }

  const ingRatio = dishes.length > 0
    ? dishes.filter(d => d.ingredients.length > 0).length / dishes.length
    : 0

  const confidence = totalRows > 0
    ? (parsedRows / totalRows) * ingRatio
    : 0

  return { strategy: 'per-row', dishes: dedup(dishes), confidence }
}

// ─── Strategy D: Tabular sparse (Floo-style) ──────────────────
// Header row has column labels (Напиток / Состав / Приготовление).
// Dish name in col 1 only on first ingredient row (sparse — carry forward).
// Each subsequent row is one ingredient in col 3 ("Name - amount unit").
// Category in col 0 (sparse — carry forward).

export function strategyTabularSparse(
  rows: string[][],
  sheetName: string,
): StrategyResult {
  // Detect header row with "Состав" or "Напиток"/"Блюдо" column
  let headerIdx = -1
  let nameCol = -1, ingCol = -1, instCol = -1, catCol = -1

  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    const row = rows[r]
    const nc = row.findIndex(c => /напит|блюд|наимен/i.test(c))
    const ic = row.findIndex(c => /состав|ингред/i.test(c))
    if (ic !== -1) {
      headerIdx = r
      nameCol = nc !== -1 ? nc : (ic > 0 ? ic - 1 : -1)
      ingCol = ic
      catCol = nameCol > 0 ? nameCol - 1 : -1
      instCol = row.findIndex(c => /приготовл|инструк/i.test(c))
      break
    }
  }

  if (headerIdx === -1 || ingCol === -1) {
    return { strategy: 'tabular-sparse', dishes: [], confidence: 0 }
  }

  const dishes: ParsedDish[] = []
  let currentName = ''
  let currentCategory = sheetName
  let currentDish: ParsedDish | null = null
  let parsedRows = 0, totalRows = 0

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.every(c => !c.trim())) continue
    totalRows++

    const cat = catCol >= 0 ? row[catCol]?.trim() : ''
    const name = nameCol >= 0 ? row[nameCol]?.trim() : ''
    const ingRaw = ingCol >= 0 ? row[ingCol]?.trim() : ''
    const inst = instCol >= 0 ? row[instCol]?.trim() : ''

    if (cat) currentCategory = cat
    if (name && name !== currentName) {
      currentName = name
      currentDish = {
        id: crypto.randomUUID(),
        name: stripSerial(name),
        category: currentCategory,
        kind: /пф|заготовк|полуфабрик/i.test(name) ? 'preparation' : 'dish',
        instructions: inst || undefined,
        ingredients: [],
      }
      dishes.push(currentDish)
    }

    if (!currentDish || !ingRaw) continue

    const parsed = parseInlineIngredient(ingRaw)
    if (parsed && parsed.name.length > 1) {
      currentDish.ingredients.push({
        ingredientName: parsed.name,
        netWeight: parsed.amount,
        unit: parsed.unit,
      })
      if (inst && !currentDish.instructions) currentDish.instructions = inst
      parsedRows++
    }
  }

  const ingRatio = dishes.length > 0
    ? dishes.filter(d => d.ingredients.length > 0).length / dishes.length
    : 0
  const confidence = totalRows > 0 ? (parsedRows / totalRows) * ingRatio * 1.1 : 0

  return { strategy: 'tabular-sparse', dishes: dedup(dishes), confidence }
}

// ─── Orchestrator ──────────────────────────────────────────────

export function detectAndParse(
  rows: string[][],
  sheetName: string,
): StrategyResult {
  const results = [
    strategyHierarchical(rows, sheetName),
    strategyColumnar(rows, sheetName),
    strategyPerRow(rows, sheetName),
    strategyTabularSparse(rows, sheetName),
  ]

  // Pick the strategy with highest confidence and at least one dish
  const best = results
    .filter(r => r.dishes.length > 0)
    .sort((a, b) => b.confidence - a.confidence)[0]

  return best ?? { strategy: 'none', dishes: [], confidence: 0 }
}

// ─── Dedup helper ──────────────────────────────────────────────

function dedup(dishes: ParsedDish[]): ParsedDish[] {
  const seen = new Map<string, ParsedDish>()
  for (const d of dishes) {
    const k = d.name.toLowerCase()
    const ex = seen.get(k)
    if (ex) {
      ex.ingredients.push(...d.ingredients)
      if (!ex.instructions && d.instructions) ex.instructions = d.instructions
    } else {
      seen.set(k, d)
    }
  }
  return Array.from(seen.values())
}
