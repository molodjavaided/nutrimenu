import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function main() {
  const email = 'yurchik.yuri.ru@gmail.com'
  const password = process.env.ADMIN_PASSWORD
  if (!password) throw new Error('ADMIN_PASSWORD environment variable is not set')

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    await db.user.update({ where: { email }, data: { role: 'ADMIN' } })
    console.log(`Updated ${email} to ADMIN`)
  } else {
    await db.user.create({
      data: { email, passwordHash: await hashPassword(password), role: 'ADMIN' },
    })
    console.log(`Created admin: ${email}`)
  }
}

main().finally(() => db.$disconnect())
