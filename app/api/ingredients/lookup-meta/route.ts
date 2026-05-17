import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { lookupIngredientMeta } from '@/lib/gemini-ingredient-meta'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const name = (req.nextUrl.searchParams.get('name') ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const result = await lookupIngredientMeta(name)
  if (result.status === 'ok') {
    return NextResponse.json({ ok: true, source: result.source, meta: result.meta })
  }
  if (result.status === 'not_found') {
    return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 })
  }
  return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 })
}
