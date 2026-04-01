'use client'

import { Category } from '@/types'

interface Props {
  categories: Category[]
  activeCategory: string
  onSelect: (id: string) => void
}

export default function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
}: Props) {
  return (
    <div
      className="flex gap-2 px-4 pb-4 overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      <button
        onClick={() => onSelect('all')}
        className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-all"
        style={
          activeCategory === 'all'
            ? { background: '#B0A6DF', color: '#2C2950', border: '0.5px solid #B0A6DF' }
            : { background: '#FEFEF2', color: '#6B6490', border: '0.5px solid rgba(176,166,223,0.4)' }
        }
      >
        Все
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-all"
          style={
            activeCategory === cat.id
              ? { background: '#B0A6DF', color: '#2C2950', border: '0.5px solid #B0A6DF' }
              : { background: '#FEFEF2', color: '#6B6490', border: '0.5px solid rgba(176,166,223,0.4)' }
          }
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}