import type { Category, CompositionRow, IngredientRef, MenuItem } from '@/types'
import { resolveNutriFromComposition, resolveIngredientPer100 } from '@/lib/utils'

// ─── Public types ──────────────────────────────────────────────

export interface ParsedDish {
  /** Stable UUID assigned at parse time — use as React key */
  id: string
  name: string
  category: string
  /**
   * 'dish'        → MenuItem in a menu category
   * 'preparation' → composite IngredientRef in Мои ингредиенты (Pass 1)
   */
  kind: 'dish' | 'preparation'
  instructions?: string
  ingredients: Array<{ ingredientName: string; netWeight: number; unit: string }>
}

export interface ImportResult {
  dishes: ParsedDish[]
  errors: string[]
  /** Raw 2D string arrays per sheet — sent to /api/validate-ttk for AI correction. */
  rawSheets?: Array<{ name: string; rows: string[][] }>
}

export interface BuildResult {
  categories: Category[]
  /** Composite IngredientRefs built from preparations — save to MY_LIBRARY_ID */
  preparations: IngredientRef[]
  /** Placeholder mono IngredientRefs for unmatched raw ingredients — save to MY_LIBRARY_ID */
  newIngredients: IngredientRef[]
}

/** One library candidate shown to the user during the matching step. */
export interface IngredientCandidate {
  id: string
  name: string
  /** Dice similarity score [0..1] */
  score: number
}

/**
 * An ingredient from the import file that has similar-but-not-exact matches
 * in the library — needs user confirmation before import.
 */
export interface IngredientMatch {
  importedName: string    // normalized name as it came from the file
  normalizedKey: string   // importedName.toLowerCase() — key for the decisions map
  unit: string
  candidates: IngredientCandidate[]
  /** Pre-selected choice: candidate id (score ≥ 0.60) or 'new' */
  autoPreselect: string | 'new'
  /** Dishes (and their categories) that use this ingredient — for grouped UI display */
  usedByDishes: Array<{ name: string; category: string; kind: 'dish' | 'preparation' }>
  /**
   * True when the imported name is a generic oil term (e.g. "Растительное масло").
   * The UI should show ALL available oil candidates instead of the top-3.
   */
  isOilSubstitution?: boolean
}

// ─── Classification helpers ────────────────────────────────────

function isPreparationSheet(sheetName: string): boolean {
  return /заготовк|пф/i.test(sheetName)
}

function isPreparationItem(name: string): boolean {
  return /пф/i.test(name)
}

// ─── CSV template ──────────────────────────────────────────────

export const TEMPLATE_CSV =
  'Dish Name,Category,Ingredient Name,Net Weight (g),Instructions\n' +
  'Борщ,Супы,Свёкла,150,\n' +
  'Борщ,Супы,Картофель,100,\n' +
  'Борщ,Супы,Морковь,50,Подавать горячим со сметаной\n' +
  'Капучино,Напитки,Молоко,150,\n' +
  'Капучино,Напитки,Эспрессо,30,\n'

// ─── CSV columnar parser (header row + data rows) ─────────────

function normalizeColumnarRow(row: Record<string, unknown>): {
  dishName: string
  category: string
  ingredientName: string
  netWeight: number
  instructions: string
} {
  const str = (...keys: string[]) => {
    for (const k of keys) {
      const v = row[k] ?? row[k.toLowerCase()]
      if (v !== undefined && v !== null) return String(v).trim()
    }
    return ''
  }
  return {
    dishName: str('Dish Name', 'Название блюда', 'Блюдо', 'dish name'),
    category: str('Category', 'Категория', 'category'),
    ingredientName: str('Ingredient Name', 'Ingredient', 'Ингредиент', 'ingredient name'),
    netWeight: parseFloat(str('Net Weight (g)', 'Вес (г)', 'Вес', 'net weight (g)').replace(',', '.')) || 0,
    instructions: str('Instructions', 'Инструкции', 'Описание', 'instructions'),
  }
}

