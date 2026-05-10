/**
 * TTK parsing via OpenRouter — Claude Sonnet 4.6.
 * Each sheet is parsed in a separate call to avoid context overflow.
 * Vision (PDF/images) also routed through Claude (supports inline base64).
 */

import type { ParsedDish } from '@/lib/ttk-types'
import type { TTKExample } from '@/lib/ttk-examples'

export interface SheetInput {
  name: string
  rows: string[][] | null
  dishes: ParsedDish[]
}

export interface ValidationResult {
  dishes: ParsedDish[]
  corrections: string[]
}

const MODEL = 'anthropic/claude-sonnet-4-6'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// ─── System prompt ─────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты — точный парсер ТТК (технико-технологических карт) для российского ресторанного ПО.

Тебе передаётся ОДИН лист таблицы. Строки разделены переносом, ячейки — TAB.

## ЗАДАЧА
Если список блюд пустой — разбери строки и верни все блюда.
Если список есть — сравни с сырыми строками, найди пропуски и ошибки, верни исправленный список.

## ОПРЕДЕЛЕНИЕ СТРУКТУРЫ ЛИСТА
Сначала определи тип листа:

**Тип SKIP** — пропустить, вернуть dishes:[]:
- Лист закупки: есть колонки «Закуп», «Поставщик», «Ед.изм», «Цена»
- Лист сводки/итогов: только итоговые строки без рецептур
- Менее 3 строк с данными

**Тип ИЕРАРХИЧЕСКИЙ** — блюдо в первой ячейке строки, ингредиенты ниже:
- Блюдо: col0 заполнен, остальные (вес/количество) пустые
- Ингредиент: col0 пустой или col1 заполнен, вес в одной из правых колонок
- Вариант: col0 пустой, col1 заполнен, вес в col1 или правее

**Тип ТАБЛИЧНЫЙ** — строка заголовка + каждая строка = один ингредиент:
- Колонки «Наименование», «Брутто», «Нетто» → используй Нетто
- Названия блюд могут быть выделены как заголовки-разделители

**Тип СТРОЧНЫЙ** — каждая строка = одно блюдо, ингредиенты в одной ячейке через перенос или запятую

**Тип БАРНЫЙ/COFFEE** — sparse-категории, состав через тире: «Молоко - 180 мл»

## ПРАВИЛА ПАРСИНГА

**Вес:**
- кг → умножь на 1000, unit: "г"
- л → умножь на 1000, unit: "мл"
- "120/100/100" → берём первое: 120
- "от 17 до 19" или "17-19" → среднее: 18
- Не указан → netWeight: 0

**Единицы:** г/гр/гр. → "г" | мл/мл. → "мл" | шт/шт. → "шт" | шот/шота → "шт" | без единицы → "г"

**kind:**
- ПФ, Заготовка, Полуфабрикат, Основа, Соус (как отдельный рецепт) → "preparation"
- Всё остальное → "dish"

**Мусор — удалить:**
- Строки: «Итого», «Выход», «Брутто», «Нетто», «№», «п/п», «Наименование»
- Ингредиенты с пустым именем
- Блюда без ингредиентов (кроме случаев когда это единственная запись)

**Имена:**
- Исправляй только явные опечатки в названиях блюд (не в ингредиентах)
- Не выдумывай данных которых нет в источнике

## ФОРМАТ ОТВЕТА — ТОЛЬКО JSON, без markdown, без объяснений:
{
  "dishes": [
    {
      "id": "<uuid-v4>",
      "name": "Название блюда",
      "category": "<имя листа>",
      "kind": "dish",
      "instructions": "инструкция или null",
      "ingredients": [
        { "ingredientName": "Молоко", "netWeight": 180, "unit": "мл" }
      ]
    }
  ],
  "corrections": ["краткое описание каждого исправления на русском"]
}`

// ─── PDF / Vision prompt ────────────────────────────────────────

const PDF_SYSTEM_PROMPT = `Ты — точный парсер ТТК (технико-технологических карт) для российского ресторанного ПО.
Тебе передаётся изображение или PDF с технологической картой.

