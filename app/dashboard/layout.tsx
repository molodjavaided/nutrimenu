import type { Metadata } from 'next'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import ImpersonationBanner from '@/components/dashboard/ImpersonationBanner'
import TrialBanner from '@/components/dashboard/TrialBanner'
import { MessagesPanelHost } from '@/components/feedback/MessagesHost'
// Обучение временно отключено — селекторы устарели после редизайна 2026-05-26 (см. project_next_tasks.md).
// Чинить в следующей сессии: tour файлы lib/tour/, components/dashboard/tour/.
// import OnboardingHost from '@/components/dashboard/OnboardingHost'
// import TourController from '@/components/dashboard/tour/TourController'

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
      {/* <OnboardingHost /> */}
      {/* <TourController /> */}
    </div>
  )
}
