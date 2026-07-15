import * as Sentry from '@sentry/nextjs'

/**
 * Client-side observability bootstrap (Next.js 16).
 * Active only when NEXT_PUBLIC_SENTRY_DSN is set — otherwise a no-op.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
