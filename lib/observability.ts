import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/logger'

/**
 * Report a handled (caught) server error. Always writes a structured log;
 * additionally sends to Sentry when SENTRY_DSN is configured (no-op otherwise).
 * Use in catch blocks where the error is swallowed into an HTTP response.
 */
export function captureException(event: string, err: unknown, context?: Record<string, unknown>) {
  logger.error(event, context, err)
  Sentry.captureException(err, { extra: { event, ...context } })
}