Извлеки все блюда и ингредиенты. Для каждого блюда определи:
- Название, категорию/раздел из документа
- kind: "preparation" для ПФ/заготовок/полуфабрикатов, "dish" для остальных
- Все ингредиенты с весом

Единицы: г/кг(*1000)/мл/л(*1000)/шт. Без единицы → "г".
Таблицы "Брутто/Нетто" → используй Нетто.
"120/100/100" → 120. Диапазон "17-19" → 18.

Верни ТОЛЬКО JSON без markdown:
{
  "dishes": [
    {
      "id": "<uuid-v4>",
      "name": "Название",
      "category": "Раздел",
      "kind": "dish",
      "instructions": null,
      "ingredients": [{ "ingredientName": "...", "netWeight": 100, "unit": "г" }]
    }
  ],
  "corrections": []
}`

// ─── Few-shot examples ─────────────────────────────────────────

function buildExamplesSection(examples: TTKExample[]): string {
  if (examples.length === 0) return ''
  const parts = ['\n\nПРИМЕРЫ ИЗ РЕАЛЬНЫХ ТТК ЭТОГО ЗАВЕДЕНИЯ:']
  for (const ex of examples.slice(0, 3)) {
    parts.push(`\nЛист «${ex.sheetName}»:`)
    if (ex.rowsSample.length > 0) {
      parts.push('Строки:\n' + ex.rowsSample.slice(0, 10).map(r => r.join('\t')).join('\n'))
    }
    parts.push('Правильный результат:\n' + ex.dishesSample.slice(0, 3).map(d =>
      `${d.name}: ` + d.ingredients.slice(0, 3).map(i => `${i.ingredientName} ${i.netWeight}${i.unit}`).join(', ')
    ).join('\n'))
  }
  return parts.join('\n')
}

// ─── OpenRouter call ───────────────────────────────────────────

async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  imageParts?: { mimeType: string; data: string }[],
): Promise<{ dishes: ParsedDish[]; corrections: string[] }> {
  const content: unknown = imageParts
    ? [
        ...imageParts.map(p => ({ type: 'image_url', image_url: { url: `data:${p.mimeType};base64,${p.data}` } })),
        { type: 'text', text: userMessage },
      ]
    : userMessage

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://nutrimenu.app',
      'X-Title': 'NutriMenu TTK Parser',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      max_tokens: 32768,
      temperature: 0,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 300)}`)
  }

  const json = await res.json()
  const text: string = json.choices?.[0]?.message?.content ?? ''
  return parseAIResponse(text)
}

// ─── Response parser ───────────────────────────────────────────

