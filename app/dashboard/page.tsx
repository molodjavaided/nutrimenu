import { redirect } from 'next/navigation'
import { getSession, getEffectiveVenueId } from '@/lib/auth'
import {
  getOwnerCategoriesByVenue,
  getOwnerVenue,
  getMenuViewsStats,
} from '@/lib/queries/owner-menu'
import DashboardClient from './DashboardClient'

// SSR: venue + categories + views на сервере, чтобы не было flash «пустой дашборд».
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/auth/login?returnTo=/dashboard')

  const venueId = getEffectiveVenueId(session)
  const [venue, categories, views] = await Promise.all([
    getOwnerVenue(venueId),
    getOwnerCategoriesByVenue(venueId),
    getMenuViewsStats(venueId),
  ])

  return (
    <DashboardClient
      venue={venue as never}
      categories={categories as never}
      views={views}
    />
  )
}
