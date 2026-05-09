'use client'

import { useEffect, useState } from 'react'
import { IngredientLibrary } from '@/types'
import { initLibraries } from '@/lib/store'
import { systemLibraries } from '@/lib/mock-data'

/**
 * Initializes system ingredient libraries (including the full food database)
 * into localStorage on first app load. Never overwrites user-created ingredients.
 */
export function useFoodDatabase() {
  const [libraries, setLibraries] = useState<IngredientLibrary[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const libs = initLibraries(systemLibraries)
    /* eslint-disable react-hooks/set-state-in-effect */
    setLibraries(libs)
    setIsReady(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  return { libraries, isReady }
}
