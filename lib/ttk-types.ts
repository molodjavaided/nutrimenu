export interface ParsedDish {
  id: string
  name: string
  category: string
  kind: 'dish' | 'preparation'
  instructions?: string
  ingredients: Array<{ ingredientName: string; netWeight: number; unit: string }>
}

export function normalizeIngredientName(raw: string): string {
  return raw
    .replace(/^\s*п\/ф\s*/i, '')
    .replace(/^\s*пф\s+/i, '')
    .replace(/\s+п\/ф\s*$/i, '')
    .replace(/\s+пф\s*$/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\b(охл|зам|с\/м|конс|св|сух)\.?\b/gi, '')
    .replace(/\bчищен\w*\b/gi, '')
    .replace(/\.+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}
