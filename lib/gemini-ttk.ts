/**
 * Shared Gemini-based TTK validation, extraction, and PDF parsing logic.
 *
 * Modes:
 *   validateTTKDishes  — cross-checks/corrects parsed XLSX/CSV dishes against raw rows
 *   parsePDFTTK        — extracts dishes from a PDF or photo via Gemini Vision
 *
 * Both functions accept optional few-shot examples that improve accuracy over time.
 */

import type { ParsedDish } from '@/lib/importer'
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
  - Неверный вес: 0.15 кг → 150 г; 1.5 л → 1500 мл; дробь "120/100" → берём первое число
  - Строки-заголовки попавшие как блюда/ингредиенты: "Наименование", "Итого", "Выход", "Брутто", "Нетто", "№", "п/п" → удалить
  - kind: блюда основного меню → "dish", ПФ/Заготовки/полуфабрикаты → "preparation"
  - Мусорные символы в именах ингредиентов (числа, точки, «---»)

ФОРМАТЫ ТТК:

Формат A — Иерархический (чаще всего):
  "Борщ украинский"                     ← блюдо: только 1 заполненная колонка
  "Свёкла"  ""  ""  "150"  ""           ← ингредиент: имя в col0, вес в col3
  "Морковь"  ""  ""  "50"   ""

Формат B — Табличный:
  "Наименование"  "Брутто"  "Нетто"     ← заголовок → пропустить
  "Молоко"        "160"     "150"        ← ингредиент блюда

Формат C — Одна строка = блюдо:
  "Капучино\tМолоко 150мл, Кофе 30г"

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
      "instructions": null,
      "ingredients": [
        { "ingredientName": "Свёкла", "netWeight": 150, "unit": "г" }
      ]
    }
  ],
  "corrections": ["Борщ: добавлен пропущенный ингредиент «Капуста» 200г", "..."]
}`

// ─── PDF / image system prompt ──────────────────────────────────

const PDF_SYSTEM_PROMPT = `Ты — парсер ТТК (технико-технологических карт) для российского ресторанного ПО.

Тебе даётся изображение или PDF страница с технологической картой.
Извлеки все блюда и их ингредиенты. Верни структурированный JSON.

ПРАВИЛА:
  - Каждое блюдо/рецепт в документе → один элемент dishes[]
  - ПФ, Заготовки, Полуфабрикаты → kind: "preparation"; остальные → kind: "dish"
  - Таблицы с заголовками "Наименование", "Брутто", "Нетто": Нетто = вес ингредиента
  - Единицы: кг → умножь на 1000 → г; л → умножь на 1000 → мл; шт → шт
  - Если вес не указан → netWeight: 0
  - Не выдумывай данных которых нет на странице
  - corrections[] — заметки о неясных местах документа

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

// ─── Gemini call helper ────────────────────────────────────────

async function callGemini(
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

// ─── Public: validate / correct XLSX dishes ────────────────────

export async function validateTTKDishes(
  sheets: SheetInput[],
  apiKey: string,
  examples: TTKExample[] = [],
): Promise<ValidationResult> {
  const systemPrompt = BASE_SYSTEM_PROMPT + buildExamplesSection(examples)

  const parts: string[] = []
  for (const sheet of sheets) {
    parts.push(`=== Лист: "${sheet.name}" ===`)
    if (sheet.rows && sheet.rows.length > 0) {
      const tableText = sheet.rows.slice(0, 250).map(r => r.join('\t')).join('\n')
      parts.push(`Сырые строки таблицы:\n${tableText}`)
    } else {
      parts.push('(сырые строки недоступны)')
    }
    if (sheet.dishes.length > 0) {
      parts.push(`\nАвтопарсинг (${sheet.dishes.length} блюд):\n${JSON.stringify(sheet.dishes, null, 2)}`)
    } else {
      parts.push('\n(список пустой — разбери из сырых строк)')
    }
    parts.push('')
  }

  return callGemini(apiKey, systemPrompt, [{ parts: [{ text: parts.join('\n') }] }])
}

// ─── Public: extract from PDF / image ─────────────────────────

export async function parsePDFTTK(
  fileBase64: string,
  mimeType: string,
  apiKey: string,
  examples: TTKExample[] = [],
): Promise<ValidationResult> {
  const systemPrompt = PDF_SYSTEM_PROMPT + buildExamplesSection(examples)

  const contents = [{
    parts: [
      { inline_data: { mime_type: mimeType, data: fileBase64 } },
      { text: 'Извлеки все блюда и ингредиенты из этой ТТК.' },
    ],
  }]

  return callGemini(apiKey, systemPrompt, contents)
}
