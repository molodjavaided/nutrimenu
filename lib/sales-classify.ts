const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.5-flash'

export type LeadIntent = 'hot' | 'warm' | 'cold'

export interface ClassifyResult {
  intent: LeadIntent
  reasoning: string
}

export interface LeadAnswers {
  venueType?: string
  seats?: string
  hasMenu?: string
  when?: string
}

export async function classifyLead(answers: LeadAnswers): Promise<ClassifyResult> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return { intent: 'warm', reasoning: 'OPENROUTER_API_KEY not set' }

  const dialog = [
    answers.venueType && `Тип заведения: ${answers.venueType}`,
    answers.seats && `Мест/столов: ${answers.seats}`,
    answers.hasMenu && `Текущее меню: ${answers.hasMenu}`,
    answers.when && `Когда готов: ${answers.when}`,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `Ты квалифицируешь лидов для сервиса Plate — QR-меню для заведений общепита.

Ответы потенциального клиента:
${dialog}

Классифицируй намерение:
- hot: явный интерес, конкретные сроки, готов к демо или оплате
- warm: интерес есть, сроки размыты или есть сомнения
- cold: нет конкретики, нецелевой, не готов в ближайшее время

Ответь строго в JSON без markdown:
{"intent":"hot|warm|cold","reasoning":"одна фраза почему"}`

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0,
      }),
    })
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const text = json.choices?.[0]?.message?.content?.trim() ?? ''
    const parsed = JSON.parse(text) as { intent: LeadIntent; reasoning: string }
    if (['hot', 'warm', 'cold'].includes(parsed.intent)) return parsed
  } catch {
    // fall through
  }
  return { intent: 'warm', reasoning: 'Не удалось разобрать ответ AI' }
}
