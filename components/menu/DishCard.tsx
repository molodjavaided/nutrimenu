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
      style={{ borderBottom: '0.5px solid rgba(139,92,246,0.1)' }}
    >
      {/* Tap area: photo + info */}
      <button
        className="flex gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
        onClick={onOpen}
      >
        {/* Фото */}
        <div
          className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '0.5px solid rgba(255,255,255,0.5)',
          }}
        >
          {item.photo
            ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
            : '🍽️'
          }
        </div>

        {/* Инфо */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-0.5 truncate text-text-primary">
            {item.name}
          </p>
          {item.description && (
            <p className="text-xs mb-1.5 truncate text-text-secondary">
              {item.description}
            </p>
          )}
          <NutritionGrid nutri={item} />
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-text-muted">
              {item.weight} {item.weightUnit}
            </p>
            {item.price != null && (
              <p className="text-xs font-medium" style={{ color: '#2C2950' }}>
                {item.price} ₽
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Контрол добавления */}
      <div className="flex flex-col items-center justify-center shrink-0 gap-1">
        {inTracker ? (
          <QuantityControl quantity={quantity} onAdd={onAdd} onRemove={onRemove} size="sm" />
        ) : (
          <button
            onClick={onAdd}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all active:scale-90"
            style={{ background: '#8B5CF6', color: '#ffffff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}
