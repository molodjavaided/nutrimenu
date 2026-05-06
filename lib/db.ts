import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'

// Required for Node.js environments (local dev); Vercel Edge uses native WebSocket
if (process.env.NODE_ENV !== 'production') {
  const { default: ws } = await import('ws')
  neonConfig.webSocketConstructor = ws
}

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof createPrismaClient> | undefined
}

// Reuse client across hot-reloads in dev; create fresh in prod
export const db = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db
}
