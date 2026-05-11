'use client'

import { useRouter } from 'next/navigation'

export default function DemoButton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const router = useRouter()
  return (
    <button onClick={() => router.push('/demo')} className={className} style={style}>
      Попробовать
    </button>
  )
}
