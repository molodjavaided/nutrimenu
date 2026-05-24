import { db } from '@/lib/db'
import { sendToChat, sendTelegramMessage, escapeHtml } from '@/lib/telegram'
import { classifyLead } from '@/lib/sales-classify'

const INTENT_EMOJI: Record<string, string> = { hot: '🔥', warm: '🌡', cold: '❄️' }
const INTENT_LABEL: Record<string, string> = { hot: 'Горячий', warm: 'Тёплый', cold: 'Холодный' }

// Max messages kept in context per conversation
const MAX_HISTORY = 20

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface LeadData {
  history: ChatMessage[]
  classified: boolean
  msgCount: number
}

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты Александр — менеджер по продажам сервиса Plate (QR-меню для заведений общепита).

ХАРАКТЕР И СТИЛЬ (по методу Гребенюка):
- Уверенный, прямой, без лишних слов. Не извиняешься, не заискиваешь.
- Говоришь коротко — 1-3 предложения на сообщение. Никаких списков и маркеров.
- Задаёшь один вопрос за раз, не несколько.
- Сначала выслушиваешь и понимаешь боль, потом предлагаешь решение.
- Не продаёшь продукт — продаёшь результат. Не «у нас есть QR-меню», а «гости перестанут стоять в очереди у кассы».
- Если клиент уходит в сторону — мягко, но уверенно возвращаешь к теме.

ЦЕЛЬ ДИАЛОГА:
За 5-7 сообщений выяснить: есть ли боль, готов ли к изменениям, когда.
После этого — передать контакт менеджеру (Юрию).

ВЫЯВЛЕНИЕ БОЛИ — три главные:
1. Очередь у кассы: гость встаёт, идёт смотреть меню, возвращается — замедляет весь поток
2. Нет фото: гость не знает как выглядит блюдо, берёт меньше незнакомых позиций
3. Состав и КБЖУ: официант не знает точный состав, гости с аллергией или на диете раздражаются или уходят

Хорошие вопросы для выявления боли:
- «Как у вас сейчас гости смотрят меню — подходят к кассе или есть что-то на столах?»
- «Бывало что гость спрашивал состав блюда, а официант не знал точно?»
- «Фотографии блюд у вас есть в меню или только названия с ценами?»

ОТРАБОТКА ВОЗРАЖЕНИЙ:

«У нас и так всё хорошо / есть печатное меню»
→ Понимаю. Скажите — в печатном меню гость может убрать ингредиент из состава и сразу увидеть как изменится КБЖУ? Или посмотреть аллергены? Мы закрываем то, что бумага физически не может.

«Зачем нам QR, у нас есть меню»
→ QR — это не замена меню, это меню на каждом столе. Гость выбирает сидя, а не стоя у кассы. Это напрямую влияет на средний чек.

«Пробовали, не зашло»
→ Что конкретно не понравилось? (Слушай ответ.) Если говорит «гости не пользовались»: как измеряли? У нас встроен счётчик — видно сколько человек открыли меню каждый день.

«Нет времени разбираться и переносить»
→ Понимаю, с этим сталкивается большинство. Именно поэтому мы сделали услугу оцифровки — от 5000 рублей, срок 1-2 дня. Вы только присылаете своё меню, мы всё переносим сами.

«Дорого»
→ 690 рублей в месяц. Если меню на каждом столе добавит хотя бы 2-3 дополнительных заказа в день — это окупается за один день.

О ПРОДУКТЕ (если спрашивают):
- Гость сканирует QR камерой телефона, без приложения
- Меню обновляется мгновенно, QR не меняется
- Показывает фото, состав, КБЖУ, аллергены
- Есть счётчик просмотров в аналитике
- Тарифы: Старт 690₽/мес (до 50 блюд), Стандарт 1990₽/мес (до 200 блюд)
- Оцифровка меню под ключ: от 5000₽ (до 50 блюд), далее 100₽ за блюдо, срок 1-2 дня
- 14 дней бесплатного пробного периода
- Сайт: plateonline.vercel.app

ЗАВЕРШЕНИЕ:
Когда понял что боль есть и человек открыт — скажи что передашь контакт Юрию и он свяжется.
Когда понял что не целевой — вежливо завершай, не трать время.

ВАЖНО:
- Никогда не пиши «1/5», «вопрос 2» и т.п. — ты не анкета, ты человек.
- Не используй эмодзи в каждом сообщении — только если уместно.
- Не пиши длинные монологи. Диалог — это обмен, не лекция.
- Если не знаешь ответа на вопрос — честно скажи что уточнишь у команды.

