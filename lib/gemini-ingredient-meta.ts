/**
 * Заполнение «кулинарной метаинформации» ингредиента по названию:
 *   category, yieldCoefficients, coldLossPercent
 *
 * Каскад: Gemini Flash (через OpenRouter) → Sonar Pro fallback.
 * Используется и при создании одного ингредиента, и при batch-бэкфилле справочника.
 */

import type { IngredientCategory, YieldCoefficients } from '@/types'

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'google/gemini-2.5-flash'
const FALLBACK_MODEL = 'perplexity/sonar-pro'
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export interface IngredientMeta {
  category: IngredientCategory
  yieldCoefficients?: YieldCoefficients
  coldLossPercent?: number
  confidence: 'low' | 'medium' | 'high'
}

export type IngredientMetaResult =
  | { status: 'ok'; meta: IngredientMeta; source: 'gemini' | 'sonar' }
  | { status: 'not_found' }
  | { status: 'transient'; reason: string }

const VALID_CATEGORIES: IngredientCategory[] = [
  'grain','meat','poultry','fish','vegetable','fruit','dairy','oil','liquid','other',
]

const PROMPT = (name: string) => `Определи кулинарные характеристики ингредиента «${name}» для русской/советской кухни (ГОСТ Р 53104-2008).

Верни строго JSON одной строкой:
{
  "category": "grain|meat|poultry|fish|vegetable|fruit|dairy|oil|liquid|other",
  "coldLossPercent": число 0..50 (потери при холодной обработке: чистка, зачистка, удаление костей/кожи/жил),
  "yieldCoefficients": {
    "boil": число (готовый вес / сырой нетто при варке),
    "fry": число (то же при жарке),
    "stew": число,
    "bake": число,
    "steam": число
  },
  "confidence": "high|medium|low"
}

Правила:
- Включай в yieldCoefficients только те способы обработки, которые типичны для этого продукта (для крупы — boil; для мяса — boil/fry/stew/bake; для огурца обычно ничего, пусто {}).
- Крупы и паста увеличиваются (boil ~2.0–2.7).
- Мясо/птица уменьшаются (0.55–0.75).
- Овощи — варьируется (0.7–0.95).
- Масло — отдельная категория "oil", для жарки коэффициент ~0.1–0.2 (доля впитывания).
- Если в названии явно «вареный/готовый/отварной» — это уже готовый продукт, верни yieldCoefficients: {} и coldLossPercent: 0.
- Без markdown, без объяснений, только JSON.`

function stripJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) return text.slice(first, last + 1)
  return null
}

function coerceNum(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(',', '.')) : NaN
  if (!Number.isFinite(n)) return undefined
  if (n < min || n > max) return undefined
  return Math.round(n * 100) / 100
}

function parseMeta(raw: Record<string, unknown>): IngredientMeta | null {
  const category = typeof raw.category === 'string' && (VALID_CATEGORIES as string[]).includes(raw.category)
    ? (raw.category as IngredientCategory)
    : null
  if (!category) return null

  const coldLossPercent = coerceNum(raw.coldLossPercent, 0, 60)

  let yieldCoefficients: YieldCoefficients | undefined
  if (raw.yieldCoefficients && typeof raw.yieldCoefficients === 'object') {
    const yc = raw.yieldCoefficients as Record<string, unknown>
    const result: YieldCoefficients = {}
    const boil = coerceNum(yc.boil, 0.1, 5)
    const fry = coerceNum(yc.fry, 0.1, 5)
    const stew = coerceNum(yc.stew, 0.1, 5)
    const bake = coerceNum(yc.bake, 0.1, 5)
    const steam = coerceNum(yc.steam, 0.1, 5)
    const deep_fry = coerceNum(yc.deep_fry, 0.05, 5)
    if (boil !== undefined) result.boil = boil
    if (fry !== undefined) result.fry = fry
    if (stew !== undefined) result.stew = stew
    if (bake !== undefined) result.bake = bake
    if (steam !== undefined) result.steam = steam
    if (deep_fry !== undefined) result.deep_fry = deep_fry
    if (Object.keys(result).length > 0) yieldCoefficients = result
  }

  const confidence = raw.confidence === 'high' || raw.confidence === 'low' ? raw.confidence : 'medium'

  return { category, yieldCoefficients, coldLossPercent, confidence }
}

async function callModel(model: string, name: string): Promise<{ status: 'ok'; meta: IngredientMeta } | { status: 'transient'; reason: string } | { status: 'not_found' }> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return { status: 'transient', reason: 'no-api-key' }

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: PROMPT(name) }],
    temperature: 0.1,
    max_tokens: 600,
  }
  // Gemini 2.5 thinking trap: отключаем reasoning, иначе возвращается пустой text-part
  if (model.includes('gemini')) {
    body.reasoning = { max_tokens: 0 }
  }

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://nutrimenu.app',
        'X-Title': 'NutriMenu Ingredient Meta',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[ingredient-meta] fetch failed:', err)
    return { status: 'transient', reason: 'fetch-failed' }
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('[ingredient-meta] non-ok:', res.status, txt.slice(0, 300))
    return { status: 'transient', reason: `http-${res.status}` }
  }

  type Resp = {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string; code?: number }
  }
  const data = (await res.json().catch(() => null)) as Resp | null
  if (data?.error) return { status: 'transient', reason: `api-${data.error.code ?? 'unknown'}` }
  const text = data?.choices?.[0]?.message?.content ?? ''
  if (!text) return { status: 'transient', reason: 'empty-response' }

  const jsonStr = stripJson(text)
  if (!jsonStr) return { status: 'transient', reason: 'no-json' }

  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(jsonStr) } catch { return { status: 'transient', reason: 'parse-failed' } }

  const meta = parseMeta(parsed)
  if (!meta) return { status: 'not_found' }
  return { status: 'ok', meta }
}

export async function lookupIngredientMeta(name: string): Promise<IngredientMetaResult> {
  if (!name.trim()) return { status: 'transient', reason: 'empty-name' }

  // Primary: Gemini Flash
  const primary = await callModel(PRIMARY_MODEL, name)
  if (primary.status === 'ok') {
    if (primary.meta.confidence !== 'low') return { ...primary, source: 'gemini' }
    // Low confidence — пробуем Sonar для верификации
  } else if (primary.status === 'not_found') {
    // Также пробуем Sonar — может быть, региональный продукт
  }

  // Fallback: Sonar Pro
  const fb = await callModel(FALLBACK_MODEL, name)
  if (fb.status === 'ok') return { ...fb, source: 'sonar' }

  // Если был ok у primary с low confidence — возвращаем его как лучшее, что есть
  if (primary.status === 'ok') return { ...primary, source: 'gemini' }
  if (primary.status === 'not_found' && fb.status === 'not_found') return { status: 'not_found' }
  return { status: 'transient', reason: fb.status === 'transient' ? fb.reason : 'unknown' }
}
