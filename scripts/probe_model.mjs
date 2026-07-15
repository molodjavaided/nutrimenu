// Дешёвый пробный вызов LLM на РЕАЛЬНОМ примере блюда — перед сменой промпта/модели импорта.
// Печатает какую модель дёрнул и СЫРОЙ ответ (без парсинга), чтобы глазами увидеть что вернулось.
//
// Usage:
//   node scripts/probe_model.mjs                       # дефолтный пример блюда, Gemini
//   node scripts/probe_model.mjs "Омлет: 2 яйца, 30 мл молока, 5 г масла"
//   node scripts/probe_model.mjs --provider=openrouter --model=google/gemini-2.0-flash-001 "..."
//
// Провайдеры по умолчанию — как в проде: gemini (GEMINI_API_KEY) или openrouter (OPENROUTER_API_KEY).
// НЕ добавляй сюда новых провайдеров — зоопарк Gemini+Perplexity(Sonar)+Claude достаточен.

const dotenv = await import('dotenv')
dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const flags = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => a.replace(/^--/, '').split('=')),
)
const dish =
  args.filter(a => !a.startsWith('--')).join(' ').trim() ||
  'Сырники: 200 г творога 9%, 1 яйцо, 30 г муки, 20 г сахара, жарка на 10 г масла'

const provider = flags.provider || 'gemini'
const model =
  flags.model || (provider === 'gemini' ? (process.env.GEMINI_MODEL || 'gemini-2.0-flash') : 'google/gemini-2.0-flash-001')

const SYSTEM = `Ты — парсер состава блюда для российского ресторанного ПО.
Верни ТОЛЬКО JSON без markdown:
{"name":"...","ingredients":[{"ingredientName":"...","netWeight":<г>,"unit":"г"}]}`

async function callGemini(userMessage) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY отсутствует в .env.local')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 }, // см. feedback_gemini_thinking_trap
        },
      }),
    },
  )
  const bodyText = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${bodyText.slice(0, 400)}`)
  const json = JSON.parse(bodyText)
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '(пустой text-part — см. feedback_gemini_thinking_trap)'
}

async function callOpenRouter(userMessage) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY отсутствует в .env.local')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://nutrimenu.local',
      'X-Title': 'NutriMenu probe',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 2048,
      temperature: 0,
    }),
  })
  const bodyText = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${bodyText.slice(0, 400)}`)
  return JSON.parse(bodyText).choices?.[0]?.message?.content ?? '(пустой ответ)'
}

console.log(`▶ provider: ${provider}`)
console.log(`▶ model:    ${model}`)
console.log(`▶ блюдо:    ${dish}\n`)

const t0 = Date.now()
try {
  const raw = provider === 'openrouter' ? await callOpenRouter(dish) : await callGemini(dish)
  console.log(`✅ ответ за ${Date.now() - t0}ms — СЫРОЙ:\n`)
  console.log(raw)
} catch (e) {
  console.error(`❌ ${e.message || e}`)
  process.exit(1)
}
