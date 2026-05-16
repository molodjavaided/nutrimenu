'use client'

import Link from 'next/link'
import { useState } from 'react'

const MIN = 50
const BASE_PRICE = 5000
const PER_EXTRA = 100

function fmtRub(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽'
}

export default function DigitizationCounter({ accent }: { accent: string }) {
  const [count, setCount] = useState<number>(MIN)
  const total = BASE_PRICE + Math.max(0, count - MIN) * PER_EXTRA

  function setSafe(v: number) {
    if (Number.isNaN(v)) return
    setCount(Math.max(MIN, Math.floor(v)))
  }

  return (
    <div className="mb-5 p-3 rounded-2xl" style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)' }}>
      <div className="text-xs mb-2" style={{ color: '#6B6490' }}>
        Сколько у вас блюд?
      </div>
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setSafe(count - 1)}
          className="w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: '#fff', color: accent, border: `1px solid ${accent}33` }}
          aria-label="Уменьшить"
        >
          −
        </button>
        <input
          type="number"
          min={MIN}
          value={count}
          onChange={(e) => setSafe(parseInt(e.target.value, 10))}
          className="flex-1 text-center px-2 py-1.5 rounded-lg font-bold text-sm outline-none"
          style={{ background: '#fff', color: '#2C2950', border: `1px solid ${accent}33`, fontSize: 16 }}
        />
        <button
          type="button"
          onClick={() => setSafe(count + 1)}
          className="w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: '#fff', color: accent, border: `1px solid ${accent}33` }}
          aria-label="Увеличить"
        >
          +
        </button>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs" style={{ color: '#6B6490' }}>Итого</span>
        <span className="font-bold text-base" style={{ color: '#2C2950' }}>{fmtRub(total)}</span>
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