function groupColumnarRows(rawRows: Record<string, unknown>[]): ParsedDish[] {
  const map = new Map<string, ParsedDish>()
  for (const raw of rawRows) {
    const { dishName, category, ingredientName, netWeight, instructions } = normalizeColumnarRow(raw)
    if (!dishName || !category) continue
    const key = `${category.toLowerCase()}|||${dishName.toLowerCase()}`
    if (!map.has(key)) {
      const kind: 'dish' | 'preparation' =
        isPreparationSheet(category) || isPreparationItem(dishName) ? 'preparation' : 'dish'
      map.set(key, { id: crypto.randomUUID(), name: dishName, category, kind, instructions: instructions || undefined, ingredients: [] })
    }
    const dish = map.get(key)!
    if (ingredientName) dish.ingredients.push({ ingredientName, netWeight, unit: 'г' })
    if (instructions && !dish.instructions) dish.instructions = instructions
  }
  return Array.from(map.values())
}

// ─── TTK hierarchical XLSX parser ─────────────────────────────
// Layout: dish name (bold or first row after empty), ingredients below,
// quote-wrapped rows → instructions, empty rows → block separator.

/**
 * Extract the numeric amount and unit from a cell value.
 * - кг  → amount × 1000, unit 'г'
 * - л   → amount × 1000, unit 'мл'
 * - шт  → amount as-is,  unit 'шт'
 * - мл  → amount as-is,  unit 'мл'
 * - г/гр/default → amount as-is, unit 'г'
 * Ranges like "20/40" → first number. Returns { amount: 0 } when nothing found.
 */
function extractWeightAndUnit(raw: unknown): { amount: number; unit: 'г' | 'мл' | 'шт' } {
  if (raw == null || raw === '') return { amount: 0, unit: 'г' }
  if (typeof raw === 'number') return { amount: raw > 0 ? raw : 0, unit: 'г' }

  const s = String(raw).trim()
  // Take first numeric token (handles ranges like "120/100/100")
  const numMatch = s.match(/(\d+[,.]?\d*)/)
  if (!numMatch) return { amount: 0, unit: 'г' }
  const n = parseFloat(numMatch[1].replace(',', '.'))
  if (isNaN(n) || n <= 0) return { amount: 0, unit: 'г' }

  if (/[кК][гГ]/.test(s)) return { amount: n * 1000, unit: 'г' }
  if (/\bл\.?\s*$/i.test(s) && !/[мМ][лЛ]/.test(s)) return { amount: n * 1000, unit: 'мл' }
  if (/[мМ][лЛ]/.test(s)) return { amount: n, unit: 'мл' }
  if (/шт\.?/i.test(s)) return { amount: n, unit: 'шт' }
  return { amount: n, unit: 'г' }
}

/** Thin wrapper: just the numeric part (used where unit is irrelevant). */
function extractWeight(raw: unknown): number {
  return extractWeightAndUnit(raw).amount
}

/**
 * Clean an ingredient name:
 *  - strip ПФ prefix/suffix
 *  - strip parenthesised annotations: "(Италия)", "(охл.)", "(550 г)"
 *  - strip standalone quality abbreviations: охл, зам, с/м, конс, св, сух
 *  - strip "чищенный" variants
 *  - collapse whitespace
 */
export function normalizeIngredientName(raw: string): string {
  return raw
    .replace(/^\s*п\/ф\s*/i, '')                          // п/ф prefix
    .replace(/^\s*пф\s+/i, '')                            // ПФ prefix (standalone word)
    .replace(/\s+п\/ф\s*$/i, '')                          // п/ф suffix
    .replace(/\s+пф\s*$/i, '')                            // ПФ suffix
    .replace(/\s*\([^)]*\)/g, '')                         // (Италия) / (охл.) / (550 г)
    .replace(/\b(охл|зам|с\/м|конс|св|сух)\.?\b/gi, '')  // quality abbrevs
    .replace(/\bчищен\w*\b/gi, '')                        // чищенный / чищеная
    .replace(/\.+\s*$/, '')                               // trailing dots
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Try to extract a weight+unit embedded in the ingredient name itself.
 * Handles "Молоко 250гр", "Яйцо 2шт", "Масло 50г", "Сыр 1кг".
 * Returns null if no pattern found.
 */
function extractEmbeddedWeight(text: string): { cleanName: string; weight: number; unit: 'г' | 'мл' | 'шт' } | null {
  const m = text.match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(кг|л\b|мл|гр?|г|шт)\.?\s*$/i)
  if (!m) return null
  const n = parseFloat(m[2].replace(',', '.'))
  if (!n) return null
  const rawUnit = m[3].toLowerCase()
  if (/кг/.test(rawUnit)) return { cleanName: m[1].trim(), weight: n * 1000, unit: 'г' }
  if (/^л$/.test(rawUnit)) return { cleanName: m[1].trim(), weight: n * 1000, unit: 'мл' }
  if (/мл/.test(rawUnit)) return { cleanName: m[1].trim(), weight: n, unit: 'мл' }
  if (/шт/.test(rawUnit)) return { cleanName: m[1].trim(), weight: n, unit: 'шт' }
  return { cleanName: m[1].trim(), weight: n, unit: 'г' }
}

