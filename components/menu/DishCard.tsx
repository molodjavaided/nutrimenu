'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { MenuItem } from '@/types'
import { QuantityControl } from '@/components/ui/QuantityControl'
import { getAllergenById } from '@/lib/allergens'

interface Props {
  item: MenuItem
  quantity: number
  onOpen: () => void
  onAdd: () => void
  onRemove: () => void
}

/**
 * Карточка блюда в стиле drinkit:
 * - Фото-герой сверху во всю ширину (5:4)
 * - Заголовок Stolzl + цена крупные
 * - + button плавает над фото внизу справа
 * - Минимум мета-инфы: вес · ккал. Б/Ж/У и описание — внутри DishSheet.
 *
 * Карточка не знает о соседях — родитель (MenuView) оборачивает их в grid.
 */
export default function DishCard({ item, quantity, onOpen, onAdd, onRemove }: Props) {
  const inTracker = quantity > 0
  const hasPhoto = !!item.photo

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: 'var(--surface-1)', boxShadow: 'var(--shadow-soft-sm)' }}
    >
      <button
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={`Открыть карточку: ${item.name}`}
      >
        {/* Photo / placeholder */}
        <div
          className="relative w-full aspect-[5/4] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(176,166,223,0.10))' }}
        >
          {hasPhoto ? (
            <Image
              src={item.photo!}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-500 hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-40" aria-hidden>🍽️</div>
          )}

          {/* Allergens overlay top-right */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="absolute top-2.5 right-2.5 flex gap-1">
              {item.allergens.slice(0, 3).map(id => {
                const a = getAllergenById(id)
                if (!a) return null
                return (
                  <span
                    key={id}
                    title={a.label}
                    aria-label={a.label}
                    className="text-sm w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      boxShadow: 'var(--shadow-soft-xs)',
                    }}
                  >{a.emoji}</span>
                )
              })}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 md:p-4 pr-14 md:pr-16">
          <h3
            className="font-heading text-base md:text-lg font-medium tracking-tight line-clamp-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {item.name}
          </h3>
          {item.description && (
            <p
              className="text-xs mt-1 line-clamp-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {item.description}
            </p>
          )}
          <div className="flex items-baseline gap-2 mt-3 flex-wrap">
            {item.price != null && (
              <span
                className="text-lg md:text-xl font-medium tabular-nums leading-none"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {item.price}&nbsp;₽
              </span>
            )}
            <span
              className="text-[11px] tabular-nums"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {item.weight}&nbsp;{item.weightUnit} · {item.calories}&nbsp;ккал
            </span>
          </div>
        </div>
      </button>

      {/* Floating add control — bottom-right, поверх info */}
      <div
        className="absolute bottom-3 right-3 md:bottom-4 md:right-4"
        onClick={e => e.stopPropagation()}
      >
        {inTracker ? (
          <QuantityControl quantity={quantity} onAdd={onAdd} onRemove={onRemove} size="sm" />
        ) : (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onAdd}
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-shadow"
            style={{
              background: '#8B5CF6',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(139,92,246,0.40), 0 1px 2px rgba(44,41,80,0.08)',
            }}
            aria-label={`Добавить ${item.name}`}
          >
            +
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
