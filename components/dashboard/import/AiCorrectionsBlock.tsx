'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

export default function AiCorrectionsBlock({ corrections }: { corrections: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const preview = corrections.slice(0, 3)
  const hasMore = corrections.length > 3

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(42,157,92,0.06)', border: '0.5px solid rgba(42,157,92,0.25)' }}>
      <div className="flex items-center gap-2 px-4 py-3">
        <Check size={14} style={{ color: '#2A9D5C', flexShrink: 0 }} />
        <p className="text-xs font-medium flex-1" style={{ color: '#1A7A45' }}>
          AI исправил {corrections.length} {corrections.length === 1 ? 'ошибку' : corrections.length < 5 ? 'ошибки' : 'ошибок'} при разборе ТТК
        </p>
        {hasMore && (
          <button onClick={() => setExpanded(e => !e)} className="text-xs transition-opacity hover:opacity-70"
            style={{ color: '#2A9D5C' }}>
            {expanded ? 'Свернуть' : 'Подробнее'}
          </button>
        )}
      </div>
      {(expanded ? corrections : preview).length > 0 && (
        <div className="px-4 pb-3 space-y-1" style={{ borderTop: '0.5px solid rgba(42,157,92,0.15)' }}>
          {(expanded ? corrections : preview).map((c, i) => (
            <p key={i} className="text-xs" style={{ color: '#2A6640' }}>· {c}</p>
          ))}
          {!expanded && hasMore && (
            <p className="text-xs" style={{ color: '#2A9D5C' }}>+ ещё {corrections.length - 3}…</p>
          )}
        </div>
      )}
    </div>
  )
}
