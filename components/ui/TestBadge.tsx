import { FlaskConical } from 'lucide-react'

interface Props {
  label?: string
  className?: string
}

export default function TestBadge({ label = 'Тестовый режим', className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ background: '#FFF3CD', color: '#856404', border: '1px solid #FFECB5' }}
    >
      <FlaskConical size={11} />
      {label}
    </span>
  )
}
