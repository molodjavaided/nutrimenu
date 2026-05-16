'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export const DIGITIZATION_MIN = 50
const BASE_PRICE = 5000
const PER_EXTRA = 100

interface DigitizationCtx {
  count: number
  setCount: (n: number) => void
  total: number
}

const Ctx = createContext<DigitizationCtx | null>(null)

export function DigitizationProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(DIGITIZATION_MIN)
  const total = BASE_PRICE + Math.max(0, count - DIGITIZATION_MIN) * PER_EXTRA
  return <Ctx.Provider value={{ count, setCount, total }}>{children}</Ctx.Provider>
}

export function useDigitization() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDigitization must be used inside DigitizationProvider')
  return v
}

export function fmtRub(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽'
}