/** Rows to ignore entirely (column headers, totals, etc.) */
const SKIP_RE = /^(выход|итого|итог|всего|брутто|нетто|наименование|ингредиент|продукт|сырьё|№|n\s*п|расход|закладка)/i

function isSkipText(t: string): boolean {
  return SKIP_RE.test(t.trim())
}

/** Rows that map to dish.instructions rather than ingredients */
function isInstruction(t: string): boolean {
  const trimmed = t.trim()
  return (
    trimmed.startsWith('"') ||
    trimmed.startsWith('«') ||
    trimmed.startsWith('*') ||
    /технологи[яи]/i.test(trimmed) ||
    /приготовлени[яе]/i.test(trimmed)
  )
}

interface XLSXCell {
  v?: unknown
  s?: { font?: { bold?: boolean } }
}

interface XLSXRange {
  s: { r: number; c: number }
  e: { r: number; c: number }
}

interface XLSXUtils {
  decode_range(ref: string): XLSXRange
  encode_cell(cell: { r: number; c: number }): string
}

function parseTTKSheet(
  ws: Record<string, XLSXCell | unknown>,
  sheetName: string,
  utils: XLSXUtils,
): ParsedDish[] {
  const ref = (ws as { '!ref'?: string })['!ref']
  if (!ref) return []

  const sheetIsPrep = isPreparationSheet(sheetName)
  const category = sheetName || 'Основное'
  const range = utils.decode_range(ref)
  const dishes: ParsedDish[] = []
  let current: ParsedDish | null = null

  /** Flush the current dish into dishes[]. */
  function flushCurrent() {
    if (!current) return
    dishes.push(current)
    current = null
  }

  // ── State machine ────────────────────────────────────────────
  // Header detection is weight-based, NOT separator-based:
  //
  //   DISH HEADER  = col 0 has text AND all other cols are empty
  //                  (name-only row with no weight anywhere)
  //   INGREDIENT   = has a weight value in any of cols 1-6
  //                  OR embedded weight in the name itself
  //
  // This handles both layouts found in practice:
  //   Layout A (Заготовки / Яйца / БОУЛ): name in col 0, weight in col 3
  //   Layout B (Меню2+):                  name in col 1, weight in col 4,
  //                                        col 0 is empty for ingredient rows
  //
  // Empty rows are skipped — they are positional separators between the dish
  // name and its ingredients and must NOT trigger a flush.  A flush happens
  // only when a NEW dish header is encountered (or at end of sheet).

  for (let r = range.s.r; r <= range.e.r; r++) {
    // Collect cells for this row
    type RowCell = { text: string; rawVal: unknown; bold: boolean }
    const cols: RowCell[] = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = utils.encode_cell({ r, c })
      const cell = (ws as Record<string, XLSXCell>)[addr]
      const v = cell?.v
      cols.push({
        text: v != null && v !== '' ? String(v).trim() : '',
        rawVal: v,
        bold: cell?.s?.font?.bold === true,
      })
    }

    // Empty row → skip (do NOT flush; new headers trigger flush)
    if (cols.every(c => !c.text)) continue

    // Resolve which column holds the ingredient / dish name:
    //   col 0 if non-empty (Layout A + all headers)
    //   col 1 if col 0 is empty (Layout B ingredient rows)
    const nameColIdx = cols[0].text ? 0 : (cols[1]?.text ? 1 : -1)
    if (nameColIdx === -1) continue
    const nameRaw = cols[nameColIdx].text

    if (isSkipText(nameRaw)) continue

    // Explicit instruction rows (starts with " « * or keyword)
    if (isInstruction(nameRaw)) {
      if (current && !current.instructions) {
        current.instructions = nameRaw.replace(/^["«]|["»]$/g, '').trim()
      }
      continue
    }

    // ── Dish header detection ──────────────────────────────────
    // A header row has text ONLY in col 0; all other columns are empty.
    // Bold is an additional confirming signal but not required.
    const allOtherEmpty = cols.slice(1).every(c => !c.text)
    const isDishHeader = cols[0].text !== '' && allOtherEmpty

    if (isDishHeader) {
      flushCurrent()
      const kind: 'dish' | 'preparation' =
        sheetIsPrep || isPreparationItem(cols[0].text) ? 'preparation' : 'dish'
      current = { id: crypto.randomUUID(), name: cols[0].text, category, kind, ingredients: [] }
      continue
    }

    // ── Ingredient row ─────────────────────────────────────────
    if (!current) continue

    // Find weight+unit in cols 1-6 (Layout A: col 3 / Layout B: col 4)
    let amount = 0
    let unit: 'г' | 'мл' | 'шт' = 'г'
    let weightColIdx = -1
    for (let ci = 1; ci < cols.length && ci <= 6; ci++) {
      const wu = extractWeightAndUnit(cols[ci].rawVal)
      if (wu.amount > 0) { amount = wu.amount; unit = wu.unit; weightColIdx = ci; break }
    }

    // Look for instructions in any long-text cell (not the name or weight col)
    if (!current.instructions) {
      for (let ci = 0; ci < cols.length; ci++) {
        if (ci === nameColIdx || ci === weightColIdx) continue
        if (cols[ci].text.length > 30) {
          current.instructions = cols[ci].text
          break
        }
      }
    }

    // Try embedded weight+unit in name if no dedicated weight column found
    let ingredientName = cols[nameColIdx].text
    if (amount === 0) {
      const embedded = extractEmbeddedWeight(ingredientName)
      if (embedded) {
        ingredientName = embedded.cleanName
        amount = embedded.weight
        unit = embedded.unit
      }
    }

    // Normalize: strip ПФ prefix, quality suffixes, trailing dots
    ingredientName = normalizeIngredientName(ingredientName)
    if (!ingredientName) continue

    current.ingredients.push({ ingredientName, netWeight: amount, unit })
  }

  flushCurrent()

  // Deduplicate by name within sheet — merge ingredients from repeated blocks
  const seen = new Map<string, ParsedDish>()
  for (const d of dishes) {
    const k = d.name.toLowerCase()
    const existing = seen.get(k)
    if (existing) {
      existing.ingredients.push(...d.ingredients)
      if (!existing.instructions && d.instructions) existing.instructions = d.instructions
    } else {
      seen.set(k, d)
    }
  }
  return Array.from(seen.values())
}

