import { db } from '@/lib/db'
import { put } from '@vercel/blob'
import { downloadTelegramFile, escapeHtml, getTelegramFile, sendToChat } from '@/lib/telegram'

/**
 * Lightweight 5-question briefing run inside Telegram bot.
 * State is stored on Venue.briefingState (JSON).
 *
 * Stages:
 *   greet         → just sent welcome, waiting nothing
 *   q1_type       → asked venue type
 *   q2_dishes     → asked dish count
 *   q3_ttk        → asked for TTK files (loop until user says "готово" or "пропустить")
 *   q4_photos     → asked for photos (loop until done)
 *   q5_when       → asked when to call
 *   done          → finished
 */
export type BriefingStage =
  | 'greet'
  | 'q1_type'
  | 'q2_dishes'
  | 'q3_ttk'
  | 'q4_photos'
  | 'q5_when'
  | 'done'

export interface BriefingState {
  stage: BriefingStage
  answers: {
    type?: string
    dishes?: string
    when?: string
  }
  ttkFiles: number
  photoFiles: number
}

export function initialState(): BriefingState {
  return { stage: 'greet', answers: {}, ttkFiles: 0, photoFiles: 0 }
}

const PROMPTS: Record<BriefingStage, string> = {
  greet: '',
  q1_type:
    '1/5 · Какое у вас заведение?\n\nНапример: кафе, ресторан, кофейня, бар, пекарня, столовая.',
  q2_dishes:
    '2/5 · Сколько примерно блюд в меню? Можно цифрой или диапазоном, например «35» или «50–80».',
  q3_ttk:
    '3/5 · Есть ли у вас технико-технологические карты (ТТК)?\n\n' +
    'Если есть — прикрепите файлы (PDF, Word, Excel или фото). Можно отправлять несколько подряд.\n\n' +
    'Когда закончите — напишите «готово».\nЕсли ТТК нет — напишите «пропустить».',
  q4_photos:
    '4/5 · Есть ли фото блюд? Прикрепите, что есть — можно несколько.\n\n' +
    'Когда закончите — напишите «готово». Если фото нет — «пропустить».',
  q5_when:
    '5/5 · Когда удобно созвониться или списаться?\n\nНапример: «после 15:00 по будням», «в любое время в выходные».',
  done:
    '✅ Готово! Спасибо. Юрий (наш админ) посмотрит и свяжется в течение 24 часов.\n\n' +
    'Все материалы уже у нас, ничего больше отправлять не нужно.\n\n' +
    'Ответ от админа придёт прямо сюда в бот.',
}

const NORMALIZED = (s: string) => s.toLowerCase().trim()

function isDoneWord(s: string) {
  const n = NORMALIZED(s)
  return n === 'готово' || n === 'дальше' || n === 'все' || n === 'всё'
}
function isSkipWord(s: string) {
  const n = NORMALIZED(s)
  return n === 'пропустить' || n === 'нет' || n === 'skip'
}

/** Persist state. */
async function setState(venueId: string, state: BriefingState, finished = false): Promise<void> {
  await db.venue.update({
    where: { id: venueId },
    data: {
      briefingState: state as unknown as object,
      ...(finished ? { briefingCompletedAt: new Date() } : {}),
    },
  })
}

/** Append a message to the venue's Feedback thread (creating it if needed). */
async function mirrorToThread(venueId: string, ownerUserId: string, role: 'OWNER' | 'ADMIN', message: string): Promise<void> {
  let thread = await db.feedback.findFirst({
    where: { venueId, userId: ownerUserId, category: 'billing' },
    orderBy: { createdAt: 'desc' },
  })
  if (!thread) {
    thread = await db.feedback.create({
      data: {
        source: 'OWNER',
        category: 'billing',
        message: '[Telegram-бот] начат брифинг',
        venueId,
        userId: ownerUserId,
      },
    })
  }
  await db.$transaction([
    db.feedbackReply.create({
      data: {
        feedbackId: thread.id,
        authorRole: role,
        authorId: ownerUserId,
        message,
      },
    }),
    db.feedback.update({
      where: { id: thread.id },
      data: { lastReplyAt: new Date(), adminUnread: role === 'OWNER', ownerUnread: role === 'ADMIN' },
    }),
  ])
}

/** Save an incoming file from Telegram to Vercel Blob + record VenueFile + mirror to thread. */
async function saveIncomingFile(args: {
  venueId: string
  ownerUserId: string
  fileId: string
  filename: string
  mimeType: string
  category: 'ttk' | 'photo' | 'menu_source' | 'other'
}): Promise<boolean> {
  const meta = await getTelegramFile(args.fileId)
  if (!meta?.file_path) return false
  const dl = await downloadTelegramFile(meta.file_path)
  if (!dl) return false

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[briefing] BLOB token missing — cannot persist file')
    return false
  }

  const safeName = (args.filename || meta.file_path.split('/').pop() || 'file').replace(/[^\w.\-]/g, '_').slice(0, 80)
  const blobPath = `venue-files/${args.venueId}/${Date.now()}-${safeName}`
  const blob = await put(blobPath, dl.buffer, { access: 'public', addRandomSuffix: true, contentType: dl.contentType })

  await db.venueFile.create({
    data: {
      venueId: args.venueId,
      uploadedById: args.ownerUserId,
      uploaderRole: 'OWNER',
      category: args.category,
      filename: safeName,
      url: blob.url,
      size: dl.buffer.byteLength,
      mimeType: dl.contentType,
      notes: 'Загружено через Telegram-бот',
    },
  })
  await mirrorToThread(args.venueId, args.ownerUserId, 'OWNER', `📎 Файл (${args.category}): ${safeName}`)
  return true
}

