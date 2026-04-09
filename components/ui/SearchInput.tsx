'use client'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Поиск...', className }: Props) {
  return (
    <div
      className={`flex items-center gap-2 px-3 h-10 rounded-xl ${className ?? ''}`}
      style={{
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '0.5px solid rgba(255,255,255,0.5)',
        boxShadow: '0 2px 8px rgba(139,92,246,0.06)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <circle cx="7" cy="7" r="4.5" stroke="#9D99B8" strokeWidth="1.3" />
        <path d="M11 11L14 14" stroke="#9D99B8" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-muted"
      />
      {value.length > 0 && (
        <button
          onClick={() => onChange('')}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  )
}
