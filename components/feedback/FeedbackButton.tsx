'use client'

import { useState } from 'react'
import FeedbackModal from './FeedbackModal'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90 hover:scale-105"
        style={{ background: '#2C2950', color: '#FEFEF2' }}
        aria-label="Обратная связь"
        title="Обратная связь"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} source="OWNER" />
    </>
  )
}
