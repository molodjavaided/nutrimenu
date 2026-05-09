import { cn } from '@/lib/utils'

export function RemoveButton({ onClick, size = 'md', variant = 'default' }: {
  onClick: () => void
  size?: 'sm' | 'md'
  variant?: 'default' | 'light'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg flex items-center justify-center shrink-0',
        size === 'sm' ? 'w-7 h-7' : 'w-8 h-8',
      )}
      style={{
        color: '#9D99B8',
        background: variant === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(139,92,246,0.08)',
        border: '0.5px solid rgba(255,255,255,0.5)',
      }}
    >
      ✕
    </button>
  )
}
