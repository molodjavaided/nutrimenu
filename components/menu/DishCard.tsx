'use client'

import { MenuItem } from '@/types'
import { NutritionGrid } from '@/components/ui/NutritionGrid'
import { QuantityControl } from '@/components/ui/QuantityControl'

interface Props {
  item: MenuItem
  quantity: number
  onOpen: () => void
  onAdd: () => void
  onRemove: () => void
}

export default function DishCard({ item, quantity, onOpen, onAdd, onRemove }: Props) {
  const inTracker = quantity > 0

  return (
    <div
      className="flex gap-3 py-3"
      style={{ borderBottom: '0.5px solid rgba(176,166,223,0.2)' }}
    >
      {/* Фото */}
      <div
        className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-2xl cursor-pointer bg-lavender-light"
        onClick={onOpen}
      >
        🍽️
      </div>

      {/* Инфо */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
        <p className="text-sm font-medium mb-0.5 truncate text-text-primary">
          {item.name}
        </p>
        {item.description && (
          <p className="text-xs mb-1.5 truncate text-text-secondary">
            {item.description}
          </p>
        )}
        <NutritionGrid nutri={item} />
        <p className="text-xs mt-1 text-text-muted">
          {item.weight} {item.weightUnit}
        </p>
      </div>

      {/* Контрол добавления */}
      <div className="flex flex-col items-center justify-center shrink-0 gap-1">
        {inTracker ? (
          <QuantityControl quantity={quantity} onAdd={onAdd} onRemove={onRemove} size="sm" />
        ) : (
          <button
            onClick={onAdd}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all bg-lavender text-text-primary"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}
