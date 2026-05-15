import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AdminShell } from './AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/login?next=/admin')
  if (session.role !== 'ADMIN') redirect('/dashboard')

  return <AdminShell>{children}</AdminShell>
}
