'use client'

interface GlassCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
}

export default function GlassCheckbox({ checked, indeterminate = false, onChange }: GlassCheckboxProps) {
  return (
    <button
      role="checkbox"
      onClick={e => { e.stopPropagation(); onChange() }}
      aria-checked={indeterminate ? 'mixed' : checked}
      className="shrink-0 flex items-center justify-center rounded-md transition-all"
      style={{
        width: 17,
        height: 17,
        background: checked || indeterminate ? '#B0A6DF' : 'rgba(234,231,248,0.9)',
        border: checked || indeterminate
          ? '1.5px solid #9B8FD0'
          : '1.5px solid rgba(176,166,223,0.7)',
        boxShadow: checked || indeterminate
          ? '0 1px 4px rgba(176,166,223,0.4)'
          : 'inset 0 1px 2px rgba(44,41,80,0.06)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {indeterminate ? (
        <span
          style={{
            display: 'block',
            width: 8,
            height: 1.5,
            borderRadius: 1,
            background: '#FEFEF2',
          }}
        />
      ) : checked ? (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path
            d="M1 3.5L3.5 6L8 1"
            stroke="#FEFEF2"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  )
}
