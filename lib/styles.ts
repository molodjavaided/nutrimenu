import type { CSSProperties } from 'react'

// Лёгкое стекло: для инпутов, мелких контролов
export const glassInput: CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.5)',
  boxShadow: '0 1px 4px rgba(139,92,246,0.06)',
}

// Тяжёлое стекло: модалки, нижние листы
export const glassSheet: CSSProperties = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  boxShadow: '0 -8px 40px rgba(139,92,246,0.12), 0 1px 0 rgba(255,255,255,0.9) inset',
}