interface IncomingMessage {
  chatId: number
  text?: string
  document?: { file_id: string; file_name?: string; mime_type?: string }
  photo?: Array<{ file_id: string; width: number; height: number; file_size?: number }>
}

/** Main dispatcher for non-/start messages. */
export async function handleBriefingMessage(venueId: string, ownerUserId: string, msg: IncomingMessage): Promise<void> {
  const venue = await db.venue.findUnique({ where: { id: venueId }, select: { briefingState: true } })
  const state = (venue?.briefingState as BriefingState | null) ?? initialState()

  // File upload during file-collection stages
  if (msg.document || msg.photo) {
    const stage = state.stage
    if (stage !== 'q3_ttk' && stage !== 'q4_photos') {
      await sendToChat(
        msg.chatId,
        'Спасибо! Сейчас не этап для файлов — пока ответьте на вопрос текстом, дойдём до прикреплений.',
      )
      return
    }
    const cat: 'ttk' | 'photo' = stage === 'q3_ttk' ? 'ttk' : 'photo'

    if (msg.document) {
      const ok = await saveIncomingFile({
        venueId,
        ownerUserId,
        fileId: msg.document.file_id,
        filename: msg.document.file_name ?? 'document',
        mimeType: msg.document.mime_type ?? 'application/octet-stream',
        category: cat,
      })
      if (ok) {
        if (cat === 'ttk') state.ttkFiles++; else state.photoFiles++
      }
    }
    if (msg.photo && msg.photo.length) {
      // Use highest-resolution photo (last in array)
      const largest = msg.photo[msg.photo.length - 1]
      const ok = await saveIncomingFile({
        venueId,
        ownerUserId,
        fileId: largest.file_id,
        filename: `photo-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        category: cat,
      })
      if (ok) state.photoFiles++
    }
    await setState(venueId, state)
    await sendToChat(
      msg.chatId,
      `Принято ✅ (всего ${cat === 'ttk' ? state.ttkFiles + ' ТТК' : state.photoFiles + ' фото'}). Прикрепите ещё или напишите «готово».`,
    )
    return
  }

  const text = (msg.text ?? '').trim()
  if (!text) return

  // Mirror owner's text to thread (skip done/skip control words to keep thread clean)
  if (!isDoneWord(text) && !isSkipWord(text)) {
    await mirrorToThread(venueId, ownerUserId, 'OWNER', text)
  }

  // Advance state machine
  switch (state.stage) {
    case 'greet':
    case 'q1_type':
      state.answers.type = text
      state.stage = 'q2_dishes'
      await sendToChat(msg.chatId, PROMPTS.q2_dishes)
      break

    case 'q2_dishes':
      state.answers.dishes = text
      state.stage = 'q3_ttk'
      await sendToChat(msg.chatId, PROMPTS.q3_ttk)
      break

    case 'q3_ttk':
      if (isDoneWord(text) || isSkipWord(text)) {
        state.stage = 'q4_photos'
        await sendToChat(msg.chatId, PROMPTS.q4_photos)
      } else {
        await sendToChat(
          msg.chatId,
          'Прикрепите файлы вложениями или напишите «готово» / «пропустить».',
        )
      }
      break

    case 'q4_photos':
      if (isDoneWord(text) || isSkipWord(text)) {
        state.stage = 'q5_when'
        await sendToChat(msg.chatId, PROMPTS.q5_when)
      } else {
        await sendToChat(
          msg.chatId,
          'Прикрепите фото или напишите «готово» / «пропустить».',
        )
      }
      break

    case 'q5_when':
      state.answers.when = text
      state.stage = 'done'
      await sendToChat(msg.chatId, PROMPTS.done)
      await setState(venueId, state, /*finished*/ true)
      // Final summary mirrored to thread
      const summary = [
        '📋 <b>Брифинг завершён</b>',
        `Тип: ${escapeHtml(state.answers.type ?? '—')}`,
        `Блюд: ${escapeHtml(state.answers.dishes ?? '—')}`,
        `ТТК-файлов: ${state.ttkFiles}`,
        `Фото: ${state.photoFiles}`,
        `Связь: ${escapeHtml(state.answers.when ?? '—')}`,
      ].join('\n')
      await mirrorToThread(venueId, ownerUserId, 'OWNER', summary)
      return

    case 'done':
      // After done, everything goes straight to the thread for admin to see
      // (no automatic answer beyond mirroring already done above)
      await sendToChat(msg.chatId, 'Принято, передал админу 👌')
      break
  }
  await setState(venueId, state)
}

/** Called on /start with a verified venueId. */
export async function startBriefing(venueId: string, ownerUserId: string, chatId: number): Promise<void> {
  await db.user.update({
    where: { id: ownerUserId },
    data: { telegramChatId: String(chatId) },
  })

  const state = initialState()
  state.stage = 'q1_type'
  await setState(venueId, state)

  const venue = await db.venue.findUnique({ where: { id: venueId }, select: { name: true } })
  const venueName = venue?.name ?? 'ваше заведение'

  await sendToChat(
    chatId,
    `Привет! Это бот сервиса Plate.\n\n` +
      `Поможем настроить цифровое меню для «${escapeHtml(venueName)}». Сейчас задам 5 коротких вопросов и попрошу прислать материалы (ТТК, фото) — потом всё посмотрит админ и свяжется с вами.\n\n` +
      PROMPTS.q1_type,
  )
  await mirrorToThread(venueId, ownerUserId, 'OWNER', '🤖 Брифинг в Telegram-боте запущен')
}
