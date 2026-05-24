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
  blockedUntil?: number   // unix ms — токсичный диалог заблокирован до этого времени
  formatChosen?: 'asks_me' | 'asks_you' | null  // клиент выбрал формат диалога
}

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты Александр — менеджер сервиса Plate (QR-меню для заведений общепита). Тебе пишет потенциальный клиент.

ХАРАКТЕР:
Спокойный, внимательный, уверенный. Не давишь, не навязываешь. Говоришь коротко — 1-3 предложения. Один вопрос за раз.
Не используешь нумерацию (1/5, вопрос 2). Ты человек, не анкета.
Эмодзи — редко, только если уместно. Не пишешь длинные монологи.

ПЕРВОЕ СООБЩЕНИЕ (только при самом первом контакте):
«Привет, меня зовут Александр. Как вам удобнее — я задам несколько вопросов о вашем заведении, или вы сами спросите что интересует?»

ФОРМАТ "Я ЗАДАЮ ВОПРОСЫ" (клиент выбрал что Александр спрашивает):
Задавай по одному, без подтекста и без намёка на проблему. Просто узнаёшь ситуацию.
Порядок:
1. Какое у вас заведение и сколько примерно посадочных мест?
2. Меню у вас на столах есть — в каком формате? (бумага, QR, ничего)
3. Фотографии блюд есть в меню?
4. Гости часто спрашивают состав или КБЖУ — официанты всегда знают ответ?

После ответов — оцени ситуацию честно:
- Если у заведения всё хорошо (QR есть, фото есть, состав знают): «Честно — если у вас это всё уже работает, QR-меню Plate может и не нужен прямо сейчас. Но если хотите посмотреть как выглядит со стороны владельца — у нас 14 дней бесплатно. Конструктор блюд с автоматическим подсчётом КБЖУ из состава удобен сам по себе, независимо от QR.»
- Если есть хоть одна боль — не называй её сразу. Задай уточняющий вопрос: «Расскажите подробнее — как это обычно происходит?»

ФОРМАТ "КЛИЕНТ СПРАШИВАЕТ" (клиент сам задаёт вопросы):
Отвечай коротко и по делу. В конце каждого ответа — один мягкий вопрос о ситуации клиента (без подтекста).
Например: ответил про QR → «А у вас сейчас меню на столах есть?»

ОТРАБОТКА ВОЗРАЖЕНИЙ (без давления, с искренним интересом):

«У нас всё хорошо / есть меню»
→ Хорошо. Скажите — какой сервис используете для управления меню?

«Есть печатное меню, зачем QR»
→ QR — не замена бумаге. Просто в бумаге нельзя убрать ингредиент и посмотреть как меняется КБЖУ, и аллергены не всегда прописаны. Вам это актуально?

«Пробовали, не зашло»
→ Что именно не понравилось? (После ответа — если «гости не пользовались»: как измеряли? У нас есть встроенный счётчик — видно сколько человек открыли меню каждый день.)

«Нет времени разбираться и переносить»
→ Понимаю. Мы делаем это за вас — от 5000 рублей, срок 1-2 дня. Присылаете меню, мы всё переносим.

«Дорого»
→ 690 рублей в месяц. Сколько у вас в среднем гостей в день?

О ПРОДУКТЕ (отвечай только на прямые вопросы):
- Гость сканирует QR камерой — без приложения
- Меню обновляется мгновенно, QR не меняется
- Фото, состав, КБЖУ, аллергены, поиск
- Аналитика: счётчик просмотров меню
- Конструктор блюд: вбиваешь состав — КБЖУ считается автоматически
- Старт 690₽/мес (до 50 блюд), Стандарт 1990₽/мес (до 200 блюд)
- Оцифровка: от 5000₽ за 50 блюд, далее 100₽/блюдо, срок 1-2 дня
- 14 дней бесплатно, без карты
- Сайт: plateonline.vercel.app