// ─── Constructor / Modifier sheet parser ──────────────────────
// When a sheet name or content contains "Конструктор" / "Модификаторы",
// each non-empty cell in the grid is treated as a standalone ingredient/preparation.

function parseConstructorSheet(
  ws: Record<string, XLSXCell | unknown>,
  sheetName: string,
  utils: XLSXUtils,
): ParsedDish[] {
  const ref = (ws as { '!ref'?: string })['!ref']
  if (!ref) return []

  const range = utils.decode_range(ref)
  const seen = new Map<string, ParsedDish>()

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = utils.encode_cell({ r, c })
      const cell = (ws as Record<string, XLSXCell>)[addr]
      const v = cell?.v
      if (v == null || v === '') continue
      const raw = String(v).trim()
      if (!raw || isSkipText(raw)) continue
      const name = normalizeIngredientName(raw)
      if (!name || name.length < 2) continue
      const key = name.toLowerCase()
      if (!seen.has(key)) {
        seen.set(key, {
          id: crypto.randomUUID(),
          name,
          category: sheetName,
          kind: 'preparation',
          ingredients: [],
        })
      }
    }
  }

  return Array.from(seen.values())
}

// ─── Main parse entry point ────────────────────────────────────

export async function parseFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.csv')) {
    const text = await file.text()
    const Papa = (await import('papaparse')).default
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true })
    return {
      dishes: groupColumnarRows(result.data),
      errors: result.errors.slice(0, 5).map(e => e.message),
    }
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    // cellStyles: true → reads bold/italic font info for dish-header detection
    const wb = XLSX.read(new Uint8Array(buffer), { cellStyles: true })
    const dishes: ParsedDish[] = []
    const rawSheets: Array<{ name: string; rows: string[][] }> = []

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName] as Record<string, XLSXCell | unknown>
      const category = sheetName.trim() || 'Основное'

      // Capture raw rows for AI validation
      const wsTyped = ws as Record<string, unknown> & { '!ref'?: string }
      if (wsTyped['!ref']) {
        const XLSX2 = XLSX as { utils: XLSXUtils }
        const range = XLSX2.utils.decode_range(wsTyped['!ref'])
        const rows: string[][] = []
        for (let r = range.s.r; r <= range.e.r; r++) {
          const row: string[] = []
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX2.utils.encode_cell({ r, c })
            const cell = (ws as Record<string, XLSXCell>)[addr]
            const v = cell?.v
            row.push(v != null ? String(v).trim() : '')
          }
          rows.push(row)
        }
        rawSheets.push({ name: sheetName, rows })
      }

      // Route constructor / modifier sheets to the horizontal parser
      if (/конструктор|модификатор/i.test(sheetName)) {
        dishes.push(...parseConstructorSheet(ws, category, XLSX.utils))
      } else {
        dishes.push(...parseTTKSheet(ws, category, XLSX.utils))
      }
    }
    // Deduplicate across sheets by id
    const seenIds = new Map<string, ParsedDish>()
    for (const d of dishes) {
      if (seenIds.has(d.id)) {
        console.warn('[importer] duplicate id across sheets, skipping duplicate:', d.id, d.name)
      } else {
        seenIds.set(d.id, d)
      }
    }
    return { dishes: Array.from(seenIds.values()), errors: [], rawSheets }
  }

  return { dishes: [], errors: [`Неподдерживаемый формат файла: ${file.name}`] }
}

