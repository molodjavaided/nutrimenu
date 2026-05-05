'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SessionInfo {
  impersonatingVenueId?: string
  venueName?: string
}

export default function ImpersonationBanner() {
  const router = useRouter()
  const [info, setInfo] = useState<SessionInfo | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    fetch('/api/session/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.impersonatingVenueId) setInfo(data) })
  }, [])

  if (!info?.impersonatingVenueId) return null

  async function stopImpersonation() {
    setLeaving(true)
    await fetch('/api/admin/impersonate/stop', { method: 'POST' })
    router.push('/admin')
  }

  return (
    <div
      className="flex items-center justify-between px-5 py-2.5 text-sm"
      style={{ background: '#7C3AED', color: '#fff' }}
    >
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>
          Вы редактируете от имени заведения
          {info.venueName ? <strong className="ml-1">«{info.venueName}»</strong> : ''}
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        disabled={leaving}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      >
        {leaving ? '…' : '← Выйти в админку'}
      </button>
    </div>
  )
}
