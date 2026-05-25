import { redirect } from 'next/navigation'
import { getSession, getEffectiveVenueId } from '@/lib/auth'
import { getOwnerCategoriesByVenue } from '@/lib/queries/owner-menu'
import MenuClient from './MenuClient'

// SSR: тянем категории на сервере, чтобы клиент сразу видел реальное количество позиций
// и не мерцал empty-state. Динамический рендер (зависит от session cookie).
export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const session = await getSession()
  if (!session) redirect('/auth/login?returnTo=/dashboard/menu')

  const venueId = getEffectiveVenueId(session)
  const initialCategories = await getOwnerCategoriesByVenue(venueId)

  return <MenuClient initialCategories={initialCategories} />
}
