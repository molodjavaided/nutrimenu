/**
 * Few-shot TTK example store — localStorage.
 *
 * After each confirmed import we save a sample of (raw rows → parsed dishes).
 * These examples are included in Gemini prompts so the model learns the
 * specific TTK format used by this venue.
 */

const STORAGE_KEY = 'nutrimenu_ttk_examples'
const MAX_EXAMPLES = 8

export interface TTKExample {
  id: string
  savedAt: number
  sheetName: string
  /** First 40 raw rows (tab-separated source). Empty when parsed from PDF/image. */
  rowsSample: string[][]
  /** Up to 5 successfully imported dishes with their ingredients. */
  dishesSample: Array<{
    name: string
    kind: 'dish' | 'preparation'
    ingredients: Array<{ ingredientName: string; netWeight: number; unit: string }>
  }>
}

export function getTTKExamples(): TTKExample[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveTTKExample(
  sheetName: string,
  rowsSample: string[][] | null,
  dishes: Array<{
    name: string
    kind: 'dish' | 'preparation'
    ingredients: Array<{ ingredientName: string; netWeight: number; unit: string }>
  }>,
): void {
  if (typeof window === 'undefined' || dishes.length === 0) return
  const existing = getTTKExamples()
  const entry: TTKExample = {
    id: crypto.randomUUID(),
    savedAt: Date.now(),
    sheetName,
    rowsSample: rowsSample ? rowsSample.slice(0, 40) : [],
    dishesSample: dishes.slice(0, 5),
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([entry, ...existing].slice(0, MAX_EXAMPLES)),
  )
}
