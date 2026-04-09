'use client'

interface Props {
  quantity: number
  onAdd: () => void
  onRemove: () => void
  size?: 'sm' | 'md'
}

export function QuantityControl({ quantity, onAdd, onRemove, size = 'md' }: Props) {
  const btnClass = size === 'sm'
    ? 'w-7 h-7 rounded-lg text-sm'
    : 'w-8 h-8 rounded-xl text-base'

  return (
    <div
      className="flex items-center gap-1 rounded-xl px-1 py-1"
      style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)' }}
    >
      <button
        onClick={onRemove}
        className={`${btnClass} flex items-center justify-center font-medium transition-all bg-lavender text-text-primary`}
      >
        −
      </button>
      <span className="text-xs font-medium w-5 text-center text-text-primary">
        {quantity}
      </span>
      <button
        onClick={onAdd}
        className={`${btnClass} flex items-center justify-center font-medium transition-all bg-lavender text-text-primary`}
      >
        +
      </button>
    </div>
  )
}
