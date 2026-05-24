function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'rgba(176,166,223,0.18)', ...style }}
    />
  )
}

function DishCardSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '0.5px solid rgba(139,92,246,0.08)' }}>
      {/* Photo */}
      <Bone className="shrink-0 rounded-xl" style={{ width: 72, height: 72 }} />
      {/* Text */}
      <div className="flex-1 flex flex-col gap-2">
        <Bone style={{ height: 14, width: '60%' }} />
        <Bone style={{ height: 12, width: '80%', opacity: 0.6 }} />
        <Bone style={{ height: 12, width: '40%', opacity: 0.5 }} />
      </div>
      {/* Price + add button */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <Bone style={{ height: 14, width: 48 }} />
        <Bone className="rounded-full" style={{ height: 32, width: 32 }} />
      </div>
    </div>
  )
}

export default function MenuLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#FEFEF2' }}>
      <div className="max-w-lg mx-auto">

        {/* VenueHeader skeleton */}
        <div className="px-4 pt-4 pb-1">
          {/* Back link */}
          <Bone style={{ height: 12, width: 100, marginBottom: 12 }} />
          {/* Logo + name row */}
          <div className="flex items-center gap-3 mb-3">
            <Bone className="rounded-xl shrink-0" style={{ width: 44, height: 44 }} />
            <div className="flex flex-col gap-2 flex-1">
              <Bone style={{ height: 16, width: '50%' }} />
              <Bone style={{ height: 12, width: '70%', opacity: 0.6 }} />
            </div>
          </div>
          {/* Tags row */}
          <div className="flex gap-2 mb-3">
            <Bone className="rounded-full" style={{ height: 24, width: 64 }} />
            <Bone className="rounded-full" style={{ height: 24, width: 80 }} />
          </div>
        </div>

        {/* Sticky bar skeleton */}
        <div
          className="sticky top-0 z-20 pt-1 pb-0"
          style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}
        >
          {/* Search */}
          <div className="px-4 pb-2">
            <Bone className="rounded-xl" style={{ height: 40 }} />
          </div>
          {/* Category tabs */}
          <div className="flex gap-2 px-4 pb-3 overflow-hidden">
            {[80, 64, 96, 72, 56].map((w, i) => (
              <Bone key={i} className="rounded-full shrink-0" style={{ height: 30, width: w }} />
            ))}
          </div>
        </div>

        {/* Dishes */}
        <div className="px-4 pb-24">
          {/* Category label */}
          <Bone style={{ height: 11, width: 90, marginBottom: 12, marginTop: 16, opacity: 0.5 }} />
          {[1, 2, 3].map(i => <DishCardSkeleton key={i} />)}

          {/* Second category */}
          <Bone style={{ height: 11, width: 70, marginBottom: 12, marginTop: 24, opacity: 0.5 }} />
          {[1, 2].map(i => <DishCardSkeleton key={i} />)}
        </div>

      </div>
    </div>
  )
}
