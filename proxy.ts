import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { SESSION_COOKIE } from '@/lib/auth'

const rawSecret = process.env.AUTH_SECRET
if (!rawSecret) throw new Error('AUTH_SECRET environment variable is not set')
const secret = new TextEncoder().encode(rawSecret)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value

  let payload: { role?: string } | null = null
  if (token) {
    try {
      const result = await jwtVerify(token, secret)
      payload = result.payload as { role?: string }
    } catch {}
  }

  const authenticated = payload !== null

  if (pathname.startsWith('/dashboard')) {
    if (!authenticated) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!authenticated) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    if (payload?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (pathname.startsWith('/auth')) {
    if (authenticated) {
      const redirectTo = payload?.role === 'ADMIN' ? '/admin' : '/dashboard'
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*', '/admin/:path*'],
}
