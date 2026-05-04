/**
 * TTK validation, extraction, and PDF parsing logic.
 *
 * Primary AI: DeepSeek (text — XLSX, CSV, text PDFs)
 * Fallback AI: Gemini Vision (scan PDFs and images, if GEMINI_API_KEY set)
 *
 * Both functions accept optional few-shot examples that improve accuracy over time.
 */

import type { ParsedDish } from '@/lib/ttk-types'
import type { TTKExample } from '@/lib/ttk-examples'

export interface SheetInput {
  name: string
  /** Raw spreadsheet rows. null = unavailable (client-side file parse or PDF). */
  rows: string[][] | null
  /** Already-parsed dishes. Pass [] to run in extract mode. */
  dishes: ParsedDish[]
}

export interface ValidationResult {
  dishes: ParsedDish[]
  corrections: string[]
}

// ─── Few-shot examples section ─────────────────────────────────

function buildExamplesSection(examples: TTKExample[]): string {
  if (examples.length === 0) return ''
  const parts: string[] = [
    '\nПРИМЕРЫ ИЗ РЕАЛЬНЫХ ТТК ЭТОГО ЗАВЕДЕНИЯ — используй чтобы понять формат:',
  ]
  for (const ex of examples.slice(0, 3)) {
    parts.push(`\n— Лист «${ex.sheetName}»:`)
    if (ex.rowsSample.length > 0) {
      parts.push('  Исходные строки (первые 12):')
      parts.push(
        ex.rowsSample
          .slice(0, 12)
          .map(r => '  ' + r.join('\t'))
          .join('\n'),
      )
    }
    parts.push('  Правильный результат (первые 3 блюда):')
    parts.push(
      ex.dishesSample
        .slice(0, 3)
        .map(d =>
          `  ${d.name} (${d.kind}): ` +
          d.ingredients.slice(0, 4).map(i => `${i.ingredientName} ${i.netWeight}${i.unit}`).join(', '),
        )
        .join('\n'),
    )
  }
  return parts.join('\n')
}

// ─── System prompt ─────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `Ты — валидатор и парсер ТТК (технико-технологических карт) для российского ресторанного ПО.

Тебе передаётся для каждого листа:
  1. Сырые строки таблицы (если есть) — значения ячеек разделены TAB
  2. Список блюд, автоматически разобранных из этой таблицы (может быть пустым — тогда разбери сам)

ЗАДАЧА:
  А) Если список блюд пустой → разбери сырые строки и верни все блюда с ингредиентами.
  Б) Если список блюд есть → сравни его с сырыми строками, найди ошибки и верни исправленный список.

ОШИБКИ КОТОРЫЕ НУЖНО ИСПРАВИТЬ:
  - Пропущенные блюда (есть в таблице, нет в списке)
  - Обрезанные или неверно объединённые названия блюд
  - Пропущенные ингредиенты
  - Неверный вес: 0.15 кг → 150 г; 1.5 л → 1500 мл; "120/100/100" → берём первое число (120)
  - Строки-заголовки попавшие как блюда/ингредиенты: "Наименование", "Итого", "Выход", "Брутто", "Нетто", "№", "п/п" → удалить
  - kind: блюда основного меню → "dish", ПФ/Заготовки/полуфабрикаты → "preparation"
  - Мусорные символы в именах ингредиентов (числа, точки, «---»)
  - Если лист — список закупа (есть колонки "Закуп", "Поставщик", "Ед.изм") → верни dishes: []

ЕДИНИЦЫ ИЗМЕРЕНИЯ:
  - г, гр, гр. → "г"
  - кг → умножь на 1000 → "г"
  - мл, мл. → "мл"
  - л → умножь на 1000 → "мл"
  - шт, шт. → "шт"
  - шот, шота, шотов (кофейный шот) → unit: "шт" (1 шот ≈ 30мл, но храним как шт)
  - Если единица не указана — "г"

ФОРМАТЫ ТТК (встречаются на практике):

Формат A — Иерархический-col0 (кухонные ТТК):
  "Боул с Курицей"  ""  ""  ""           ← блюдо: col0 заполнен, остальные пустые
  "Гречка/Булгур"   ""  ""  "120гр"      ← ингредиент: col0=имя, col3=вес
  "Курица ПФ"       ""  ""  "40гр"

Формат A2 — Иерархический-col1 (часть листов кухонных ТТК):
  "Вафля сырная"    ""  ""  ""  ""        ← блюдо: col0 заполнен, остальные пустые
  ""  "Тесто на вафлю"  ""  ""  "160гр"  ← ингредиент: col0 пустой, col1=имя, col4=вес
  ""  "Лосось с/с"      ""  ""  "40гр"

Формат B — Одна строка = блюдо (кофейни), ингредиенты multi-line в одной ячейке:
  col0="Капучино"  col1="250мл / 350мл"  col2="Эспрессо 1 шот\nМолоко 180мл"  col4="Инструкция..."
  → Берём только ПЕРВЫЙ вариант (первые строки до пустой строки или разделителя)

