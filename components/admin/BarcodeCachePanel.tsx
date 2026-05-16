'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface CacheStats {
  total: number
  positive: number
  negative: number
}

const KEY = ['admin', 'barcode-cache']

export function BarcodeCachePanel() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<CacheStats>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await fetch('/api/admin/barcode-cache')
      if (!res.ok) throw new Error('Не удалось загрузить статистику')
      return res.json()
    },
  })

  const clearMutation = useMutation({
    mutationFn: async (mode: 'negative' | 'all') => {
      const res = await fetch(`/api/admin/barcode-cache?mode=${mode}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Ошибка очистки')
      return res.json() as Promise<{ deleted: number }>
    },
    onSuccess: ({ deleted }, mode) => {
      toast.success(
        deleted === 0
          ? 'Кеш уже пуст'
          : `Удалено записей: ${deleted}${mode === 'all' ? ' (весь кеш)' : ' (негативные)'}`
      )
      qc.invalidateQueries({ queryKey: KEY })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleClear(mode: 'negative' | 'all') {
    const msg = mode === 'all'
      ? `Удалить ВЕСЬ кеш штрих-кодов (${data?.total ?? 0} записей)? Следующие сканы потратят AI-запросы.`
      : `Удалить негативные записи (${data?.negative ?? 0})? Эти штрих-коды снова попадут в Gemini при следующем сканировании.`
    if (!confirm(msg)) return
    clearMutation.mutate(mode)
  }

  return (
    <div
      className="rounded-xl p-4 mb-6"
      style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)' }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: '#2C2950' }}>
            Кеш штрих-кодов
          </p>
          {isLoading ? (
            <p className="text-xs" style={{ color: '#9D99B8' }}>Загрузка…</p>
          ) : (
            <p className="text-xs" style={{ color: '#6B6490' }}>
              Всего: <b>{data?.total ?? 0}</b> · найдено: <b style={{ color: '#15803D' }}>{data?.positive ?? 0}</b> · не найдено: <b style={{ color: '#DC2626' }}>{data?.negative ?? 0}</b>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleClear('negative')}
            disabled={clearMutation.isPending || !data?.negative}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: '#FEFEF2', color: '#2C2950', border: '0.5px solid rgba(176,166,223,0.5)' }}
          >
            Очистить негатив
          </button>
          <button
            onClick={() => handleClear('all')}
            disabled={clearMutation.isPending || !data?.total}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}
          >
            Очистить весь кеш
          </button>
        </div>
      </div>
    </div>
  )
}
