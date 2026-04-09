import { Venue } from '@/types'

interface Props {
  venue: Venue
}

export default function VenueHeader({ venue }: Props) {
  return (
    <div className="px-4 pt-5 pb-1">
      <div className="flex items-center gap-3 mb-3">
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
