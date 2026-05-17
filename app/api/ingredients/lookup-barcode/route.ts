import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getEffectiveVenueId, getSession } from '@/lib/auth'
import { lookupBarcodeViaSonar } from '@/lib/sonar-barcode'

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

  // Level 1: local IngredientRef
  const localRef = await db.ingredientRef.findFirst({
    where: { barcode: code, OR: [{ venueId }, { isSystem: true }] },
  })
  if (localRef) return NextResponse.json({ source: 'local', ref: localRef })

  // Level 2: BarcodeCache
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

  // Level 3: Perplexity Sonar Pro via OpenRouter
  const result = await lookupBarcodeViaSonar(code)
  const usedSource = 'sonar' as const

  if (result.status === 'transient') {
    console.error('[lookup-barcode] sonar transient-failed for', code, result.reason)
    return NextResponse.json(
      { source: 'transient', barcode: code, error: 'AI временно недоступен, попробуйте ещё раз' },
      { status: 503 },
    )
  }

  // Persist (positive or real negative)
  const row = result.status === 'found'
    ? {
        name: result.name,
        brand: result.brand ?? null,
        manufacturer: result.manufacturer ?? null,
        category: result.category ?? null,
        packageSize: result.packageSize ?? null,
        calories: result.calories ?? null,
        protein: result.protein ?? null,
        fat: result.fat ?? null,
        carbs: result.carbs ?? null,
        ingredients: result.ingredients ?? null,
        confidence: result.confidence,
        source: usedSource,
        found: true,
      }
    : {
        name: null, brand: null, manufacturer: null, category: null, packageSize: null,
        calories: null, protein: null, fat: null, carbs: null, ingredients: null,
        confidence: 'low', source: usedSource, found: false,
      }

  await db.barcodeCache.upsert({
    where: { barcode: code },
    update: { ...row, fetchedAt: new Date() },
    create: { barcode: code, ...row },
  })

  if (result.status !== 'found') {
    return NextResponse.json({ source: 'manual', barcode: code }, { status: 404 })
  }

  return NextResponse.json({
    source: usedSource,
    barcode: code,
    confidence: result.confidence,
    prefill: buildPrefill({
      name: result.name,
      brand: result.brand ?? null,
      manufacturer: result.manufacturer ?? null,
      category: result.category ?? null,
      packageSize: result.packageSize ?? null,
      calories: result.calories ?? null,
      protein: result.protein ?? null,
      fat: result.fat ?? null,
      carbs: result.carbs ?? null,
      ingredients: result.ingredients ?? null,
    }),
  })
}

type CacheRow = {
  name: string | null
  brand: string | null
  manufacturer: string | null
  category: string | null
  packageSize: string | null
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  ingredients: string | null
}

function buildPrefill(c: CacheRow) {
  const name = c.name ?? ''
  const brand = c.brand ?? ''
  const displayName = brand && name && !name.toLowerCase().includes(brand.toLowerCase())
    ? `${name} (${brand})`
    : name
  return {
    name: displayName,
    // null when AI didn't know — frontend treats null as "leave blank, user fills"
    caloriesPer100: c.calories != null ? Math.round(c.calories) : null,
    proteinPer100: c.protein != null ? Math.round(c.protein * 10) / 10 : null,
    fatPer100: c.fat != null ? Math.round(c.fat * 10) / 10 : null,
    carbsPer100: c.carbs != null ? Math.round(c.carbs * 10) / 10 : null,
    compositionText: c.ingredients ?? '',
    manufacturer: c.manufacturer ?? '',
    category: c.category ?? '',
    packageSize: c.packageSize ?? '',
  }
}

function prefillFromCache(c: CacheRow) {
  return buildPrefill(c)
}
