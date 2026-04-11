import type { Category, CompositionRow, IngredientRef, MenuItem } from '@/types'
import { resolveNutriFromComposition } from '@/lib/utils'

// ─── Public types ──────────────────────────────────────────────

export interface ParsedDish {
  name: string
  category: string
  instructions?: string
  ingredients: Array<{ ingredientName: string; netWeight: number }>
}

export interface ImportResult {
  dishes: ParsedDish[]
  errors: string[]
}

export interface BuildResult {
  categories: Category[]
  newIngredients: IngredientRef[]
}

// ─── CSV template ──────────────────────────────────────────────

export const TEMPLATE_CSV =
  'Dish Name,Category,Ingredient Name,Net Weight (g),Instructions\n' +
  'Борщ,Супы,Свёкла,150,\n' +
  'Борщ,Супы,Картофель,100,\n' +
  'Борщ,Супы,Морковь,50,Подавать горячим со сметаной\n' +
  'Капучино,Напитки,Молоко,150,\n' +
  'Капучино,Напитки,Эспрессо,30,\n'

// ─── Parsing ───────────────────────────────────────────────────

function normalizeRow(row: Record<string, unknown>): {
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

function groupIntoDishes(rawRows: Record<string, unknown>[]): ParsedDish[] {
  const map = new Map<string, ParsedDish>()
  for (const raw of rawRows) {
    const { dishName, category, ingredientName, netWeight, instructions } = normalizeRow(raw)
    if (!dishName || !category) continue
    const key = `${category.toLowerCase()}|||${dishName.toLowerCase()}`
    if (!map.has(key)) {
      map.set(key, { name: dishName, category, instructions: instructions || undefined, ingredients: [] })
    }
    const dish = map.get(key)!
    if (ingredientName) {
      dish.ingredients.push({ ingredientName, netWeight })
    }
    if (instructions && !dish.instructions) dish.instructions = instructions
  }
  return Array.from(map.values())
}

export async function parseFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.csv')) {
    const text = await file.text()
    const Papa = (await import('papaparse')).default
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true })
    return {
      dishes: groupIntoDishes(result.data),
      errors: result.errors.slice(0, 5).map(e => e.message),
    }
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const wb = XLSX.read(new Uint8Array(buffer))
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
    return { dishes: groupIntoDishes(rows), errors: [] }
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

// ─── Build categories from parsed dishes ───────────────────────

export function buildImportedCategories(
  dishes: ParsedDish[],
  allIngredients: IngredientRef[],
  existingCategories: Category[],
  resolutions: Map<string, 'skip' | 'overwrite'>,
  venueId: string,
): BuildResult {
  const cats: Category[] = existingCategories.map(c => ({ ...c, items: [...(c.items ?? [])] }))
  const newIngredients: IngredientRef[] = []
  const allRefs = [...allIngredients]

  for (const dish of dishes) {
    const key = `${dish.category.toLowerCase()}|||${dish.name.toLowerCase()}`
    if (resolutions.get(key) === 'skip') continue

    // Find or create category
    let cat = cats.find(c => c.name.toLowerCase() === dish.category.toLowerCase())
    if (!cat) {
      cat = { id: crypto.randomUUID(), name: dish.category, venueId, order: cats.length, items: [] }
      cats.push(cat)
    }

    const existingIdx = (cat.items ?? []).findIndex(i => i.name.toLowerCase() === dish.name.toLowerCase())

    // Build composition with smart matching
    const composition: CompositionRow[] = []
    let totalWeight = 0

    for (const { ingredientName, netWeight } of dish.ingredients) {
      let ref = fuzzyFind(ingredientName, allRefs)
      if (!ref) {
        // Create placeholder mono ingredient
        ref = {
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
        newIngredients.push(ref)
        allRefs.push(ref)
      }
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

  return { categories: cats, newIngredients }
}

// ─── Detect conflicts against existing data ────────────────────

export function detectConflicts(dishes: ParsedDish[], existingCategories: Category[]): Set<string> {
  const conflicts = new Set<string>()
  for (const dish of dishes) {
    const key = `${dish.category.toLowerCase()}|||${dish.name.toLowerCase()}`
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
