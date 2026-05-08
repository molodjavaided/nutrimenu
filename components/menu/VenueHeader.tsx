import Link from 'next/link'
import { Venue } from '@/types'
import { SwitchRoleButton } from '@/components/SwitchRoleButton'

interface Props {
  venue: Venue
  isOwner?: boolean
}

export default function VenueHeader({ venue, isOwner = false }: Props) {
  return (
    <div className="px-4 pt-4 pb-1">
      <Link
        href="/venues"
        className="inline-flex items-center gap-1.5 mb-3 text-xs transition-opacity active:opacity-60"
        style={{ color: '#9D99B8' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Все заведения
      </Link>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '0.5px solid rgba(255,255,255,0.5)',
              boxShadow: '0 2px 8px rgba(139,92,246,0.1)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#8B5CF6" strokeWidth="1.5" />
              <path d="M11 7v4l2.5 1.5" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="font-medium text-base" style={{ color: '#2C2950' }}>
              {venue.name}
            </h1>
            <p className="text-xs" style={{ color: '#6B6490' }}>
              {venue.address}
              {venue.workingHours && ` · ${venue.workingHours}`}
            </p>
          </div>
        </div>

        {isOwner && <SwitchRoleButton variant="menu" />}
      </div>

      {venue.tags && venue.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {venue.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 rounded-full"
              style={{
                background: 'rgba(139,92,246,0.1)',
                color: '#7C3AED',
                border: '0.5px solid rgba(139,92,246,0.2)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