// ─── Smart ingredient matching ─────────────────────────────────

/** Sørensen–Dice coefficient on character bigrams — language-agnostic similarity [0..1]. */
function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2)
      m.set(bg, (m.get(bg) ?? 0) + 1)
    }
    return m
  }
  const aMap = bigrams(a)
  const bMap = bigrams(b)
  let intersection = 0
  for (const [bg, cnt] of aMap) {
    intersection += Math.min(cnt, bMap.get(bg) ?? 0)
  }
  return (2 * intersection) / (a.length - 1 + (b.length - 1))
}

/**
 * Returns true for common Russian adjective endings (ая, ое, ый, ой, ие, ые, ую…).
 * Used to identify the "qualifier" words vs the noun (main ingredient) in a name.
 */
function isRussianAdjective(word: string): boolean {
  return /(?:ая|ое|ый|ой|ие|ые|ую|его|ому|ем|им)$/.test(word)
}

/**
 * Noun-aware ingredient similarity score.
 *
 * Problem solved: "Красная икра" scored high against "Красная чечевица" via
 * bigram overlap on the shared adjective "красная", drowning out the fact that
 * the nouns ("икра" vs "чечевица") are completely different.
 *
 * Fix: split both strings into words, classify adjectives vs nouns, then:
 *  - If the noun sets overlap → small boost (+0.15, capped at 1.0)
 *  - If no noun is shared at all → heavy penalty (×0.55)
 *  - Single-word names or names with no identifiable nouns → raw Dice unchanged
 */
function weightedIngredientScore(query: string, candidate: string): number {
  const base = diceSimilarity(query, candidate)
  const words = (s: string) => s.split(/\s+/).filter(w => w.length >= 3)
  const nouns = (ws: string[]) => ws.filter(w => !isRussianAdjective(w))

  const nA = nouns(words(query))
  const nB = nouns(words(candidate))

  // Can't determine noun overlap → return raw score unchanged
  if (nA.length === 0 || nB.length === 0) return base

  const setNA = new Set(nA)
  const nounOverlap = nB.some(w => setNA.has(w))

  if (nounOverlap) return Math.min(1, base + 0.15)
  // No shared noun between the two names — likely a false match (e.g. adjective overlap)
  return base * 0.55
}

function fuzzyFind(name: string, refs: IngredientRef[]): IngredientRef | null {
  const norm = (s: string) => normalizeIngredientName(s).toLowerCase()
  const q = norm(name)
  if (!q) return null

  // 1. Exact match after normalization
  const exact = refs.find(r => norm(r.name) === q)
  if (exact) return exact

  // 2. Substring containment — only when the import name is LONGER (more specific)
  //    than the library ref, i.e. q contains rn.
  //    We intentionally do NOT check rn.includes(q) because that would silently
  //    map a generic term ("рис") to the first matching entry ("Рис для суши"),
  //    bypassing the user's ability to choose the right variant.
  const substr = refs.find(r => {
    const rn = norm(r.name)
    return rn.length >= 3 && q.includes(rn)
  })
  if (substr) return substr

  // 3. Noun-weighted Dice similarity ≥ 0.82 — catches minor typos / word-order
  //    differences while penalising adjective-only overlap ("красная икра" ≠ "красная чечевица")
  let best: IngredientRef | null = null
  let bestScore = 0.82
  for (const r of refs) {
    const rn = norm(r.name)
    // Fast pre-filter: skip if raw lengths differ by more than 40%
    if (Math.abs(rn.length - q.length) > Math.max(rn.length, q.length) * 0.4) continue
    const score = weightedIngredientScore(q, rn)
    if (score > bestScore) { bestScore = score; best = r }
  }
  return best
}

