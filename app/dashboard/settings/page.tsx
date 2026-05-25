import { redirect } from 'next/navigation'
import { getSession, getEffectiveVenueId } from '@/lib/auth'
import { getOwnerVenue } from '@/lib/queries/owner-menu'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/login?returnTo=/dashboard/settings')

  const venueId = getEffectiveVenueId(session)
  const venue = await getOwnerVenue(venueId)

  return <SettingsClient initialVenue={venue ?? {}} />
}
