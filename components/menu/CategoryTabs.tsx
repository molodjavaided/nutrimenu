'use client'

import { Category } from '@/types'

interface Props {
  categories: Category[]
  activeCategory: string
  onSelect: (id: string) => void
}

export default function CategoryTabs({ categories, activeCategory, onSelect }: Props) {
  return (
    <div className="flex gap-2 px-4 pb-3 flex-wrap">
      {['all', ...categories.map(c => c.id)].map((id, i) => {
        const label = id === 'all' ? 'Все' : categories[i - 1]?.name ?? id
        const active = activeCategory === id
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="text-xs px-4 rounded-full whitespace-nowrap shrink-0 flex-shrink-0 transition-all min-h-[44px] active:opacity-70"
            style={
              active
                ? {
                    background: '#8B5CF6',
                    color: '#ffffff',
                    border: '0.5px solid rgba(139,92,246,0.6)',
                    boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
                  }
                : {
                    background: 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    color: 'var(--color-text-secondary)',
                    border: '0.5px solid rgba(255,255,255,0.5)',
                  }
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
