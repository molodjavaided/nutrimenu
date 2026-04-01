'use client'

import { MenuItem } from '@/types'

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
      {/* Фото — кликабельно для открытия sheet */}
      <div
        className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-2xl cursor-pointer"
        style={{ background: '#EAE7F8' }}
        onClick={onOpen}
      >
        🍽️
      </div>

      {/* Инфо — кликабельно для открытия sheet */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
        <p className="text-sm font-medium mb-0.5 truncate" style={{ color: '#2C2950' }}>
          {item.name}
        </p>
        {item.description && (
          <p className="text-xs mb-1.5 truncate" style={{ color: '#6B6490' }}>
            {item.description}
          </p>
        )}
        <div className="flex gap-1.5 flex-wrap">
          <span
            className="text-xs px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: '#F2D965', color: '#635200' }}
          >
            {item.calories} ккал
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-md"
            style={{ background: '#EAE7F8', color: '#534AB7' }}
          >
            Б {item.protein}г
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-md"
            style={{ background: '#EAE7F8', color: '#534AB7' }}
          >
            Ж {item.fat}г
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-md"
            style={{ background: '#EAE7F8', color: '#534AB7' }}
          >
            У {item.carbs}г
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#9D99B8' }}>
          {item.weight} {item.weightUnit}
        </p>
      </div>

      {/* Контрол добавления */}
      <div className="flex flex-col items-center justify-center shrink-0 gap-1">
        {inTracker ? (
          <div
            className="flex items-center gap-1 rounded-xl px-1 py-1"
            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)' }}
          >
            <button
              onClick={onRemove}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
              style={{ background: '#B0A6DF', color: '#2C2950' }}
            >
              −
            </button>
            <span
              className="text-xs font-medium w-4 text-center"
              style={{ color: '#2C2950' }}
            >
              {quantity}
            </span>
            <button
              onClick={onAdd}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
              style={{ background: '#B0A6DF', color: '#2C2950' }}
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
            style={{ background: '#B0A6DF', color: '#2C2950' }}
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}