Формат C — Tabular sparse (барные карты):
  Строка-заголовок: ""  "Напиток"  "Объем"  "Состав"  "Приготовление"
  "КЛАССИКА"  "Бамбл"  "350"  "Кофейный концентрат - 55 гр"  "1. В бокал..."
  ""           ""        ""    "Апельсиновый сок - 170 гр"    "2. Добавить..."
  ""           ""        ""    "Лед - 150 гр"                 ""
  ""  "Эспрессо-тоник"  "330"  "Концентрат тоник - 45 гр"   "1. Охладить..."
  → col0 = категория (sparse), col1 = блюдо (только в первой строке, carry-forward)
  → col3 = ингредиент в формате "Имя - количество единица"

Формат D — Таблица с заголовком:
  "Наименование"  "Брутто"  "Нетто"     ← заголовок → пропустить
  "Молоко"        "160"     "150"        ← Нетто = финальный вес

ПРАВИЛА ПАРСИНГА ИНГРЕДИЕНТОВ:
  - "Кофейный концентрат - 55 гр" → name: "Кофейный концентрат", netWeight: 55, unit: "г"
  - "Молоко 180мл" → name: "Молоко", netWeight: 180, unit: "мл"
  - "Яйцо пашот 1шт" → name: "Яйцо пашот", netWeight: 1, unit: "шт"
  - "Эспрессо 2 шота" → name: "Эспрессо", netWeight: 2, unit: "шт"
  - "Гречка/Булгур/Киноа 120/100/100" → name: "Гречка/Булгур/Киноа", netWeight: 120, unit: "г"
  - "1\гр" (опечатка) → 1 г
  - Украшения и специальные пометки ("украшение", "для подачи") — включать как ингредиенты

ПРАВИЛА:
  - Верни ТОЛЬКО валидный JSON-объект без markdown, без объяснений
  - Не выдумывай данных которых нет в источнике
  - Если вес неизвестен — оставь netWeight: 0
  - Сохраняй UUID из входного списка (если блюдо совпадает по названию)
  - corrections[] — краткие русские описания каждого исправления

СТРУКТУРА ОТВЕТА:
{
  "dishes": [
    {
      "id": "uuid-string",
      "name": "Название блюда",
      "category": "Категория / лист",
      "kind": "dish",
      "instructions": "инструкция или null",
      "ingredients": [
        { "ingredientName": "Свёкла", "netWeight": 150, "unit": "г" }
      ]
    }
  ],
  "corrections": ["Боул с курицей: вес «Гречка/Булгур» взят как 120г (первое из 120/100/100)", "..."]
}`

// ─── PDF / image system prompt ──────────────────────────────────

const PDF_SYSTEM_PROMPT = `Ты — парсер ТТК (технико-технологических карт) для российского ресторанного ПО.

Тебе даётся изображение или PDF страница с технологической картой.
Извлеки все блюда и их ингредиенты. Верни структурированный JSON.

ПРАВИЛА:
  - Каждое блюдо/рецепт в документе → один элемент dishes[]
  - ПФ, Заготовки, Полуфабрикаты → kind: "preparation"; остальные → kind: "dish"
  - Таблицы с заголовками "Наименование", "Брутто", "Нетто": используй Нетто как вес
  - Не выдумывай данных которых нет на странице
  - corrections[] — заметки о неясных местах документа

ЕДИНИЦЫ:
  - г, гр → "г"
  - кг → умножь на 1000 → "г"
  - мл → "мл"
  - л → умножь на 1000 → "мл"
  - шт → "шт"
  - шот/шота (кофе) → unit: "шт"
  - Не указана → "г"

ОСОБЫЕ СЛУЧАИ:
  - "120/100/100" (альтернативы) → берём первое число: 120
  - "1\гр" (опечатка со слешем) → 1 г
  - "Ингредиент - 55 гр" → name: "Ингредиент", netWeight: 55, unit: "г"
  - Украшения ("1 шт (украшение)") → включать как ингредиенты с unit: "шт"

СТРУКТУРА ОТВЕТА (ТОЛЬКО JSON, без markdown):
{
  "dishes": [
    {
      "id": "сгенерируй uuid v4",
      "name": "Название блюда",
      "category": "Раздел / категория из документа",
      "kind": "dish",
      "instructions": "инструкция приготовления или null",
      "ingredients": [
        { "ingredientName": "Свёкла", "netWeight": 150, "unit": "г" }
      ]
    }
  ],
  "corrections": ["замечание о качестве документа или неясном месте"]
}`

// ─── Response parser (shared) ──────────────────────────────────

function parseAIResponse(text: string): { dishes: ParsedDish[]; corrections: string[] } {
  let parsed: { dishes: unknown[]; corrections: unknown[] }
  try {
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    throw new Error('AI вернул невалидный JSON')
  }

  if (!Array.isArray(parsed.dishes)) throw new Error('AI вернул неожиданный формат')

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

// ─── DeepSeek call helper (OpenAI-compatible, text only) ───────

async function callDeepSeek(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<{ dishes: ParsedDish[]; corrections: string[] }> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 8192,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    const msg = `DeepSeek вернул ошибку ${res.status}: ${err.slice(0, 200)}`
    if (res.status === 402) throw Object.assign(new Error(msg), { code: 'NO_BALANCE' })
    throw new Error(msg)
  }

  const json = await res.json()
  const text: string = json.choices?.[0]?.message?.content ?? ''
  return parseAIResponse(text)
}

// ─── Gemini text call helper (XLSX / CSV / text PDF) ──────────

async function callGeminiText(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<{ dishes: ParsedDish[]; corrections: string[] }> {
  const contents = [{ parts: [{ text: userMessage }] }]
  return callGeminiVisionRaw(apiKey, systemPrompt, contents)
}

// ─── Gemini Vision call helper (images / scan PDFs only) ───────

async function callGeminiVisionRaw(
  apiKey: string,
  systemPrompt: string,
  contents: unknown[],
): Promise<{ dishes: ParsedDish[]; corrections: string[] }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 8192, temperature: 0 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Gemini вернул ошибку ${res.status}: ${err.slice(0, 200)}`)
  }

  const json = await res.json()
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return parseAIResponse(text)
}