function parseAIResponse(text: string): { dishes: ParsedDish[]; corrections: string[] } {
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```\s*$/, '').trim()

  let parsed: { dishes: unknown[]; corrections?: unknown[] }
  try {
    parsed = JSON.parse(clean)
  } catch {
    // Try to extract JSON object from text
    const m = clean.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        parsed = JSON.parse(m[0])
      } catch {
        throw new Error('Не удалось распарсить JSON ответа модели')
      }
    } else {
      throw new Error('Модель вернула невалидный JSON')
    }
  }

  if (!Array.isArray(parsed.dishes)) throw new Error('Неожиданный формат ответа')

  const dishes: ParsedDish[] = (parsed.dishes as Record<string, unknown>[])
    .map(d => ({
      id: String(d.id ?? crypto.randomUUID()),
      name: String(d.name ?? '').trim(),
      category: String(d.category ?? '').trim(),
      kind: (d.kind === 'preparation' ? 'preparation' : 'dish') as 'dish' | 'preparation',
      instructions: d.instructions ? String(d.instructions) : undefined,
      ingredients: Array.isArray(d.ingredients)
        ? (d.ingredients as Record<string, unknown>[])
            .map(i => ({
              ingredientName: String(i.ingredientName ?? '').trim(),
              netWeight: Number(i.netWeight) || 0,
              unit: (['г', 'мл', 'шт'].includes(String(i.unit)) ? String(i.unit) : 'г') as 'г' | 'мл' | 'шт',
            }))
            .filter(i => i.ingredientName.length > 0)
        : [],
    }))
    .filter(d => d.name.length > 0)

  const corrections = Array.isArray(parsed.corrections)
    ? (parsed.corrections as unknown[]).map(c => String(c)).filter(Boolean)
    : []

  return { dishes, corrections }
}

// ─── Skip detection ────────────────────────────────────────────

function isSkippableSheet(sheet: SheetInput): boolean {
  if (!sheet.rows || sheet.rows.length < 3) return true
  const header = sheet.rows[0].join('\t').toLowerCase()
  return /закуп|поставщик|прайс|price/.test(header)
}

// ─── Public: validate XLSX/CSV sheets ─────────────────────────

export async function validateTTKDishes(
  sheets: SheetInput[],
  apiKey: string,
  examples: TTKExample[] = [],
): Promise<ValidationResult> {
  const systemPrompt = SYSTEM_PROMPT + buildExamplesSection(examples)
  const validSheets = sheets.filter(s => !isSkippableSheet(s))
  if (validSheets.length === 0) return { dishes: [], corrections: [] }

  // Each sheet → separate call (prevents context overflow on large files)
  const CONCURRENCY = 3
  const allDishes: ParsedDish[] = []
  const allCorrections: string[] = []

  for (let i = 0; i < validSheets.length; i += CONCURRENCY) {
    const batch = validSheets.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map(async sheet => {
        const parts: string[] = [`=== Лист: "${sheet.name}" ===`]
        if (sheet.rows && sheet.rows.length > 0) {
          const tableText = sheet.rows
            .filter(r => r.some(c => c.trim()))
            .slice(0, 300)
            .map(r => r.map(c => c.length > 200 ? c.slice(0, 200) + '…' : c).join('\t'))
            .join('\n')
          parts.push(`Строки таблицы:\n${tableText}`)
        }
        if (sheet.dishes.length > 0) {
          parts.push(`\nАвтопарсинг (${sheet.dishes.length} блюд):\n${JSON.stringify(sheet.dishes, null, 2)}`)
        } else {
          parts.push('\n(автопарсинг пустой — разбери из строк)')
        }

        try {
          return await callOpenRouter(apiKey, systemPrompt, parts.join('\n'))
        } catch (err) {
          return { dishes: [] as ParsedDish[], corrections: [`Лист «${sheet.name}»: ${String(err)}`] }
        }
      }),
    )

    for (const r of results) {
      allDishes.push(...r.dishes)
      allCorrections.push(...r.corrections)
    }
  }

  return { dishes: allDishes, corrections: allCorrections }
}

// ─── Public: parse PDF text (pre-extracted) ───────────────────

export async function parsePDFTextTTK(
  pdfText: string,
  apiKey: string,
  examples: TTKExample[] = [],
): Promise<ValidationResult> {
  const systemPrompt = PDF_SYSTEM_PROMPT + buildExamplesSection(examples)
  const prompt = `Текст из PDF с ТТК:\n\n${pdfText.slice(0, 50000)}`
  return callOpenRouter(apiKey, systemPrompt, prompt)
}

// ─── Public: parse PDF scan / image (Vision) ──────────────────

export async function parsePDFTTK(
  fileBase64: string,
  mimeType: string,
  apiKey: string,
  examples: TTKExample[] = [],
): Promise<ValidationResult> {
  const systemPrompt = PDF_SYSTEM_PROMPT + buildExamplesSection(examples)
  return callOpenRouter(
    apiKey,
    systemPrompt,
    'Извлеки все блюда и ингредиенты из этой ТТК.',
    [{ mimeType, data: fileBase64 }],
  )
}