/** Resolve per-100g macros for a composition, normalising by total weight. */
function calcPer100(composition: CompositionRow[], allRefs: IngredientRef[]) {
  let cal = 0, pro = 0, fat = 0, car = 0, totalWeight = 0
  for (const row of composition) {
    if (!row.amount) continue
    const ref = allRefs.find(r => r.id === row.ingredientId)
    if (!ref) continue
    const n = resolveIngredientPer100(ref, allRefs)
    const effectiveGrams = (row.unit === 'шт' && ref.weightPerUnit)
      ? row.amount * ref.weightPerUnit
      : row.amount
    const ratio = effectiveGrams / 100
    cal += n.caloriesPer100 * ratio
    pro += n.proteinPer100 * ratio
    fat += n.fatPer100 * ratio
    car += n.carbsPer100 * ratio
    totalWeight += effectiveGrams
  }
  if (totalWeight === 0) return { caloriesPer100: 0, proteinPer100: 0, fatPer100: 0, carbsPer100: 0 }
  const norm = 100 / totalWeight
  return {
    caloriesPer100: Math.round(cal * norm),
    proteinPer100:  Math.round(pro * norm * 10) / 10,
    fatPer100:      Math.round(fat * norm * 10) / 10,
    carbsPer100:    Math.round(car * norm * 10) / 10,
  }
}

/**
 * Resolve or create a placeholder IngredientRef; mutates allRefs and newIngredients.
 * @param forceNew  When true, skip fuzzyFind and always create a new ref
 *                  (used when the user explicitly chose "Создать новый" in the matching step).
 *                  Still deduplicates against refs already created this session.
 */
function resolveOrCreateRef(
  ingredientName: string,
  unit: string,
  allRefs: IngredientRef[],
  newIngredients: IngredientRef[],
  forceNew = false,
): IngredientRef {
  if (!forceNew) {
    const existing = fuzzyFind(ingredientName, allRefs)
    if (existing) return existing
  } else {
    // Avoid creating duplicates for the same ingredient within one import run
    const normKey = normalizeIngredientName(ingredientName).toLowerCase()
    const alreadyCreated = newIngredients.find(
      r => normalizeIngredientName(r.name).toLowerCase() === normKey,
    )
    if (alreadyCreated) return alreadyCreated
  }
  const placeholder: IngredientRef = {
    id: crypto.randomUUID(),
    name: ingredientName,
    unit: (unit as IngredientRef['unit']) || 'г',
    caloriesPer100: 0,
    proteinPer100: 0,
    fatPer100: 0,
    carbsPer100: 0,
    isSystem: false,
    type: 'mono',
  }
  newIngredients.push(placeholder)
  allRefs.push(placeholder)
  return placeholder
}

// ─── Build categories + ingredients from parsed dishes ──────────
// Two-pass:
//   Pass 1 — preparations → composite IngredientRef (added to allRefs so Pass 2 can find them)
//   Pass 2 — dishes       → MenuItem in the right category

