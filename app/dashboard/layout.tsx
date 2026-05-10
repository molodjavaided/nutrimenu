import { DashboardNav } from '@/components/dashboard/DashboardNav'
import ImpersonationBanner from '@/components/dashboard/ImpersonationBanner'
import FeedbackButton from '@/components/feedback/FeedbackButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ImpersonationBanner />
      <div className="flex flex-1 overflow-hidden">
        <DashboardNav />
        <main className="flex-1 overflow-auto dashboard-main">
          {children}
        </main>
      </div>
      <FeedbackButton />
    </div>
  )
}