// ─── Public: validate / correct XLSX dishes ────────────────────

/** Detect sheets that are purchase/закуп lists — skip them */
function isPurchaseSheet(sheet: SheetInput): boolean {
  if (!sheet.rows || sheet.rows.length === 0) return false
  const header = sheet.rows[0].join('\t').toLowerCase()
  return /закуп|поставщик/.test(header)
}

export async function validateTTKDishes(
  sheets: SheetInput[],
  apiKey: string,
  examples: TTKExample[] = [],
): Promise<ValidationResult> {
  const systemPrompt = BASE_SYSTEM_PROMPT + buildExamplesSection(examples)

  // Filter junk sheets and skip empty ones
  const validSheets = sheets.filter(s => {
    if (!s.rows || s.rows.length < 2) return false
    if (isPurchaseSheet(s)) return false
    return true
  })

  if (validSheets.length === 0) return { dishes: [], corrections: [] }

  // Each sheet → separate DeepSeek call (avoids token overflow on large files)
  // Batches of 4 to stay within rate limits
  const BATCH = 4
  const allDishes: ParsedDish[] = []
  const allCorrections: string[] = []

  for (let i = 0; i < validSheets.length; i += BATCH) {
    const batch = validSheets.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(sheet => {
        const parts: string[] = []
        parts.push(`=== Лист: "${sheet.name}" ===`)
        if (sheet.rows && sheet.rows.length > 0) {
          const tableText = sheet.rows
            .slice(0, 200)
            .map(r => r.map(cell => cell.length > 300 ? cell.slice(0, 300) + '…' : cell).join('\t'))
            .join('\n')
          parts.push(`Сырые строки таблицы:\n${tableText}`)
        }
        if (sheet.dishes.length > 0) {
          parts.push(`\nАвтопарсинг (${sheet.dishes.length} блюд):\n${JSON.stringify(sheet.dishes, null, 2)}`)
        } else {
          parts.push('\n(список пустой — разбери из сырых строк)')
        }

        const call = apiKey.startsWith('sk-')
          ? callDeepSeek(apiKey, systemPrompt, parts.join('\n'))
          : callGeminiText(apiKey, systemPrompt, parts.join('\n'))

        return call
          .catch(err => {
            if ((err as { code?: string }).code === 'NO_BALANCE') throw err
            return { dishes: [] as ParsedDish[], corrections: [`Лист «${sheet.name}»: ${String(err)}`] }
          })
      }),
    )

    for (const r of results) {
      allDishes.push(...r.dishes)
      allCorrections.push(...r.corrections)
    }
  }

  return { dishes: allDishes, corrections: allCorrections }
}

// ─── Public: extract from PDF text (pdfjs pre-extracted) ──────

export async function parsePDFTextTTK(
  pdfText: string,
  apiKey: string,
  examples: TTKExample[] = [],
): Promise<ValidationResult> {
  const systemPrompt = PDF_SYSTEM_PROMPT + buildExamplesSection(examples)
  const prompt = `Текст извлечён из PDF-документа с ТТК. Разбери все блюда и ингредиенты.\n\n${pdfText.slice(0, 40000)}`
  const call = apiKey.startsWith('sk-')
    ? callDeepSeek(apiKey, systemPrompt, prompt)
    : callGeminiText(apiKey, systemPrompt, prompt)
  return call
}

// ─── Public: extract from image / scan PDF (always Gemini Vision) ─

export async function parsePDFTTK(
  fileBase64: string,
  mimeType: string,
  geminiApiKey: string,
  examples: TTKExample[] = [],
): Promise<ValidationResult> {
  const systemPrompt = PDF_SYSTEM_PROMPT + buildExamplesSection(examples)

  const contents = [{
    parts: [
      { inline_data: { mime_type: mimeType, data: fileBase64 } },
      { text: 'Извлеки все блюда и ингредиенты из этой ТТК.' },
    ],
  }]

  return callGeminiVisionRaw(geminiApiKey, systemPrompt, contents)
}
