import { redirect } from 'next/navigation'
import { getSession, getEffectiveVenueId } from '@/lib/auth'
import { getOwnerIngredients } from '@/lib/queries/owner-menu'
import type { IngredientRef } from '@/types'
import IngredientsClient from './IngredientsClient'

export const dynamic = 'force-dynamic'

export default async function IngredientsPage() {
  const session = await getSession()
  if (!session) redirect('/auth/login?returnTo=/dashboard/ingredients')

  const venueId = getEffectiveVenueId(session)
  const initialPersonalIngredients = await getOwnerIngredients(venueId)

  return <IngredientsClient initialPersonalIngredients={initialPersonalIngredients as unknown as IngredientRef[]} />
}
