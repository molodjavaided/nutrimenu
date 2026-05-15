'use client'

import { useQuery } from '@tanstack/react-query'
import MessagesPanel from './MessagesPanel'
import { messagesStore, useMessagesPanelState } from './MessagesButton'
import { Inbox } from 'lucide-react'

export function MessagesNavButton({ variant = 'sidebar' }: { variant?: 'sidebar' | 'mobile' }) {
  const { data } = useQuery({
    queryKey: ['feedback', 'unread'],
    queryFn: () => fetch('/api/feedback/unread').then(r => r.json() as Promise<{ count: number }>),
    refetchInterval: 60_000,
  })
  const unread = data?.count ?? 0

  if (variant === 'mobile') {
    return (
      <button
        onClick={() => messagesStore.open()}
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative min-w-0"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="relative inline-flex">
          <Inbox size={20} />
          {unread > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold flex items-center justify-center px-1"
              style={{ background: '#DC2626', color: '#fff' }}
            >{unread}</span>
          )}
        </span>
        <span className="text-[10px] font-medium">Чат</span>
      </button>
    )
  }

  return (
    <button
      onClick={() => messagesStore.open()}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all w-full text-left bg-lavender-light text-text-secondary hover:bg-lavender hover:text-text-primary"
    >
      <span className="relative inline-flex">
        <Inbox size={14} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold flex items-center justify-center px-1"
            style={{ background: '#DC2626', color: '#fff' }}
          >{unread}</span>
        )}
      </span>
      Сообщения
    </button>
  )
}

export function MessagesPanelHost() {
  const s = useMessagesPanelState()
  return (
    <MessagesPanel
      open={s.open}
      initialCategory={s.initialCategory}
      onClose={() => messagesStore.close()}
    />
  )
}