export function buildImportedCategories(
  dishes: ParsedDish[],
  allIngredients: IngredientRef[],
  existingCategories: Category[],
  resolutions: Map<string, 'skip' | 'overwrite'>,
  venueId: string,
  /** User decisions from the matching step: normalizedKey → existing refId | 'new' */
  ingredientResolutions?: Map<string, string | 'new'>,
): BuildResult {
  const cats: Category[] = existingCategories.map(c => ({ ...c, items: [...(c.items ?? [])] }))
  const preparations: IngredientRef[] = []
  const newIngredients: IngredientRef[] = [] // placeholder monos for unmatched raw ingredients
  const allRefs = [...allIngredients]

  /** Resolve one ingredient row respecting any user decision from the matching step. */
  function resolveRef(ingredientName: string, unit: string): IngredientRef {
    const normKey = normalizeIngredientName(ingredientName).toLowerCase()
    const decision = ingredientResolutions?.get(normKey)
    if (decision && decision !== 'new') {
      // User chose to link to an existing library ref
      return allRefs.find(r => r.id === decision)
        ?? resolveOrCreateRef(ingredientName, unit, allRefs, newIngredients)
    }
    // 'new' = force-create; undefined = normal fuzzy behaviour
    return resolveOrCreateRef(ingredientName, unit, allRefs, newIngredients, decision === 'new')
  }

  // ── Pass 1: preparations → composite IngredientRef ────────────
  for (const dish of dishes) {
    if (dish.kind !== 'preparation') continue

    const composition: CompositionRow[] = []
    for (const { ingredientName, netWeight, unit } of dish.ingredients) {
      const ref = resolveRef(ingredientName, unit)
      if (netWeight > 0) composition.push({ ingredientId: ref.id, amount: netWeight, unit: (unit as CompositionRow['unit']) || 'г' })
    }

    const per100 = calcPer100(composition, allRefs)

    // Reuse existing ID if a same-name ingredient already exists in allRefs
    const existingRef = allRefs.find(r => r.name.toLowerCase() === dish.name.toLowerCase())
    const prepRef: IngredientRef = {
      id: existingRef?.id ?? crypto.randomUUID(),
      name: dish.name,
      unit: 'г',
      ...per100,
      isSystem: false,
      type: 'composite',
      composition,
      instructions: dish.instructions,
    }

    // Replace or append in the working refs pool
    if (existingRef) {
      const idx = allRefs.indexOf(existingRef)
      allRefs[idx] = prepRef
    } else {
      allRefs.push(prepRef)
    }
    preparations.push(prepRef)
  }

  // ── Pass 2: dishes → MenuItem ──────────────────────────────────
  for (const dish of dishes) {
    if (dish.kind !== 'dish') continue
    const key = dishKey(dish)
    if (resolutions.get(key) === 'skip') continue

    // Find or create category
    let cat = cats.find(c => c.name.toLowerCase() === dish.category.toLowerCase())
    if (!cat) {
      cat = { id: crypto.randomUUID(), name: dish.category, venueId, order: cats.length, items: [] }
      cats.push(cat)
    }

    const existingIdx = (cat.items ?? []).findIndex(i => i.name.toLowerCase() === dish.name.toLowerCase())

    const composition: CompositionRow[] = []
    let totalWeight = 0
    for (const { ingredientName, netWeight, unit } of dish.ingredients) {
      const ref = resolveRef(ingredientName, unit)
      if (netWeight > 0) {
        composition.push({ ingredientId: ref.id, amount: netWeight, unit: (unit as CompositionRow['unit']) || 'г' })
        // шт items don't contribute to gram-based weight sum
        if (unit !== 'шт') totalWeight += netWeight
      }
    }

    const nutri = resolveNutriFromComposition(composition, allRefs, [], {})
    const item: MenuItem = {
      id: crypto.randomUUID(),
      name: dish.name,
      description: dish.instructions,
      weight: totalWeight,
      weightUnit: 'г',
      calories: nutri.calories,
      protein: nutri.protein,
      fat: nutri.fat,
      carbs: nutri.carbs,
      categoryId: cat.id,
      venueId,
      isAvailable: true,
      composition,
    }

    if (existingIdx !== -1) {
      cat.items = cat.items!.map((it, i) => (i === existingIdx ? item : it))
    } else {
      cat.items = [...(cat.items ?? []), item]
    }
  }

  // Final guard: ensure no category's items array has duplicate IDs
  // (can happen if existingCategories already contained duplicates)
  for (const cat of cats) {
    const seen = new Set<string>()
    cat.items = (cat.items ?? []).filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }

  return { categories: cats, preparations, newIngredients }
}

// ─── Detect conflicts against existing data ────────────────────
// Only dishes can conflict with menu categories; preparations always go to the ingredient library.

export function detectConflicts(dishes: ParsedDish[], existingCategories: Category[]): Set<string> {
  const conflicts = new Set<string>()
  for (const dish of dishes) {
    if (dish.kind === 'preparation') continue
    const key = dishKey(dish)
    const cat = existingCategories.find(c => c.name.toLowerCase() === dish.category.toLowerCase())
    if (cat?.items?.some(i => i.name.toLowerCase() === dish.name.toLowerCase())) {
      conflicts.add(key)
    }
  }
  return conflicts
}

