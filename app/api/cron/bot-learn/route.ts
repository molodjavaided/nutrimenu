import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Weekly cron: analyses last 7 days of bot conversations,
 * extracts frequent Q&A patterns, upserts into BotKnowledge.
 * Called by Vercel Cron (see vercel.json).
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const logs = await db.botConversationLog.findMany({
    where: { createdAt: { gte: since } },
    select: { userMessage: true, botResponse: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  if (logs.length < 5) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'not enough data' })
  }

  const key = process.env.OPENROUTER_API_KEY
  if (!key) return NextResponse.json({ error: 'no api key' }, { status: 500 })

  const sample = logs.slice(0, 80).map((l: { userMessage: string; botResponse: string }) =>
    `Вопрос: ${l.userMessage}\nОтвет бота: ${l.botResponse}`
  ).join('\n\n---\n\n')

  const prompt = `Проанализируй диалоги менеджера по продажам QR-меню Plate с потенциальными клиентами.

${sample}

Выдели до 10 самых частых типов вопросов/возражений и лучшие ответы на них.
Ответь строго в JSON без markdown:
[{"question":"...", "answer":"...", "frequency": N}]`

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0,
    }),
  })

  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const text = json.choices?.[0]?.message?.content?.trim() ?? ''

  let patterns: Array<{ question: string; answer: string; frequency: number }> = []
  try {
    patterns = JSON.parse(text)
  } catch {
    return NextResponse.json({ ok: false, error: 'failed to parse AI response', text })
  }

  for (const p of patterns) {
    const existing = await db.botKnowledge.findFirst({ where: { question: p.question } })
    if (existing) {
      await db.botKnowledge.update({
        where: { id: existing.id },
        data: { answer: p.answer, frequency: existing.frequency + p.frequency },
      })
    } else {
      await db.botKnowledge.create({ data: p })
    }
  }

  return NextResponse.json({ ok: true, patterns: patterns.length, logs: logs.length })
}