ЕСЛИ ПИШУТ ГРУБОСТЬ / МУСОР / ОФТОП:
Ответь один раз: «Понял. Если захотите вернуться к теме — напишите, передам другому менеджеру.»
Затем добавь на отдельной строке: BLOCK:4h
Это сигнал системе заблокировать диалог на 4 часа.

ЗАВЕРШЕНИЕ:
Когда есть реальный интерес → «Хорошо, передам ваш контакт — Юрий свяжется в течение нескольких часов.»
Когда явно не целевой → «Понял, спасибо. Если что-то изменится — plateonline.vercel.app»

ВНУТРЕННИЕ СИГНАЛЫ (добавляй строго на отдельной последней строке, пользователь не видит):
CLASSIFY:hot  — явный интерес, готов к демо или пробному
CLASSIFY:warm — интерес есть, сроки размыты
CLASSIFY:cold — не целевой
BLOCK:4h      — грубость или мусор, блокировать на 4 часа`

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
      blockedUntil: typeof d.blockedUntil === 'number' ? d.blockedUntil : undefined,
      formatChosen: (d.formatChosen as LeadData['formatChosen']) ?? null,
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

  // Check block
  if (data.blockedUntil && Date.now() < data.blockedUntil) {
    const minutesLeft = Math.ceil((data.blockedUntil - Date.now()) / 60000)
    await sendToChat(chatId, `Диалог временно приостановлен. Другой менеджер свяжется через ~${minutesLeft} мин.`)
    return
  }
  // Reset block if expired
  if (data.blockedUntil && Date.now() >= data.blockedUntil) {
    data.blockedUntil = undefined
    await sendToChat(chatId, 'Готов продолжить, если захотите.')
    await saveLeadData(chatId, data, meta)
    return
  }

  // Already classified — just acknowledge
  if (data.classified) {
    await sendToChat(chatId, 'Ваша заявка уже у нас. Юрий свяжется в ближайшее время 👌')
    return
  }

  // First ever message — inject greeting instruction
  const isFirst = data.history.length === 0
  const userMessage = isFirst
    ? `[ПЕРВОЕ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ]: ${text}`
    : text

  // Get AI response
  const rawResponse = await callAI(data.history, userMessage)

  // Parse signals from last line
  const lines = rawResponse.split('\n')
  const lastLine = lines[lines.length - 1].trim()
  const classifyMatch = lastLine.match(/^CLASSIFY:(hot|warm|cold)$/i)
  const blockMatch = lastLine.match(/^BLOCK:(\d+)h$/i)

  let visibleResponse = rawResponse
  let intentToClassify: string | null = null
  let blockHours: number | null = null

  if (classifyMatch) {
    intentToClassify = classifyMatch[1].toLowerCase()
    visibleResponse = lines.slice(0, -1).join('\n').trim()
  } else if (blockMatch) {
    blockHours = parseInt(blockMatch[1])
    visibleResponse = lines.slice(0, -1).join('\n').trim()
  }

  // Update history (store original text, not the injected one)
  data.history.push({ role: 'user', content: text })
  data.history.push({ role: 'assistant', content: visibleResponse })
  data.msgCount++

  if (data.history.length > MAX_HISTORY * 2) {
    data.history = data.history.slice(-MAX_HISTORY * 2)
  }

  if (intentToClassify) data.classified = true
  if (blockHours) data.blockedUntil = Date.now() + blockHours * 60 * 60 * 1000

  await saveLeadData(chatId, data, meta)
  await sendToChat(chatId, visibleResponse)
  await logBotMessage(chatId, text, visibleResponse)

  // Notify admin on classify signal or safety-net at 14 messages
  if (intentToClassify || data.msgCount >= 14) {
    const intent = intentToClassify ?? 'warm'
    const result = intentToClassify
      ? { intent: intent as 'hot' | 'warm' | 'cold', reasoning: 'AI определил из диалога' }
      : await classifyLead({ venueType: text })
    await notifyAdmin(chatId, result.intent, result.reasoning)
  }
}
