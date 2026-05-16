/**
 * Perplexity Sonar (via OpenRouter) — fallback barcode lookup when Gemini
 * can't find a product. Sonar has a different search index than Google,
 * so it sometimes catches RU products Gemini misses.
 */

import type { BarcodeLookupResult } from './gemini-barcode'

const MODEL = 'perplexity/sonar'
const URL = 'https://openrouter.ai/api/v1/chat/completions'

const PROMPT = (code: string) => {
  const prefix = code.slice(0, 3)
  const isRussian = /^46[0-9]$/.test(prefix)
  const lang = isRussian
    ? 'Это российский штрих-код (префикс 460-469). Ищи на русском языке на сайтах ozon.ru, wildberries.ru, market.yandex.ru, vprok.ru, perekrestok.ru, vkusvill.ru, magnit.ru, goodsmatrix.ru, barcode-list.ru.'
    : ''

  return `Найди продукт со штрих-кодом ${code}. ${lang}

Верни строго JSON одной строкой, без markdown:
{"found": true, "product_info": {"name": "название без бренда", "brand": "бренд"}, "nutritional_value_per_100g": {"calories": число, "protein": число, "fat": число, "carbs": число}, "ingredients": "состав через запятую", "confidence": "high"|"medium"|"low"}

Если не нашёл: {"found": false}

КБЖУ — строго на 100 г/мл. Если порция — пересчитай. Не выдумывай.`
}

function stripJsonFromText(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) return text.slice(firstBrace, lastBrace + 1)
  return null
}

function coerceNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function normalizeConfidence(v: unknown): 'low' | 'medium' | 'high' {
  if (v === 'low' || v === 'medium' || v === 'high') return v
  return 'medium'
}

export async function lookupBarcodeViaPerplexity(code: string): Promise<BarcodeLookupResult> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return { found: false, confidence: 'low' }

  let res: Response
  try {
    res = await fetch(URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://nutrimenu.app',
        'X-Title': 'Plate Barcode Lookup',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: PROMPT(code) }],
        max_tokens: 800,
        temperature: 0.2,
      }),
    })
  } catch (err) {
    console.error('[perplexity-barcode] fetch failed:', err)
    return { found: false, confidence: 'low' }
  }

  if (!res.ok) {
    console.error('[perplexity-barcode] non-ok:', res.status, await res.text().catch(() => ''))
    return { found: false, confidence: 'low' }
  }

  const json = await res.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null
  const text = json?.choices?.[0]?.message?.content ?? ''
  if (!text) {
    console.warn('[perplexity-barcode] empty response for', code)
    return { found: false, confidence: 'low' }
  }

  const jsonStr = stripJsonFromText(text)
  if (!jsonStr) {
    console.warn('[perplexity-barcode] no JSON in response for', code, '— text:', text.slice(0, 400))
    return { found: false, confidence: 'low' }
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.warn('[perplexity-barcode] JSON parse failed for', code, '— jsonStr:', jsonStr.slice(0, 400))
    return { found: false, confidence: 'low' }
  }

  if (parsed.found === false) {
    console.info('[perplexity-barcode] explicitly not found for', code)
    return { found: false, confidence: 'low' }
  }

  const productInfo = (parsed.product_info ?? {}) as Record<string, unknown>
  const nutri = (parsed.nutritional_value_per_100g ?? {}) as Record<string, unknown>
  const name = typeof productInfo.name === 'string' ? productInfo.name.trim() : ''
  if (!name) {
    console.warn('[perplexity-barcode] missing name for', code, '— parsed:', parsed)
    return { found: false, confidence: 'low' }
  }

  const ingredients = typeof parsed.ingredients === 'string' ? parsed.ingredients.trim() : ''

  return {
    found: true,
    name,
    brand: typeof productInfo.brand === 'string' ? productInfo.brand.trim() || undefined : undefined,
    calories: coerceNumber(nutri.calories),
    protein: coerceNumber(nutri.protein),
    fat: coerceNumber(nutri.fat),
    carbs: coerceNumber(nutri.carbs),
    ingredients: ingredients || undefined,
    confidence: normalizeConfidence(parsed.confidence),
  }
}
