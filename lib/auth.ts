import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'nm_session'

function getSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? 'nm_fallback_secret_32_characters!!'
  )
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function createSessionToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return { email: payload.email as string }
  } catch {
    return null
  }
}
