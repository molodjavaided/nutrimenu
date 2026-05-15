import { createHmac, timingSafeEqual } from 'node:crypto'

const TG_API = 'https://api.telegram.org'

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null
}

interface SendOptions {
  parse_mode?: 'HTML' | 'MarkdownV2'
  disable_web_page_preview?: boolean
  reply_markup?: unknown
}

async function tgFetch<T = unknown>(method: string, body: unknown): Promise<T | null> {
  const t = token()
  if (!t) {
    console.warn(`[tg] no token, skipping ${method}`)
    return null
  }
  try {
    const res = await fetch(`${TG_API}/bot${t}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error(`[tg] ${method} failed:`, res.status, txt)
      return null
    }
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string }
    if (!json.ok) {
      console.error(`[tg] ${method} not ok:`, json.description)
      return null
    }
    return json.result ?? null
  } catch (err) {
    console.error(`[tg] ${method} error:`, err)
    return null
  }
}

/** Default channel for legacy admin notifications. */
export async function sendTelegramMessage(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_FEEDBACK_CHAT_ID
  if (!chatId) return
  await tgFetch('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })
}

/** Send a message to an arbitrary chat. Used for replies to venue owners. */
export async function sendToChat(chatId: string | number, text: string, opts: SendOptions = {}): Promise<void> {
  await tgFetch('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: opts.parse_mode ?? 'HTML',
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
    ...(opts.reply_markup ? { reply_markup: opts.reply_markup } : {}),
  })
}

interface TelegramFile {
  file_id: string
  file_unique_id: string
  file_path?: string
  file_size?: number
}

export async function getTelegramFile(fileId: string): Promise<TelegramFile | null> {
  return tgFetch<TelegramFile>('getFile', { file_id: fileId })
}

/** Download a file fetched via getTelegramFile. Returns Buffer. */
export async function downloadTelegramFile(filePath: string): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  const t = token()
  if (!t) return null
  try {
    const res = await fetch(`${TG_API}/file/bot${t}/${filePath}`)
    if (!res.ok) {
      console.error('[tg] downloadFile failed:', res.status)
      return null
    }
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
    return { buffer, contentType }
  } catch (err) {
    console.error('[tg] downloadFile error:', err)
    return null
  }
}

export interface BotInfo {
  id: number
  username: string
  first_name: string
}
export async function getBotInfo(): Promise<BotInfo | null> {
  return tgFetch<BotInfo>('getMe', {})
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Sign a venue id into a short start parameter. Verified on /start handler. */
const SIG_SECRET = () => process.env.AUTH_SECRET ?? ''

export function signStartToken(venueId: string): string {
  const sig = createHmac('sha256', SIG_SECRET()).update(venueId).digest('base64url').slice(0, 16)
  return `v_${venueId}_${sig}`
}

export function verifyStartToken(payload: string): string | null {
  const m = /^v_([A-Za-z0-9_-]+)_([A-Za-z0-9_-]{16})$/.exec(payload)
  if (!m) return null
  const [, venueId, sig] = m
  const expected = createHmac('sha256', SIG_SECRET()).update(venueId).digest('base64url').slice(0, 16)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return venueId
}
