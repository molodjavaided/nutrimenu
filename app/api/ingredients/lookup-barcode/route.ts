import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getEffectiveVenueId, getSession } from '@/lib/auth'

interface OffNutriments {
  'energy-kcal_100g'?: number
  'energy-kcal'?: number
  proteins_100g?: number
  fat_100g?: number
  carbohydrates_100g?: number
}
interface OffProduct {
  product_name_ru?: string
  product_name?: string
  brands?: string
  nutriments?: OffNutriments
}
interface OffResponse { status?: number; product?: OffProduct }

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const venueId = getEffectiveVenueId(session)

  const code = (req.nextUrl.searchParams.get('code') ?? '').trim()
  if (!code || !/^[0-9]{6,14}$/.test(code)) {
    return NextResponse.json({ error: 'Некорректный штрих-код' }, { status: 400 })
  }

  // Level 1: local DB (this venue's catalog or system refs)
  const localRef = await db.ingredientRef.findFirst({
    where: {
      barcode: code,
      OR: [{ venueId }, { isSystem: true }],
    },
  })
  if (localRef) {
    return NextResponse.json({ source: 'local', ref: localRef })
  }

  // Level 2: Open Food Facts
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`, {
      headers: { 'User-Agent': 'Plate-NutriMenu/1.0 (yurchik.yuri.ru@gmail.com)' },
      // Cache for a few hours on the edge — barcode → product is stable
      next: { revalidate: 60 * 60 * 6 },
    })
    if (res.ok) {
      const data = (await res.json()) as OffResponse
      if (data.status === 1 && data.product) {
        const p = data.product
        const n = p.nutriments ?? {}
        const name = (p.product_name_ru || p.product_name || '').trim()
        const brand = (p.brands || '').split(',')[0]?.trim()
        return NextResponse.json({
          source: 'off',
          barcode: code,
          prefill: {
            name: brand && name && !name.toLowerCase().includes(brand.toLowerCase())
              ? `${name} (${brand})`
              : name,
            caloriesPer100: Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0),
            proteinPer100: Math.round((n.proteins_100g ?? 0) * 10) / 10,
            fatPer100: Math.round((n.fat_100g ?? 0) * 10) / 10,
            carbsPer100: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
          },
        })
      }
    }
  } catch (err) {
    console.error('[lookup-barcode] OFF fetch failed:', err)
  }

  // Level 3: not found — client should open empty form with this barcode
  return NextResponse.json({ source: 'manual', barcode: code }, { status: 404 })
}
