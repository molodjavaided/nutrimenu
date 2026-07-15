import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { lookupIngredientMeta } from '@/lib/gemini-ingredient-meta'
import { enforceRateLimit } from '@/lib/api-guard'
import { aiLookupRatelimit } from '@/lib/ratelimit'
import { getLookupQuota, bumpLookupCount } from '@/lib/ai-lookup-quota'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = await enforceRateLimit(aiLookupRatelimit, `ailookup:${session.userId}`)
  if (limited) return limited

  const name = (req.nextUrl.searchParams.get('name') ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  // Мета — всегда платный AI-вызов: гейтим месячной квотой.
  const quota = await getLookupQuota(session)
  if (quota.remaining <= 0) {
    return NextResponse.json(
      { ok: false, reason: 'quota', error: 'Месячная квота AI-подсказок исчерпана', used: quota.used, limit: quota.limit },
      { status: 429 },
    )
  }

  const result = await lookupIngredientMeta(name)
  if (result.status === 'ok') {
    if (!quota.isAdmin) await bumpLookupCount(session.userId)
    return NextResponse.json({ ok: true, source: result.source, meta: result.meta })
  }
  if (result.status === 'not_found') {
    return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 })
  }
  return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 })
}
