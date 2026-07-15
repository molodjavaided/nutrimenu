import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { cache } from 'react'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const SESSION_COOKIE = 'nm_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14 // 14 days
/** Impersonation auto-expires after 2 hours, even if the session cookie is still valid. */
export const IMPERSONATION_TTL_MS = 2 * 60 * 60 * 1000

export interface SessionPayload {
  email: string
  userId: string
  venueId: string
  role: 'OWNER' | 'ADMIN'
  /** Bumped on password change to invalidate every prior session. Absent in legacy tokens → treated as 0. */
  tokenVersion: number
  /** Set when ADMIN is impersonating a venue owner */
  impersonatingVenueId?: string
  /** Unix ms when impersonation expires. Older sessions without this field are ignored if impersonating. */
  impersonationExpiresAt?: number
}

function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET environment variable is not set')
  return new TextEncoder().encode(secret)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const { email, userId, venueId, role, tokenVersion, impersonatingVenueId, impersonationExpiresAt } =
      payload as Record<string, unknown>
    if (typeof email !== 'string' || typeof userId !== 'string' || typeof venueId !== 'string') return null
    const base: SessionPayload = {
      email,
      userId,
      venueId,
      role: role === 'ADMIN' ? 'ADMIN' : 'OWNER',
      tokenVersion: typeof tokenVersion === 'number' ? tokenVersion : 0,
    }
    if (typeof impersonatingVenueId === 'string') {
      const exp = typeof impersonationExpiresAt === 'number' ? impersonationExpiresAt : 0
      if (exp > Date.now()) {
        base.impersonatingVenueId = impersonatingVenueId
        base.impersonationExpiresAt = exp
      }
      // expired or missing expiry → silently drop impersonation; user falls back to admin identity
    }
    return base
  } catch {
    return null
  }
}

/** Per-request-cached lookup of the user's current token version (one indexed read). */
const currentTokenVersion = cache(async (userId: string): Promise<number | null> => {
  const u = await db.user.findUnique({ where: { id: userId }, select: { tokenVersion: true } })
  return u?.tokenVersion ?? null
})

/** Read the session from the incoming cookies (Server Components / Route Handlers).
 *  Rejects tokens whose version is stale — e.g. issued before a password change. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = await verifySessionToken(token)
  if (!payload) return null
  const current = await currentTokenVersion(payload.userId)
  if (current === null || current !== payload.tokenVersion) return null
  return payload
}

/** Returns the venueId to use for dashboard operations.
 *  When admin is impersonating, returns the target venue's id. */
export function getEffectiveVenueId(session: SessionPayload): string {
  return session.impersonatingVenueId ?? session.venueId
}

/** Set the session cookie on a NextResponse. */
export function setSessionCookie(res: Response, token: string): void {
  const cookie = [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    `Max-Age=${SESSION_MAX_AGE}`,
    'Path=/',
    'SameSite=Lax',
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ].filter(Boolean).join('; ')
  res.headers.append('Set-Cookie', cookie)
}
