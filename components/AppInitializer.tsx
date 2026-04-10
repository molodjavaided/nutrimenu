'use client'

import { useFoodDatabase } from '@/hooks/useFoodDatabase'

/** Silent client component — seeds system ingredient libraries into localStorage on mount. */
export function AppInitializer() {
  useFoodDatabase()
  return null
}
