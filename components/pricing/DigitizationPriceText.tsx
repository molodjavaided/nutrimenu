'use client'

import { useDigitization, fmtRub } from './DigitizationContext'

export default function DigitizationPriceText() {
  const { total } = useDigitization()
  return <>{fmtRub(total)}</>
}
