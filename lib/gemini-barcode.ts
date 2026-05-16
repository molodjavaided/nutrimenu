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
  confidence: 'low' | 'medium' | 'high'
}

const PROMPT = (code: string) => `Найди продукт со штрих-кодом ${code} в интернете (Перекрёсток, Лента, Магнит, ozon, Wildberries, Edadeal и т.п.). Если нашёл — верни строго JSON одной строкой, без markdown:

{"found": true, "name": "Название как на упаковке", "brand": "Бренд", "calories": число_ккал_на_100г, "protein": число_белков_на_100г, "fat": число_жиров_на_100г, "carbs": число_углеводов_на_100г, "confidence": "high"|"medium"|"low"}

Правила:
- name — без бренда (бренд отдельно).
- КБЖУ — на 100 г/мл продукта (если есть только на порцию — пересчитай).
- confidence: "high" если нашёл точные данные с упаковки; "medium" если из карточки магазина без явного КБЖУ; "low" если оценка по аналогам.
- Если продукт не найден, верни {"found": false}.

Без пояснений, только JSON.`

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
      temperature: 0.1,
      maxOutputTokens: 600,
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
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const data = (await res.json().catch(() => null)) as GeminiResponse | null
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) {
    return { found: false, confidence: 'low' }
  }

  const jsonStr = stripJsonFromText(text)
  if (!jsonStr) return { found: false, confidence: 'low' }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    return { found: false, confidence: 'low' }
  }

  if (parsed.found === false) {
    return { found: false, confidence: 'low' }
  }

  const name = typeof parsed.name === 'string' ? parsed.name.trim() : ''
  if (!name) {
    return { found: false, confidence: 'low' }
  }

  return {
    found: true,
    name,
    brand: typeof parsed.brand === 'string' ? parsed.brand.trim() || undefined : undefined,
    calories: coerceNumber(parsed.calories),
    protein: coerceNumber(parsed.protein),
    fat: coerceNumber(parsed.fat),
    carbs: coerceNumber(parsed.carbs),
    confidence: normalizeConfidence(parsed.confidence),
  }
}