export function dishKey(dish: ParsedDish): string {
  return `${dish.category.toLowerCase()}|||${dish.name.toLowerCase()}`
}

// ─── Ingredient matching step ──────────────────────────────────
// Scans imported dishes for ingredients that have fuzzy-but-not-exact
// matches in the library, so the user can confirm before import.

/** Regex that recognises generic vegetable/unspecified oil terms during import. */
const OIL_SUBSTITUTION_RE = /^(?:масло\s+растительн|растительн\w*\s+масл)/i

/**
 * Returns ingredients that need user confirmation:
 * - fuzzyFind would NOT auto-link them (no exact/high-confidence match)
 * - but noun-weighted Dice similarity ≥ 0.40 with at least one library entry,
 *   OR the name is a generic oil term (→ isOilSubstitution)
 *
 * Each result includes usedByDishes so the UI can render a grouped hierarchy:
 *   [Dish header] → [ingredient cards for that dish]
 *
 * Ingredients with no candidates and no oil flag are silently created as new refs.
 * Ingredients with an exact match are silently reused.
 */
export function detectIngredientMatches(
  dishes: ParsedDish[],
  allRefs: IngredientRef[],
): IngredientMatch[] {
  const norm = (s: string) => normalizeIngredientName(s).toLowerCase()

  // ── Collect unique ingredients; track which dishes use each ────
  const seen = new Map<string, {
    importedName: string
    unit: string
    usedByDishes: Array<{ name: string; category: string; kind: 'dish' | 'preparation' }>
  }>()

  for (const dish of dishes) {
    for (const { ingredientName, unit } of dish.ingredients) {
      const key = norm(ingredientName)
      if (!key) continue
      if (!seen.has(key)) {
        seen.set(key, { importedName: ingredientName, unit, usedByDishes: [] })
      }
      const entry = seen.get(key)!
      if (!entry.usedByDishes.some(d => d.name === dish.name && d.category === dish.category)) {
        entry.usedByDishes.push({ name: dish.name, category: dish.category, kind: dish.kind })
      }
    }
  }

  // ── Build dish-order index so matches sort by first-appearing dish ─
  const dishOrder = new Map<string, number>()
  dishes.forEach((d, i) => {
    const k = `${d.category}|||${d.name}`
    if (!dishOrder.has(k)) dishOrder.set(k, i)
  })

  const results: IngredientMatch[] = []

  for (const [normalizedKey, { importedName, unit, usedByDishes }] of seen) {
    // ── Special case: generic vegetable oil → show all oil options ──
    const isOil = OIL_SUBSTITUTION_RE.test(normalizedKey)
    if (isOil) {
      const oilCandidates: IngredientCandidate[] = allRefs
        .filter(r => /масл/i.test(r.name))
        .map(r => ({ id: r.id, name: r.name, score: 1.0 }))
      results.push({
        importedName,
        normalizedKey,
        unit,
        candidates: oilCandidates,
        autoPreselect: 'new',  // force user to choose which oil
        usedByDishes,
        isOilSubstitution: true,
      })
      continue
    }

    // Already matched (exact or auto-fuzzy) → handled silently
    if (fuzzyFind(importedName, allRefs) !== null) continue

    // Find candidates with noun-weighted Dice similarity ≥ 0.40
    const candidates: IngredientCandidate[] = allRefs
      .map(ref => ({
        id: ref.id,
        name: ref.name,
        score: weightedIngredientScore(normalizedKey, norm(ref.name)),
      }))
      .filter(c => c.score >= 0.40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    if (candidates.length === 0) continue // brand-new → no confirmation needed

    const autoPreselect: string | 'new' =
      candidates[0].score >= 0.60 ? candidates[0].id : 'new'

    results.push({ importedName, normalizedKey, unit, candidates, autoPreselect, usedByDishes })
  }

  // Sort matches so they appear in dish-first order
  results.sort((a, b) => {
    const keyA = a.usedByDishes[0]
      ? `${a.usedByDishes[0].category}|||${a.usedByDishes[0].name}` : ''
    const keyB = b.usedByDishes[0]
      ? `${b.usedByDishes[0].category}|||${b.usedByDishes[0].name}` : ''
    return (dishOrder.get(keyA) ?? 999) - (dishOrder.get(keyB) ?? 999)
  })

  return results
}
