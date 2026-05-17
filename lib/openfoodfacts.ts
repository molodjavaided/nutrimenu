/**
 * Open Food Facts lookup — free, deterministic, no auth. Coverage on Russian
 * products is ~10-15%, but when a record exists with full nutrition it's
 * authoritative (data comes from scanned package labels). Used as primary
 * before falling back to the LLM-based Sonar lookup.
 */

import type { BarcodeLookupResult } from './sonar-barcode'

const UA = 'NutriMenu/1.0 (https://nutrimenu.app)'
const FIELDS = 'product_name,product_name_ru,brands,categories,quantity,nutriments,ingredients_text,ingredients_text_ru'

export async function lookupBarcodeViaOFF(code: string): Promise<BarcodeLookupResult> {
  let res: Response
  try {
    res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) },
    )
  } catch (err) {
    console.warn('[off] fetch failed:', err)
    return { status: 'transient', reason: 'fetch-failed' }
  }
  if (!res.ok) return { status: 'transient', reason: `http-${res.status}` }

  type OFFResponse = {
    status?: number
    product?: {
      product_name?: string
      product_name_ru?: string
      brands?: string
      categories?: string
      quantity?: string
      nutriments?: Record<string, number | undefined>
      ingredients_text?: string
      ingredients_text_ru?: string
    }
  }
  const data = (await res.json().catch(() => null)) as OFFResponse | null
  if (!data || data.status !== 1 || !data.product) return { status: 'not_found' }

  const p = data.product
  const n = p.nutriments ?? {}
  const name = (p.product_name_ru || p.product_name || '').trim()
  const brand = (p.brands ?? '').split(',')[0]?.trim() || undefined

  // OFF often returns half-records — name without nutrition. Only treat as
  // "found" when we have a name AND at least calories (the most reported field).
  // Anything less and we let Sonar try.
  if (!name || typeof n['energy-kcal_100g'] !== 'number') {
    return { status: 'not_found' }
  }

  return {
    status: 'found',
    name,
    brand,
    category: (p.categories ?? '').split(',')[0]?.trim() || undefined,
    packageSize: p.quantity?.trim() || undefined,
    calories: n['energy-kcal_100g'],
    protein: typeof n['proteins_100g'] === 'number' ? n['proteins_100g'] : undefined,
    fat: typeof n['fat_100g'] === 'number' ? n['fat_100g'] : undefined,
    carbs: typeof n['carbohydrates_100g'] === 'number' ? n['carbohydrates_100g'] : undefined,
    ingredients: (p.ingredients_text_ru || p.ingredients_text || '').trim() || undefined,
    // OFF data comes from scanned packages — high confidence when it exists.
    confidence: 'high',
  }
}
