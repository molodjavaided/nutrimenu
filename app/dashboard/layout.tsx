import type { Metadata } from 'next'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import ImpersonationBanner from '@/components/dashboard/ImpersonationBanner'
import TrialBanner from '@/components/dashboard/TrialBanner'
import { MessagesPanelHost } from '@/components/feedback/MessagesHost'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ImpersonationBanner />
      <TrialBanner />
      <div className="flex flex-1 overflow-hidden">
        <DashboardNav />
        <main className="flex-1 overflow-auto dashboard-main">
          {children}
        </main>
      </div>
      <MessagesPanelHost />
    </div>
  )
}