ВНУТРЕННИЙ СИГНАЛ (не показывай пользователю):
Когда собрал достаточно информации (обычно после 5-7 обменов), добавь в конец своего ответа строго на отдельной строке:
CLASSIFY:hot
или CLASSIFY:warm
или CLASSIFY:cold
Это невидимо для пользователя — только для системы.`

// ─── OpenRouter call ──────────────────────────────────────────────────────────

async function callAI(history: ChatMessage[], userMessage: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return 'Привет! К сожалению, сервис временно недоступен. Попробуйте позже.'

  const messages = [
    ...history.slice(-MAX_HISTORY),
    { role: 'user' as const, content: userMessage },
  ]

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 400,
      temperature: 0.7,
    }),
  })

  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  return json.choices?.[0]?.message?.content?.trim() ?? 'Что-то пошло не так, попробуйте ещё раз.'
}

// ─── State helpers ────────────────────────────────────────────────────────────

async function getLead(chatId: number) {
  return db.salesLead.findUnique({ where: { telegramChatId: String(chatId) } })
}

function parseLeadData(raw: unknown): LeadData {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const d = raw as Record<string, unknown>
    return {
      history: Array.isArray(d.history) ? (d.history as ChatMessage[]) : [],
      classified: Boolean(d.classified),
      msgCount: typeof d.msgCount === 'number' ? d.msgCount : 0,
    }
  }
  return { history: [], classified: false, msgCount: 0 }
}

async function saveLeadData(chatId: number, data: LeadData, meta?: { username?: string; name?: string }) {
  await db.salesLead.upsert({
    where: { telegramChatId: String(chatId) },
    create: {
      telegramChatId: String(chatId),
      telegramUsername: meta?.username,
      telegramName: meta?.name,
      answers: data as unknown as object,
    },
    update: {
      answers: data as unknown as object,
      ...(meta?.username ? { telegramUsername: meta.username } : {}),
      ...(meta?.name ? { telegramName: meta.name } : {}),
    },
  })
}

// ─── Notify admin ─────────────────────────────────────────────────────────────

async function notifyAdmin(chatId: number, intent: string, reasoning: string): Promise<void> {
  const lead = await getLead(chatId)
  const data = parseLeadData(lead?.answers)
  const who = lead?.telegramUsername ? `@${lead.telegramUsername}` : (lead?.telegramName ?? `id ${chatId}`)

  // Build readable summary from last few messages
  const lastMsgs = data.history.slice(-6).map(m =>
    `${m.role === 'user' ? '👤' : '🤖'} ${m.content}`
  ).join('\n')

  await sendTelegramMessage(
    `${INTENT_EMOJI[intent] ?? '📩'} <b>Новый лид — ${INTENT_LABEL[intent] ?? intent}</b>\n\n` +
    `От: ${escapeHtml(who)}\n` +
    `AI: <i>${escapeHtml(reasoning)}</i>\n\n` +
    `<b>Диалог:</b>\n${escapeHtml(lastMsgs)}\n\n` +
    `💬 <a href="tg://user?id=${chatId}">Написать лиду</a>`
  )

  await db.salesLead.update({
    where: { telegramChatId: String(chatId) },
    data: { intent, reasoning, notified: true },
  })
}

// ─── Self-learning: log frequent unhandled questions ─────────────────────────

async function logBotMessage(chatId: number, userMsg: string, botMsg: string): Promise<void> {
  // Store in BotKnowledge for weekly analysis
  try {
    await db.botConversationLog.create({
      data: {
        telegramChatId: String(chatId),
        userMessage: userMsg,
        botResponse: botMsg,
      },
    })
  } catch {
    // Table may not exist yet — non-fatal
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function handleSalesLead(
  chatId: number,
  text: string,
  meta?: { username?: string; name?: string },
): Promise<void> {
  const lead = await getLead(chatId)
  const data = parseLeadData(lead?.answers)

  // Already classified — just acknowledge
  if (data.classified) {
    await sendToChat(chatId, 'Ваша заявка уже у нас. Юрий свяжется в ближайшее время 👌')
    return
  }

  // Get AI response
  const rawResponse = await callAI(data.history, text)

  // Check for classify signal (last line: CLASSIFY:hot/warm/cold)
  const lines = rawResponse.split('\n')
  const lastLine = lines[lines.length - 1].trim()
  const classifyMatch = lastLine.match(/^CLASSIFY:(hot|warm|cold)$/i)

  let visibleResponse: string
  let intentToClassify: string | null = null

  if (classifyMatch) {
    intentToClassify = classifyMatch[1].toLowerCase()
    visibleResponse = lines.slice(0, -1).join('\n').trim()
  } else {
    visibleResponse = rawResponse
  }

  // Update history
  data.history.push({ role: 'user', content: text })
  data.history.push({ role: 'assistant', content: visibleResponse })
  data.msgCount++

  // Keep history trimmed
  if (data.history.length > MAX_HISTORY * 2) {
    data.history = data.history.slice(-MAX_HISTORY * 2)
  }

  if (intentToClassify) {
    data.classified = true
  }

  await saveLeadData(chatId, data, meta)
  await sendToChat(chatId, visibleResponse)
  await logBotMessage(chatId, text, visibleResponse)

  // Classify after signal or after 14 messages (safety net)
  if (intentToClassify || data.msgCount >= 14) {
    const intent = intentToClassify ?? 'warm'
    const result = intentToClassify
      ? { intent: intent as 'hot' | 'warm' | 'cold', reasoning: 'AI сигнал из диалога' }
      : await classifyLead({ venueType: text })

    await notifyAdmin(chatId, result.intent, result.reasoning)
  }
}
