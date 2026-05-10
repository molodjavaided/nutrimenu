'use client'

import { useState } from 'react'
import FeedbackModal from './FeedbackModal'

export default function GuestFeedbackLink({ venueSlug }: { venueSlug: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
        style={{ color: '#7a748f', background: 'rgba(176,166,223,0.1)' }}
      >
        💬 Оставить отзыв
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} source="GUEST" venueSlug={venueSlug} />
    </>
  )
}
