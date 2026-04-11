import type { Category, CompositionRow, IngredientRef, MenuItem } from '@/types'
import { resolveNutriFromComposition, resolveIngredientPer100 } from '@/lib/utils'

// ─── Public types ──────────────────────────────────────────────

export interface ParsedDish {
  name: string
  category: string
  /**
   * 'dish'        → MenuItem in a menu category
   * 'preparation' → composite IngredientRef in Мои ингредиенты (Pass 1)
   */
  kind: 'dish' | 'preparation'
  instructions?: string
  ingredients: Array<{ ingredientName: string; netWeight: number }>
}

export interface ImportResult {
  dishes: ParsedDish[]
  errors: string[]
}

export interface BuildResult {
  categories: Category[]
  /** Composite IngredientRefs built from preparations — save to MY_LIBRARY_ID */
  preparations: IngredientRef[]
  /** Placeholder mono IngredientRefs for unmatched raw ingredients — save to MY_LIBRARY_ID */
  newIngredients: IngredientRef[]
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
      map.set(key, { name: dishName, category, kind, instructions: instructions || undefined, ingredients: [] })
    }
    const dish = map.get(key)!
    if (ingredientName) dish.ingredients.push({ ingredientName, netWeight })
    if (instructions && !dish.instructions) dish.instructions = instructions
  }
  return Array.from(map.values())
}

// ─── TTK hierarchical XLSX parser ─────────────────────────────
// Layout: dish name (bold or first row after empty), ingredients below,
// quote-wrapped rows → instructions, empty rows → block separator.

/** Extract the first numeric value from a cell, ignoring unit suffixes. */
function extractWeight(raw: unknown): number {
  if (typeof raw === 'number') return raw > 0 ? raw : 0
  if (raw == null || raw === '') return 0
  const s = String(raw)
    .replace(/[кК][гГ]/g, 'e3') // "кг" → multiply by 1000 handled below
    .replace(/[гГ][рР]\.?|[гГ]\.?(?!\d)|[мМ][лЛ]\.?|шт\.?/gi, '')
    .trim()
  // Ranges like "20/40" → take first number
  const m = s.match(/(\d+[,.]?\d*)/)
  if (!m) return 0
  const n = parseFloat(m[1].replace(',', '.'))
  return isNaN(n) ? 0 : n
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
  let lastWasEmpty = true // start in "expecting dish" state → skip leading empties

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

    // Empty row → flush current dish, reset state
    if (cols.every(c => !c.text)) {
      if (current) { dishes.push(current); current = null }
      lastWasEmpty = true
      continue
    }

    const first = cols[0]
    if (!first.text) continue // leading empty cell in row (merged / indent)

    // Determine if this row is a new dish header
    const isHeader = lastWasEmpty || first.bold

    if (isHeader) {
      // Column-header rows ("Наименование", "Нетто", etc.) are skipped but keep
      // lastWasEmpty = true so the very next content row is still treated as a dish name.
      if (isSkipText(first.text)) continue
      lastWasEmpty = false
      if (current) dishes.push(current)
      const kind: 'dish' | 'preparation' =
        sheetIsPrep || isPreparationItem(first.text) ? 'preparation' : 'dish'
      current = { name: first.text, category, kind, ingredients: [] }
      continue
    }

    lastWasEmpty = false

    // Inside a dish
    if (!current) continue
    if (isSkipText(first.text)) continue

    if (isInstruction(first.text)) {
      if (!current.instructions) {
        current.instructions = first.text.replace(/^["«]|["»]$/g, '').trim()
      }
      continue
    }

    // Ingredient row — find weight in cols 1..5
    let weight = 0
    for (let ci = 1; ci < cols.length && ci <= 5; ci++) {
      const w = extractWeight(cols[ci].rawVal)
      if (w > 0) { weight = w; break }
    }
    current.ingredients.push({ ingredientName: first.text, netWeight: weight })
  }

  if (current) dishes.push(current)
  return dishes
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
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName] as Record<string, XLSXCell | unknown>
      const category = sheetName.trim() || 'Основное'
      dishes.push(...parseTTKSheet(ws, category, XLSX.utils))
    }
    return { dishes, errors: [] }
  }

  return { dishes: [], errors: [`Неподдерживаемый формат файла: ${file.name}`] }
}

// ─── Smart ingredient matching ─────────────────────────────────

function fuzzyFind(name: string, refs: IngredientRef[]): IngredientRef | null {
  const q = name.toLowerCase().trim()
  return (
    refs.find(r => r.name.toLowerCase() === q) ??
    refs.find(r => r.name.toLowerCase().includes(q) || q.includes(r.name.toLowerCase())) ??
    null
  )
}

/** Resolve per-100g macros for a composition, normalising by total weight. */
function calcPer100(composition: CompositionRow[], allRefs: IngredientRef[]) {
  let cal = 0, pro = 0, fat = 0, car = 0, totalWeight = 0
  for (const row of composition) {
    if (!row.amount) continue
    const ref = allRefs.find(r => r.id === row.ingredientId)
    if (!ref) continue
    const n = resolveIngredientPer100(ref, allRefs)
    const ratio = row.amount / 100
    cal += n.caloriesPer100 * ratio
    pro += n.proteinPer100 * ratio
    fat += n.fatPer100 * ratio
    car += n.carbsPer100 * ratio
    totalWeight += row.amount
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

/** Resolve or create a placeholder IngredientRef; mutates allRefs and newIngredients. */
function resolveOrCreateRef(
  ingredientName: string,
  allRefs: IngredientRef[],
  newIngredients: IngredientRef[],
): IngredientRef {
  const existing = fuzzyFind(ingredientName, allRefs)
  if (existing) return existing
  const placeholder: IngredientRef = {
    id: crypto.randomUUID(),
    name: ingredientName,
    unit: 'г',
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
): BuildResult {
  const cats: Category[] = existingCategories.map(c => ({ ...c, items: [...(c.items ?? [])] }))
  const preparations: IngredientRef[] = []
  const newIngredients: IngredientRef[] = [] // placeholder monos for unmatched raw ingredients
  const allRefs = [...allIngredients]

  // ── Pass 1: preparations → composite IngredientRef ────────────
  for (const dish of dishes) {
    if (dish.kind !== 'preparation') continue

    const composition: CompositionRow[] = []
    for (const { ingredientName, netWeight } of dish.ingredients) {
      const ref = resolveOrCreateRef(ingredientName, allRefs, newIngredients)
      if (netWeight > 0) composition.push({ ingredientId: ref.id, amount: netWeight, unit: 'г' })
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
    for (const { ingredientName, netWeight } of dish.ingredients) {
      const ref = resolveOrCreateRef(ingredientName, allRefs, newIngredients)
      if (netWeight > 0) {
        composition.push({ ingredientId: ref.id, amount: netWeight, unit: 'г' })
        totalWeight += netWeight
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
