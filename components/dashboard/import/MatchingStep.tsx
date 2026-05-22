import { Check, Info } from 'lucide-react'
import type { IngredientMatch } from '@/lib/importer'

function UnitBadge({ unit }: { unit: string }) {
  const isSpecial = unit !== 'г' && unit !== 'мл'
  return (
    <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
      style={{
        background: isSpecial ? 'rgba(255,180,50,0.15)' : 'rgba(176,166,223,0.15)',
        color: isSpecial ? '#D4830A' : 'var(--color-text-secondary)',
        border: `0.5px solid ${isSpecial ? 'rgba(255,180,50,0.3)' : 'rgba(176,166,223,0.3)'}`,
      }}>
      {unit}
    </span>
  )
}

function MatchCard({
  match, decision, onDecide,
}: {
  match: IngredientMatch
  decision: string | 'new' | undefined
  onDecide: (key: string, choice: string | 'new') => void
}) {
  const isUndecided = decision === undefined
  return (
    <div className="rounded-xl p-4"
      style={{
        background: isUndecided ? 'rgba(255,180,50,0.06)' : 'rgba(234,231,248,0.5)',
        border: `0.5px solid ${isUndecided ? 'rgba(255,180,50,0.3)' : 'rgba(176,166,223,0.3)'}`,
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{match.importedName}</span>
        <UnitBadge unit={match.unit} />
        {isUndecided ? (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,180,50,0.2)', color: '#D4830A', border: '0.5px solid rgba(255,180,50,0.35)' }}>
            Не указано
          </span>
        ) : (
          <Check size={13} className="ml-auto" style={{ color: '#2A9D5C' }} />
        )}
      </div>
      {match.isOilSubstitution && (
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>Выберите тип масла:</p>
      )}
      <div className="flex flex-wrap gap-2">
        {match.candidates.map(c => {
          const isSelected = decision === c.id
          return (
            <button key={c.id} onClick={() => onDecide(match.normalizedKey, c.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all active:scale-95"
              style={isSelected
                ? { background: '#8B5CF6', color: '#fff', boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }
                : { background: 'rgba(255,255,255,0.8)', color: 'var(--color-text-secondary)', border: '0.5px solid rgba(176,166,223,0.45)' }}>
              {isSelected && <Check size={11} />}
              <span>{c.name}</span>
              {!match.isOilSubstitution && <span style={{ opacity: 0.55 }}>{Math.round(c.score * 100)}%</span>}
            </button>
          )
        })}
        <button onClick={() => onDecide(match.normalizedKey, 'new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all active:scale-95"
          style={decision === 'new'
            ? { background: '#2A9D5C', color: '#fff', boxShadow: '0 2px 8px rgba(42,157,92,0.2)' }
            : { background: 'rgba(255,255,255,0.8)', color: 'var(--color-text-secondary)', border: '0.5px solid rgba(176,166,223,0.45)' }}>
          {decision === 'new' && <Check size={11} />}
          + Создать новый
        </button>
      </div>
    </div>
  )
}

interface Props {
  matches: IngredientMatch[]
  decisions: Map<string, string | 'new'>
  onDecide: (key: string, choice: string | 'new') => void
}

export default function MatchingStep({ matches, decisions, onDecide }: Props) {
  const groups: Array<{
    dish: { name: string; category: string; kind: 'dish' | 'preparation' }
    matches: IngredientMatch[]
  }> = []
  const assignedKeys = new Set<string>()

  for (const match of matches) {
    const primary = match.usedByDishes?.[0]
    if (!primary) continue
    const gk = `${primary.category}|||${primary.name}`
    let g = groups.find(x => `${x.dish.category}|||${x.dish.name}` === gk)
    if (!g) { g = { dish: primary, matches: [] }; groups.push(g) }
    g.matches.push(match)
    assignedKeys.add(match.normalizedKey)
  }
  const ungrouped = matches.filter(m => !assignedKeys.has(m.normalizedKey))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: 'rgba(176,166,223,0.12)', border: '0.5px solid rgba(176,166,223,0.3)' }}>
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Система нашла похожие ингредиенты в вашем справочнике, но не может связать их автоматически.
          Просмотрите и выберите для каждого: использовать существующий или создать новый.
        </p>
      </div>

      <div className="space-y-5">
        {groups.map(group => {
          const gk = `${group.dish.category}|||${group.dish.name}`
          const allDecided = group.matches.every(m => decisions.has(m.normalizedKey))
          return (
            <div key={gk}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                style={{ background: 'rgba(176,166,223,0.15)', borderLeft: '2px solid #B0A6DF' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{group.dish.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {group.dish.kind === 'preparation' ? '→ Ингредиенты · ' : ''}{group.dish.category}
                  </p>
                </div>
                {allDecided && <Check size={13} style={{ color: '#2A9D5C', flexShrink: 0 }} />}
              </div>
              <div className="space-y-2 pl-3" style={{ borderLeft: '1px solid rgba(176,166,223,0.3)' }}>
                {group.matches.map(match => (
                  <MatchCard key={match.normalizedKey} match={match}
                    decision={decisions.get(match.normalizedKey)} onDecide={onDecide} />
                ))}
              </div>
            </div>
          )
        })}

        {ungrouped.map(match => (
          <MatchCard key={match.normalizedKey} match={match}
            decision={decisions.get(match.normalizedKey)} onDecide={onDecide} />
        ))}
      </div>
    </div>
  )
}
