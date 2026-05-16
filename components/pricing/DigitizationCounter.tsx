'use client'

import Link from 'next/link'
import { useDigitization, DIGITIZATION_MIN } from './DigitizationContext'

export default function DigitizationCounter({ accent }: { accent: string }) {
  const { count, setCount } = useDigitization()

  function setSafe(v: number) {
    if (Number.isNaN(v)) return
    setCount(Math.max(DIGITIZATION_MIN, Math.floor(v)))
  }

  return (
    <div className="mb-3 p-3 rounded-2xl" style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)' }}>
      <div className="text-xs mb-2" style={{ color: '#6B6490' }}>
        Сколько у вас блюд?
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSafe(count - 1)}
          className="w-9 h-9 shrink-0 rounded-lg font-bold text-base flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: '#fff', color: accent, border: `1px solid ${accent}33` }}
          aria-label="Уменьшить"
        >
          −
        </button>
        <input
          type="number"
          min={DIGITIZATION_MIN}
          value={count}
          onChange={(e) => setSafe(parseInt(e.target.value, 10))}
          className="min-w-0 flex-1 text-center px-2 py-1.5 rounded-lg font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{ background: '#fff', color: '#2C2950', border: `1px solid ${accent}33`, fontSize: 16 }}
        />
        <button
          type="button"
          onClick={() => setSafe(count + 1)}
          className="w-9 h-9 shrink-0 rounded-lg font-bold text-base flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: '#fff', color: accent, border: `1px solid ${accent}33` }}
          aria-label="Увеличить"
        >
          +
        </button>
      </div>
      <Link
        href={`/go/telegram?plan=digitization&dishes=${count}`}
        className="block mt-3 text-center px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:-translate-y-px"
        style={{ background: accent, color: '#fff' }}
      >
        Заказать
      </Link>
    </div>
  )
}
