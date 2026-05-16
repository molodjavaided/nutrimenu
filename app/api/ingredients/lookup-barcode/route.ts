import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getEffectiveVenueId, getSession } from '@/lib/auth'
import { lookupBarcodeViaGemini } from '@/lib/gemini-barcode'

// Positive results are stable — cache for a month. Negative results may be
// transient (Gemini missed it once), so re-try them after a day.
const CACHE_TTL_POSITIVE_MS = 1000 * 60 * 60 * 24 * 30
const CACHE_TTL_NEGATIVE_MS = 1000 * 60 * 60 * 24

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const code = (req.nextUrl.searchParams.get('code') ?? '').trim()
  const force = req.nextUrl.searchParams.get('force') === '1'
  if (!code || !/^[0-9]{6,14}$/.test(code)) {
    return NextResponse.json({ error: 'Некорректный штрих-код' }, { status: 400 })
  }

  // Level 1: local IngredientRef (this venue or system)
  const localRef = await db.ingredientRef.findFirst({
    where: {
      barcode: code,
      OR: [{ venueId }, { isSystem: true }],
    },
  })
  if (localRef) {
    return NextResponse.json({ source: 'local', ref: localRef })
  }

  // Level 2: BarcodeCache (shared across venues). Skip when force=1.
  const cached = force ? null : await db.barcodeCache.findUnique({ where: { barcode: code } })
  const ttl = cached?.found ? CACHE_TTL_POSITIVE_MS : CACHE_TTL_NEGATIVE_MS
  if (cached && Date.now() - cached.fetchedAt.getTime() < ttl) {
    if (!cached.found) {
      return NextResponse.json({ source: 'manual', barcode: code }, { status: 404 })
    }
    return NextResponse.json({
      source: 'cache',
      barcode: code,
      confidence: cached.confidence,
      prefill: prefillFromCache(cached),
    })
  }

  // Level 3: Gemini with Google Search grounding
  const result = await lookupBarcodeViaGemini(code)

  // Save into cache (positive or negative)
  await db.barcodeCache.upsert({
    where: { barcode: code },
    update: {
      name: result.name ?? null,
      brand: result.brand ?? null,
      calories: result.calories ?? null,
      protein: result.protein ?? null,
      fat: result.fat ?? null,
      carbs: result.carbs ?? null,
      ingredients: result.ingredients ?? null,
      confidence: result.confidence,
      source: 'gemini',
      found: result.found,
      fetchedAt: new Date(),
    },
    create: {
      barcode: code,
      name: result.name ?? null,
      brand: result.brand ?? null,
      calories: result.calories ?? null,
      protein: result.protein ?? null,
      fat: result.fat ?? null,
      carbs: result.carbs ?? null,
      ingredients: result.ingredients ?? null,
      confidence: result.confidence,
      source: 'gemini',
      found: result.found,
    },
  })

  if (!result.found) {
    return NextResponse.json({ source: 'manual', barcode: code }, { status: 404 })
  }

  return NextResponse.json({
    source: 'gemini',
    barcode: code,
    confidence: result.confidence,
    prefill: {
      name: result.brand && result.name && !result.name.toLowerCase().includes(result.brand.toLowerCase())
        ? `${result.name} (${result.brand})`
        : (result.name ?? ''),
      caloriesPer100: Math.round(result.calories ?? 0),
      proteinPer100: Math.round((result.protein ?? 0) * 10) / 10,
      fatPer100: Math.round((result.fat ?? 0) * 10) / 10,
      carbsPer100: Math.round((result.carbs ?? 0) * 10) / 10,
      compositionText: result.ingredients ?? '',
    },
  })
}

function prefillFromCache(c: {
  name: string | null
  brand: string | null
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  ingredients: string | null
}) {
  const name = c.name ?? ''
  const brand = c.brand ?? ''
  return {
    name: brand && name && !name.toLowerCase().includes(brand.toLowerCase())
      ? `${name} (${brand})`
      : name,
    caloriesPer100: Math.round(c.calories ?? 0),
    proteinPer100: Math.round((c.protein ?? 0) * 10) / 10,
    fatPer100: Math.round((c.fat ?? 0) * 10) / 10,
    carbsPer100: Math.round((c.carbs ?? 0) * 10) / 10,
    ingredients: c.ingredients ?? '',
  }
}
