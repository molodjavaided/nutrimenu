import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { SESSION_COOKIE } from '@/lib/auth'

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'nm_fallback_secret_32_characters!!'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value

  let authenticated = false
  if (token) {
    try {
      await jwtVerify(token, secret)
      authenticated = true
    } catch {}
  }

  if (pathname.startsWith('/dashboard')) {
    if (!authenticated) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  if (pathname.startsWith('/auth')) {
    if (authenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
