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
      style={{
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '0.5px solid rgba(255,255,255,0.4)',
        boxShadow: '0 2px 8px rgba(139,92,246,0.06)',
      }}
    >
      <button
        onClick={onRemove}
        className={`${btnClass} flex items-center justify-center font-medium transition-all`}
        style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
      >
        −
      </button>
      <span className="text-xs font-medium w-5 text-center" style={{ color: '#2C2950' }}>
        {quantity}
      </span>
      <button
        onClick={onAdd}
        className={`${btnClass} flex items-center justify-center font-medium transition-all`}
        style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
      >
        +
      </button>
    </div>
  )
}
