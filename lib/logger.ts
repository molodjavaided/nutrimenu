/**
 * Tiny structured logger. JSON lines in production (parseable by Vercel / log drains),
 * readable text in dev. No dependencies. Use instead of bare console.* for anything
 * that matters in production.
 *
 *   import { logger } from '@/lib/logger'
 *   logger.error('barcode_lookup_failed', { code, venueId }, err)
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

const isProd = process.env.NODE_ENV === 'production'

function emit(level: Level, event: string, context?: Record<string, unknown>, err?: unknown) {
  const errInfo =
    err instanceof Error
      ? { errorName: err.name, errorMessage: err.message, stack: err.stack }
      : err !== undefined
        ? { error: String(err) }
        : undefined

  if (isProd) {
    const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...context, ...errInfo })
    ;(level === 'error' || level === 'warn' ? console.error : console.log)(line)
    return
  }

  // Dev: human-readable
  const prefix = `[${level.toUpperCase()}] ${event}`
  const extras = { ...context, ...errInfo }
  if (Object.keys(extras).length > 0) console[level === 'debug' ? 'log' : level](prefix, extras)
  else console[level === 'debug' ? 'log' : level](prefix)
}

export const logger = {
  debug: (event: string, context?: Record<string, unknown>) => emit('debug', event, context),
  info: (event: string, context?: Record<string, unknown>) => emit('info', event, context),
  warn: (event: string, context?: Record<string, unknown>, err?: unknown) => emit('warn', event, context, err),
  error: (event: string, context?: Record<string, unknown>, err?: unknown) => emit('error', event, context, err),
}
