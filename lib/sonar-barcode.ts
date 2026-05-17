/**
 * Barcode lookup via Perplexity Sonar Pro (through OpenRouter).
 *
 * Sonar Pro has its own search index that actually covers Russian retailers
 * (ozon, wildberries, vprok, vkusvill) — unlike Exa-based web plugins which
 * miss them entirely. One API call returns identification + nutrition + composition.
 *
 * Returns one of three states:
 *   - { status: 'found', ... }     — product identified (КБЖУ may still be partial)
 *   - { status: 'not_found' }      — AI explicitly returned found:false
 *   - { status: 'transient', ... } — network/API/parse failure; caller MUST NOT cache as negative
 */

const MODEL = 'perplexity/sonar-pro'
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export type BarcodeLookupResult =
  | {
      status: 'found'
      name: string
      brand?: string
      manufacturer?: string
      category?: string
      packageSize?: string
      calories?: number
      protein?: number
      fat?: number
      carbs?: number
      ingredients?: string
      confidence: 'low' | 'medium' | 'high'
    }
  | { status: 'not_found' }
  | { status: 'transient'; reason: string }

const PROMPT = (code: string) => {
  const prefix = code.slice(0, 3)
  const isRussian = /^46[0-9]$/.test(prefix)
  const region = isRussian
    ? 'Российский штрих-код (префикс 460-469). Ищи на ozon.ru, wildberries.ru, market.yandex.ru, vprok.ru, perekrestok.ru, vkusvill.ru, magnit.ru, lenta.com, auchan.ru, goodsmatrix.ru, barcode-list.ru, ean13.ru, fatsecret.ru, calorizator.ru.'
    : `Префикс ${prefix} — ищи в соответствующем регионе.`

  return `Найди продукт со штрих-кодом ${code}. ${region}

ОБЯЗАТЕЛЬНО найди КБЖУ на 100 г/мл (calories, protein, fat, carbs). Если на упаковке/сайте только порция — пересчитай на 100. Если совсем нет данных в вебе — оцени по аналогам того же типа продукта той же категории, в этом случае confidence="low".

Верни строго JSON одной строкой, без markdown:
{"found": true, "product_info": {"name": "название", "brand": "бренд", "manufacturer": "производитель", "category": "категория", "package_size": "200 г"}, "nutritional_value_per_100g": {"calories": число, "protein": число, "fat": число, "carbs": число}, "ingredients": "состав", "confidence": "high|medium|low"}
Если не нашёл вообще: {"found": false}

confidence: "high" — упаковка/офсайт; "medium" — карточка магазина; "low" — оценка по аналогам. Если manufacturer/category/package_size не нашёл — опусти эти поля.`
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
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : undefined
  }
  return undefined
}

function coerceString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t ? t : undefined
}

function normalizeConfidence(v: unknown): 'low' | 'medium' | 'high' {
  if (v === 'low' || v === 'medium' || v === 'high') return v
  return 'medium'
}

export async function lookupBarcodeViaSonar(code: string): Promise<BarcodeLookupResult> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return { status: 'transient', reason: 'no-api-key' }

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://nutrimenu.app',
        'X-Title': 'NutriMenu Barcode Lookup',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: PROMPT(code) }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })
  } catch (err) {
    console.error('[sonar-barcode] fetch failed:', err)
    return { status: 'transient', reason: 'fetch-failed' }
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('[sonar-barcode] non-ok:', res.status, txt.slice(0, 300))
    return { status: 'transient', reason: `http-${res.status}` }
  }

  type Resp = {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
    error?: { message?: string; code?: number }
  }
  const data = (await res.json().catch(() => null)) as Resp | null
  if (data?.error) {
    console.error('[sonar-barcode] api error:', data.error)
    return { status: 'transient', reason: `api-${data.error.code ?? 'unknown'}` }
  }
  const text = data?.choices?.[0]?.message?.content ?? ''
  if (!text) {
    console.warn('[sonar-barcode] empty response for', code)
    return { status: 'transient', reason: 'empty-response' }
  }

  const jsonStr = stripJsonFromText(text)
  if (!jsonStr) {
    console.warn('[sonar-barcode] no JSON for', code, '— text:', text.slice(0, 500))
    return { status: 'transient', reason: 'no-json' }
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.warn('[sonar-barcode] JSON parse failed for', code, '— jsonStr:', jsonStr.slice(0, 500))
    return { status: 'transient', reason: 'parse-failed' }
  }

  if (parsed.found === false) {
    console.info('[sonar-barcode] explicitly not found for', code)
    return { status: 'not_found' }
  }

  const productInfo = (parsed.product_info ?? {}) as Record<string, unknown>
  const nutri = (parsed.nutritional_value_per_100g ?? {}) as Record<string, unknown>

  const name = coerceString(productInfo.name)
  const brand = coerceString(productInfo.brand)
  const resolvedName = name ?? (brand ? `${brand} (без названия)` : undefined)
  if (!resolvedName) {
    console.warn('[sonar-barcode] no name/brand for', code, '— parsed:', parsed)
    return { status: 'transient', reason: 'no-identifiable-name' }
  }

  return {
    status: 'found',
    name: resolvedName,
    brand,
    manufacturer: coerceString(productInfo.manufacturer),
    category: coerceString(productInfo.category),
    packageSize: coerceString(productInfo.package_size),
    calories: coerceNumber(nutri.calories),
    protein: coerceNumber(nutri.protein),
    fat: coerceNumber(nutri.fat),
    carbs: coerceNumber(nutri.carbs),
    ingredients: coerceString(parsed.ingredients),
    confidence: normalizeConfidence(parsed.confidence),
  }
}
