import Anthropic from '@anthropic-ai/sdk'

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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function classifyLead(answers: LeadAnswers): Promise<ClassifyResult> {
  const dialog = [
    answers.venueType && `Тип заведения: ${answers.venueType}`,
    answers.seats && `Мест/столов: ${answers.seats}`,
    answers.hasMenu && `Текущее меню: ${answers.hasMenu}`,
    answers.when && `Когда готов: ${answers.when}`,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `Ты квалифицируешь лидов для сервиса Plate — QR-меню для заведений общепита (кафе, кофейни, рестораны).

Ответы потенциального клиента:
${dialog}

Классифицируй намерение купить по трём уровням:
- hot: явный интерес, конкретные сроки, готов к демо или оплате
- warm: интерес есть, но сроки размыты или есть сомнения
- cold: нет конкретики, нецелевой, не готов в ближайшее время

Ответь строго в JSON без markdown:
{"intent":"hot|warm|cold","reasoning":"одна фраза почему"}`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
  try {
    const parsed = JSON.parse(text) as { intent: LeadIntent; reasoning: string }
    if (['hot', 'warm', 'cold'].includes(parsed.intent)) return parsed
  } catch {
    // fall through
  }
  return { intent: 'warm', reasoning: 'Не удалось разобрать ответ AI' }
}
