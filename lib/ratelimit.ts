import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 10 attempts per 15 minutes per IP
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'nm_auth',
})

// 5 feedback submissions per hour per IP
export const feedbackRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'nm_feedback',
})

// Heavy paid-AI calls (TTK/PDF/Sheets parse + import): 20 per hour per user
export const aiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  prefix: 'nm_ai',
})

// Light paid-AI lookups (barcode / ingredient meta / enrich): 30 per minute per user
export const aiLookupRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'nm_ai_lookup',
})
