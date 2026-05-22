import { Check, RotateCcw } from 'lucide-react'
import { buildButtonLabel } from './utils'

interface Props {
  dishCount: number
  prepCount: number
  newIngCount: number
  countdown: number
  total: number
  onUndo: () => void
  onClose: () => void
}

export default function SuccessStep({ dishCount, prepCount, newIngCount, countdown, total, onUndo, onClose }: Props) {
  const progress = (countdown / total) * 100

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3 pt-6 pb-2">
        <div className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(42,157,92,0.12)' }}>
          <Check size={26} style={{ color: '#2A9D5C' }} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
            {buildButtonLabel(dishCount, prepCount).replace('Импортировать: ', '')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {prepCount > 0 ? 'Блюда добавлены в меню, заготовки — в ингредиенты' : 'Блюда добавлены в меню'}
          </p>
          {newIngCount > 0 && (
            <p className="text-xs mt-0.5" style={{ color: '#2A9D5C' }}>
              + {newIngCount} новых ингредиентов добавлено в справочник
            </p>
          )}
        </div>
      </div>

      <div className="w-full rounded-xl overflow-hidden" style={{ border: '0.5px solid rgba(176,166,223,0.35)' }}>
        <div className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ background: 'rgba(234,231,248,0.6)' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <RotateCcw size={13} />
            <span>Отменить импорт · {countdown}с</span>
          </div>
          <button onClick={onUndo}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: 'rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}>
            Отменить
          </button>
        </div>
        <div style={{ height: '3px', background: 'rgba(176,166,223,0.2)' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#B0A6DF', transition: 'width 1s linear' }} />
        </div>
      </div>

      <button onClick={onClose}
        className="text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-text-secondary)' }}>
        Закрыть
      </button>
    </div>
  )
}
