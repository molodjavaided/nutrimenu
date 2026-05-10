// Benchmark TTK parsing across models on real-world files.
// Usage: node scripts/benchmark-ttk.mjs

import XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const dotenv = await import('dotenv')
dotenv.config({ path: '.env.local' })

const FILES_DIR = 'C:/Users/Юрий/OneDrive/Рабочий стол/ТТК'
const FILES = fs.readdirSync(FILES_DIR).filter(f => f.toLowerCase().endsWith('.xlsx'))

const SYSTEM_PROMPT = `Ты — парсер ТТК (технико-технологических карт) для российского ресторанного ПО.
Тебе передаются строки таблицы (cells разделены TAB, листы — заголовком "=== Лист: ... ===").
Задача: извлечь все блюда (kind: "dish") и заготовки/полуфабрикаты (kind: "preparation") с их ингредиентами.

ЕДИНИЦЫ: г, кг(*1000)→г, мл, л(*1000)→мл, шт. Без единицы — "г".
ВЕС: "120/100/100" → 120; "0.15 кг" → 150 г; "от 17 до 19" → 18.
МУСОР: строки "Итого", "Выход", "№", заголовки таблиц, листы с "Закуп/Поставщик" — пропустить.

Верни ТОЛЬКО JSON без markdown:
{"dishes":[{"name":"...","category":"<имя листа>","kind":"dish|preparation","ingredients":[{"ingredientName":"...","netWeight":150,"unit":"г"}]}]}`

function loadSheets(filepath) {
  const wb = XLSX.readFile(filepath)
  const out = []
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    const cleaned = rows
      .map(r => r.map(c => String(c ?? '').trim()))
      .filter(r => r.some(c => c))
      .slice(0, 200)
    if (cleaned.length >= 2) out.push({ name, rows: cleaned })
  }
  return out
}

function buildUserMessage(sheets) {
  const parts = []
  for (const s of sheets) {
    parts.push(`=== Лист: "${s.name}" ===`)
    parts.push(s.rows.map(r => r.map(c => c.length > 200 ? c.slice(0, 200) + '…' : c).join('\t')).join('\n'))
  }
  return parts.join('\n\n').slice(0, 60000)
}

function parseJSON(text) {
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```\s*$/, '').trim()
  try {
    const j = JSON.parse(clean)
    return Array.isArray(j.dishes) ? j.dishes : []
  } catch {
    const m = clean.match(/\{[\s\S]*\}/)
    if (m) try { return JSON.parse(m[0]).dishes ?? [] } catch {}
    return null
  }
}

async function callGemini(model, userMessage) {
  const key = process.env.GEMINI_API_KEY
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 16384, temperature: 0, responseMimeType: 'application/json' },
      }),
    },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json()
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return text
}

async function callOpenRouter(model, userMessage) {
  const key = process.env.OPENROUTER_API_KEY
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://nutrimenu.local',
      'X-Title': 'NutriMenu TTK Benchmark',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 16384,
      temperature: 0,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json()
  return json.choices?.[0]?.message?.content ?? ''
}

const MODELS = [
  { id: 'gemini-flash', label: 'Gemini 2.0 Flash', call: m => callOpenRouter('google/gemini-2.0-flash-001', m) },
  { id: 'gemini-pro',   label: 'Gemini 2.5 Pro',   call: m => callOpenRouter('google/gemini-2.5-pro', m) },
  { id: 'sonnet-45',    label: 'Claude Sonnet 4.5', call: m => callOpenRouter('anthropic/claude-sonnet-4.5', m) },
]

function metrics(dishes) {
  if (!dishes) return { dishes: '—', ings: '—', avg: '—', preps: '—', zeroW: '—' }
  const ings = dishes.reduce((s, d) => s + (d.ingredients?.length ?? 0), 0)
  const preps = dishes.filter(d => d.kind === 'preparation').length
  const zeroW = dishes.flatMap(d => d.ingredients ?? []).filter(i => !i.netWeight).length
  return {
    dishes: dishes.length,
    ings,
    avg: dishes.length ? (ings / dishes.length).toFixed(1) : 0,
    preps,
    zeroW,
  }
}

const results = []

for (const file of FILES) {
  const fp = path.join(FILES_DIR, file)
  if (!fs.existsSync(fp)) {
    console.log(`SKIP missing: ${file}`)
    continue
  }
  const sheets = loadSheets(fp)
  const totalRows = sheets.reduce((s, x) => s + x.rows.length, 0)
  const userMsg = buildUserMessage(sheets)
  console.log(`\n📄 ${file}`)
  console.log(`   Листов: ${sheets.length}, строк: ${totalRows}, токенов(~): ${Math.round(userMsg.length / 4)}`)

  for (const model of MODELS) {
    const t0 = Date.now()
    let dishes = null
    let err = null
    try {
      const text = await model.call(userMsg)
      dishes = parseJSON(text)
      if (!dishes) err = 'JSON parse failed'
    } catch (e) {
      err = String(e.message || e).slice(0, 120)
    }
    const ms = Date.now() - t0
    const m = metrics(dishes)
    results.push({ file, model: model.label, ms, ...m, err })
    console.log(`   ${model.label.padEnd(20)} ${ms}ms  блюд:${m.dishes}  ингр:${m.ings}  ПФ:${m.preps}  ø:${m.avg}  zero-w:${m.zeroW}  ${err ?? ''}`)
  }
}

// Summary table
console.log('\n\n═══ ИТОГОВАЯ ТАБЛИЦА ═══\n')
const head = '| Файл | Модель | Блюд | Ингр | ø/блюдо | ПФ | Zero-w | Время | Ошибка |'
const sep =  '|------|--------|-----:|-----:|--------:|---:|-------:|------:|--------|'
console.log(head)
console.log(sep)
for (const r of results) {
  const file = r.file.length > 30 ? r.file.slice(0, 28) + '…' : r.file
  console.log(`| ${file} | ${r.model} | ${r.dishes} | ${r.ings} | ${r.avg} | ${r.preps} | ${r.zeroW} | ${r.ms}ms | ${r.err ?? ''} |`)
}

fs.writeFileSync('.tmp/benchmark-ttk-results.json', JSON.stringify(results, null, 2))
console.log('\n💾 .tmp/benchmark-ttk-results.json')
