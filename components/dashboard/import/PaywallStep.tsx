import { Check, Lock, Mail } from 'lucide-react'

interface Props {
  emailVerified: boolean
  remaining: number
  limit: number
  onClose: () => void
}

export default function PaywallStep({ emailVerified, remaining, onClose }: Props) {
  const isNotVerified = !emailVerified
  const isLimitReached = emailVerified && remaining === 0

  return (
    <div className="p-6 flex flex-col items-center gap-6 py-10">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: isNotVerified ? 'rgba(176,166,223,0.2)' : 'rgba(192,57,43,0.1)' }}
      >
        {isNotVerified
          ? <Mail size={26} style={{ color: '#B0A6DF' }} />
          : <Lock size={26} style={{ color: '#C0392B' }} />
        }
      </div>

      <div className="text-center space-y-2 max-w-sm">
        <p className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
          {isNotVerified ? 'Подтвердите email' : 'Лимит бесплатных импортов исчерпан'}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {isNotVerified
            ? 'Для импорта ТТК необходимо подтвердить email. Проверьте почту и перейдите по ссылке из письма.'
            : 'Вы использовали бесплатный импорт ТТК. Для продолжения необходима платная подписка.'
          }
        </p>
        {isLimitReached && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Каждый импорт использует AI для распознавания ТТК — это платная операция.
          </p>
        )}
      </div>

      {isLimitReached && (
        <div
          className="w-full rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(176,166,223,0.12)', border: '0.5px solid rgba(176,166,223,0.3)' }}
        >
          <p className="text-xs font-medium text-center" style={{ color: 'var(--color-text-primary)' }}>
            Что входит в подписку
          </p>
          {['Неограниченный импорт ТТК', 'AI-распознавание любых форматов', 'Приоритетная поддержка'].map(f => (
            <div key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <Check size={13} style={{ color: '#2A9D5C', flexShrink: 0 }} />
              {f}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        {isLimitReached && (
          <button
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#2C2950', color: '#fff' }}
            onClick={() => {/* TODO: open billing */}}
          >
            Перейти на платный тариф
          </button>
        )}
        <button
          onClick={onClose}
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}
