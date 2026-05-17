/**
 * Mirror a user-verified ingredient back into the shared BarcodeCache so
 * the next scan of the same barcode (by any venue) gets the corrected data
 * instead of re-querying OFF/Sonar and possibly getting the same wrong AI guess.
 *
 * The cache treats source='user' as the highest trust tier — it's overwritten
 * only by another user-verified save. AI sources can never overwrite a user
 * entry (logic lives in lookup-barcode route — see refreshFromAI guard).
 */

import { db } from './db'

export async function mirrorIngredientToCache(args: {
  barcode: string | null | undefined
  name: string
  brand?: string | null
  manufacturer?: string | null
  category?: string | null
  packageSize?: string | null
  caloriesPer100?: number
  proteinPer100?: number
  fatPer100?: number
  carbsPer100?: number
  compositionText?: string | null
}) {
  const barcode = args.barcode?.trim()
  if (!barcode || !/^[0-9]{6,14}$/.test(barcode)) return
  // Don't poison the cache with empty placeholders
  if (!args.name?.trim()) return

  try {
    await db.barcodeCache.upsert({
      where: { barcode },
      update: {
        name: args.name,
        brand: args.brand ?? null,
        manufacturer: args.manufacturer ?? null,
        category: args.category ?? null,
        packageSize: args.packageSize ?? null,
        calories: typeof args.caloriesPer100 === 'number' ? args.caloriesPer100 : null,
        protein: typeof args.proteinPer100 === 'number' ? args.proteinPer100 : null,
        fat: typeof args.fatPer100 === 'number' ? args.fatPer100 : null,
        carbs: typeof args.carbsPer100 === 'number' ? args.carbsPer100 : null,
        ingredients: args.compositionText ?? null,
        confidence: 'high',
        source: 'user',
        found: true,
        fetchedAt: new Date(),
      },
      create: {
        barcode,
        name: args.name,
        brand: args.brand ?? null,
        manufacturer: args.manufacturer ?? null,
        category: args.category ?? null,
        packageSize: args.packageSize ?? null,
        calories: typeof args.caloriesPer100 === 'number' ? args.caloriesPer100 : null,
        protein: typeof args.proteinPer100 === 'number' ? args.proteinPer100 : null,
        fat: typeof args.fatPer100 === 'number' ? args.fatPer100 : null,
        carbs: typeof args.carbsPer100 === 'number' ? args.carbsPer100 : null,
        ingredients: args.compositionText ?? null,
        confidence: 'high',
        source: 'user',
        found: true,
      },
    })
  } catch (err) {
    // Cache mirroring is best-effort — never block the main save on it
    console.warn('[barcode-cache-mirror] upsert failed:', err)
  }
}
