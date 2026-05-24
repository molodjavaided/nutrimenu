import { db } from '@/lib/db'
import { sendToChat, sendTelegramMessage, escapeHtml } from '@/lib/telegram'
import { classifyLead, type LeadAnswers } from '@/lib/sales-classify'

/**
 * AI-квалификация лидов для незарегистрированных пользователей бота.
 *
 * Стадии:
 *   new        → приветствие, ждём любого ответа
 *   q1_type    → спросили тип заведения
 *   q2_seats   → спросили кол-во мест/столов
 *   q3_menu    → спросили есть ли цифровое меню сейчас
 *   q4_when    → спросили когда удобно
 *   done       → классифицировали, отправили брифинг
 */
type LeadStage = 'new' | 'q1_type' | 'q2_seats' | 'q3_menu' | 'q4_when' | 'done'

interface LeadState {
  stage: LeadStage
  answers: LeadAnswers
}

const INTENT_EMOJI: Record<string, string> = { hot: '🔥', warm: '🌡', cold: '❄️' }
const INTENT_LABEL: Record<string, string> = { hot: 'Горячий', warm: 'Тёплый', cold: 'Холодный' }

async function getState(chatId: number): Promise<LeadState> {
  const lead = await db.salesLead.findUnique({
    where: { telegramChatId: String(chatId) },
    select: { answers: true },
  })
  if (!lead) return { stage: 'new', answers: {} }
  const a = lead.answers as unknown as LeadState & { stage?: LeadStage }
  return { stage: a.stage ?? 'new', answers: (a.answers as LeadAnswers) ?? {} }
}

async function saveState(chatId: number, state: LeadState, meta?: { username?: string; name?: string }): Promise<void> {
  await db.salesLead.upsert({
    where: { telegramChatId: String(chatId) },
    create: {
      telegramChatId: String(chatId),
      telegramUsername: meta?.username ?? undefined,
      telegramName: meta?.name ?? undefined,
      answers: { stage: state.stage, answers: state.answers } as object,
    },
    update: {
      answers: { stage: state.stage, answers: state.answers } as object,
      ...(meta?.username ? { telegramUsername: meta.username } : {}),
      ...(meta?.name ? { telegramName: meta.name } : {}),
    },
  })
}

async function finish(chatId: number, state: LeadState): Promise<void> {
  const result = await classifyLead(state.answers)

  await db.salesLead.update({
    where: { telegramChatId: String(chatId) },
    data: {
      intent: result.intent,
      reasoning: result.reasoning,
      notified: true,
      answers: { stage: 'done', answers: state.answers } as object,
    },
  })

  // Notify admin
  const lead = await db.salesLead.findUnique({ where: { telegramChatId: String(chatId) } })
  const who = lead?.telegramUsername ? `@${lead.telegramUsername}` : (lead?.telegramName ?? `chat ${chatId}`)
  const a = state.answers

  await sendTelegramMessage(
    `${INTENT_EMOJI[result.intent]} <b>Новый лид — ${INTENT_LABEL[result.intent]}</b>\n\n` +
    `От: ${escapeHtml(who)}\n` +
    `Тип заведения: ${escapeHtml(a.venueType ?? '—')}\n` +
    `Мест/столов: ${escapeHtml(a.seats ?? '—')}\n` +
    `Цифровое меню: ${escapeHtml(a.hasMenu ?? '—')}\n` +
    `Когда готов: ${escapeHtml(a.when ?? '—')}\n\n` +
    `AI: <i>${escapeHtml(result.reasoning)}</i>\n\n` +
    (result.intent === 'hot'
      ? `💬 Написать лиду: <a href="tg://user?id=${chatId}">открыть чат</a>`
      : `💬 tg://user?id=${chatId}`)
  )
}

export async function handleSalesLead(
  chatId: number,
  text: string,
  meta?: { username?: string; name?: string },
): Promise<void> {
  const state = await getState(chatId)

  if (state.stage === 'done') {
    await sendToChat(
      chatId,
      'Спасибо, мы уже получили вашу заявку! Свяжемся в ближайшее время. Если хотите ускорить — напишите напрямую: @feadbackmenu_bot',
    )
    return
  }

  switch (state.stage) {
    case 'new':
      state.stage = 'q1_type'
      await saveState(chatId, state, meta)
      await sendToChat(
        chatId,
        `Привет! Я помогу подобрать подходящий формат Plate для вашего заведения.\n\n` +
        `1/4 · Какой формат заведения?\n\nНапример: кафе, ресторан, кофейня, столовая, пекарня.`,
      )
      break

    case 'q1_type':
      state.answers.venueType = text
      state.stage = 'q2_seats'
      await saveState(chatId, state, meta)
      await sendToChat(chatId, `2/4 · Сколько посадочных мест или столов?`)
      break

    case 'q2_seats':
      state.answers.seats = text
      state.stage = 'q3_menu'
      await saveState(chatId, state, meta)
      await sendToChat(
        chatId,
        `3/4 · Есть ли у вас сейчас цифровое меню (QR-код, сайт, приложение)?\n\nЕсли нет — так и напишите.`,
      )
      break

    case 'q3_menu':
      state.answers.hasMenu = text
      state.stage = 'q4_when'
      await saveState(chatId, state, meta)
      await sendToChat(
        chatId,
        `4/4 · Когда планируете запустить или хотите попробовать?\n\nНапример: «в этом месяце», «просто смотрю», «срочно нужно».`,
      )
      break

    case 'q4_when':
      state.answers.when = text
      state.stage = 'done'
      await saveState(chatId, state, meta)
      await sendToChat(
        chatId,
        `Отлично, спасибо! Передал вашу заявку — мы свяжемся в течение нескольких часов.\n\n` +
        `Пока можете посмотреть как выглядит меню для гостей: plateonline.vercel.app`,
      )
      await finish(chatId, state)
      break
  }
}
