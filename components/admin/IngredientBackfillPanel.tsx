'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface Stats { total: number; missing: number; filled: number }
interface Pending { id: string; name: string; venueId: string | null }

const STATS_KEY = ['admin', 'ingredients-backfill']

export function IngredientBackfillPanel() {
  const qc = useQueryClient()
  const [progress, setProgress] = useState<{ done: number; total: number; current?: string } | null>(null)
  const [running, setRunning] = useState(false)

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: STATS_KEY,
    queryFn: async () => {
      const res = await fetch('/api/admin/ingredients-backfill')
      if (!res.ok) throw new Error('Не удалось загрузить статистику')
      return res.json()
    },
  })

  async function run() {
    if (running) return
    setRunning(true)
    try {
      const listRes = await fetch('/api/admin/ingredients-pending')
      if (!listRes.ok) {
        toast.error('Не удалось получить список')
        return
      }
      const { ingredients } = (await listRes.json()) as { ingredients: Pending[] }
      if (ingredients.length === 0) {
        toast.info('Все ингредиенты уже размечены')
        return
      }
      if (!confirm(`Запустить AI-обогащение для ${ingredients.length} ингредиентов? Это может занять несколько минут.`)) return

      setProgress({ done: 0, total: ingredients.length })
      let success = 0; let failed = 0
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i]
        setProgress({ done: i, total: ingredients.length, current: ing.name })
        try {
          const r = await fetch('/api/admin/ingredients-backfill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: ing.id }),
          })
          if (r.ok) success++; else failed++
        } catch {
          failed++
        }
      }
      setProgress({ done: ingredients.length, total: ingredients.length })
      toast.success(`Готово: ${success} обогащено, ${failed} с ошибкой`)
      qc.invalidateQueries({ queryKey: STATS_KEY })
    } finally {
      setRunning(false)
      setTimeout(() => setProgress(null), 1500)
    }
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.85)', border: '0.5px solid rgba(176,166,223,0.3)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🧮</span>
        <h2 className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>ТТК-обогащение ингредиентов (AI)</h2>
      </div>

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Загрузка…</p>
      ) : stats ? (
        <div className="text-sm space-y-1 mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          <div>Всего ингредиентов: <b style={{ color: 'var(--color-text-primary)' }}>{stats.total}</b></div>
          <div>Размечено (есть category/yield): <b style={{ color: '#3B8B5C' }}>{stats.filled}</b></div>
          <div>Ожидают обогащения: <b style={{ color: '#B86E00' }}>{stats.missing}</b></div>
        </div>
      ) : null}

      {progress && (
        <div className="mb-3">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EAE7F8' }}>
            <div className="h-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%`, background: '#B0A6DF' }} />
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            {progress.done}/{progress.total}{progress.current ? ` · ${progress.current}` : ''}
          </p>
        </div>
      )}

      <button
        onClick={run}
        disabled={running || (stats?.missing ?? 0) === 0}
        className="px-4 py-2 rounded-xl text-sm font-medium"
        style={{
          background: running || (stats?.missing ?? 0) === 0 ? '#EAE7F8' : '#B0A6DF',
          color: 'var(--color-text-primary)',
          cursor: running || (stats?.missing ?? 0) === 0 ? 'default' : 'pointer',
        }}
      >
        🪄 {running ? 'Идёт обогащение…' : 'Запустить AI-обогащение'}
      </button>

      <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
        Каскад: Gemini Flash → Sonar Pro fallback. Заполняет category, coldLossPercent, yieldCoefficients.
        Цену за кг и КБЖУ AI не трогает.
      </p>
    </div>
  )
}
