import * as Sentry from '@sentry/nextjs'
import type { Instrumentation } from 'next'
import { logger } from '@/lib/logger'

/**
 * Server/edge observability bootstrap (Next.js 16 instrumentation hook).
 * Sentry is initialised ONLY when SENTRY_DSN is set — otherwise this is a no-op
 * and production behaviour is unchanged. Add SENTRY_DSN to env to switch it on.
 */
export function register() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    })
  }
}

/** Every unhandled error in a route handler / RSC lands here — logged always, sent to Sentry if configured. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  logger.error('request_error', {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  }, err)
  await Sentry.captureRequestError(err, request, context)
}
