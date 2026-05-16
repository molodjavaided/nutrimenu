/**
 * Gemini-grounded barcode lookup. Uses Google Search tool — Gemini
 * actually queries Google and reads product pages to extract КБЖУ.
 * Falls back gracefully on bad output.
 */

const MODEL = 'gemini-2.5-flash'
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

export interface BarcodeLookupResult {
  found: boolean
  name?: string
  brand?: string
  calories?: number
  protein?: number
  fat?: number
  carbs?: number
  ingredients?: string
  confidence: 'low' | 'medium' | 'high'
}

const PROMPT = (code: string) => `Найди продукт со штрих-кодом ${code} в интернете. Верни строго JSON одной строкой, без markdown и пояснений.

Если нашёл:
{"found": true, "product_info": {"name": "Название без бренда", "brand": "Бренд"}, "nutritional_value_per_100g": {"calories": число_ккал, "protein": число_г_белков, "fat": число_г_жиров, "carbs": число_г_углеводов}, "ingredients": "состав как на упаковке через запятую", "confidence": "high"|"medium"|"low"}

Если не нашёл точных данных:
{"found": false}

Правила:
- КБЖУ — строго на 100 г/мл (если на упаковке порция — пересчитай).
- confidence: "high" — данные с упаковки/официального сайта производителя; "medium" — карточка магазина с явным КБЖУ; "low" — частичные данные.
- Не выдумывай и не оценивай по аналогам. Нет точных данных → found: false.`

function stripJsonFromText(text: string): string | null {
  // Gemini sometimes wraps JSON in ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }
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

export async function lookupBarcodeViaGemini(code: string): Promise<BarcodeLookupResult> {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return { found: false, confidence: 'low' }
  }

  const body = {
    contents: [{ parts: [{ text: PROMPT(code) }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2000,
      // Gemini 2.5 Flash has thinking enabled by default — it can burn the
      // entire output budget on hidden reasoning and return an empty text part.
      // Disable thinking so all tokens go to the visible response.
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  let res: Response
  try {
    res = await fetch(ENDPOINT(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[gemini-barcode] fetch failed:', err)
    return { found: false, confidence: 'low' }
  }
  if (!res.ok) {
    console.error('[gemini-barcode] non-ok:', res.status, await res.text().catch(() => ''))
    return { found: false, confidence: 'low' }
  }

  type GeminiResponse = {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
      finishReason?: string
    }>
    usageMetadata?: { totalTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }
    promptFeedback?: { blockReason?: string }
  }
  const data = (await res.json().catch(() => null)) as GeminiResponse | null
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) {
    console.warn('[gemini-barcode] empty response for', code, JSON.stringify({
      finishReason: data?.candidates?.[0]?.finishReason,
      blockReason: data?.promptFeedback?.blockReason,
      usage: data?.usageMetadata,
      partsCount: data?.candidates?.[0]?.content?.parts?.length ?? 0,
    }))
    return { found: false, confidence: 'low' }
  }

  const jsonStr = stripJsonFromText(text)
  if (!jsonStr) {
    console.warn('[gemini-barcode] no JSON in response for', code, '— text:', text.slice(0, 500))
    return { found: false, confidence: 'low' }
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.warn('[gemini-barcode] JSON parse failed for', code, '— jsonStr:', jsonStr.slice(0, 500))
    return { found: false, confidence: 'low' }
  }

  if (parsed.found === false) {
    console.info('[gemini-barcode] explicitly not found for', code)
    return { found: false, confidence: 'low' }
  }

  const productInfo = (parsed.product_info ?? {}) as Record<string, unknown>
  const nutri = (parsed.nutritional_value_per_100g ?? {}) as Record<string, unknown>

  const name = typeof productInfo.name === 'string' ? productInfo.name.trim() : ''
  if (!name) {
    console.warn('[gemini-barcode] missing product_info.name for', code, '— parsed:', parsed)
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
