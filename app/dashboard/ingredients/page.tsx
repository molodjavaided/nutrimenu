'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { IngredientLibrary, IngredientRef, IngredientCategory } from '@/types'
import { systemLibraries } from '@/lib/mock-data'
import { CATEGORY_LABELS, asCategory } from '@/lib/cooking-coefficients'
import { SearchInput } from '@/components/ui/SearchInput'
import IngredientFormModal from '@/components/dashboard/IngredientFormModal'
import BarcodeScannerOverlay from '@/components/dashboard/BarcodeScannerOverlay'
import GlassCheckbox from '@/components/ui/GlassCheckbox'
import { GlassCard, GlassButton, GlassInput, NutriPill } from '@/components/ui-kit'

const MY_LIBRARY_ID = 'my-library'

type BarcodeStatus = 'idle' | 'loading' | 'not_found' | 'error'

export default function IngredientsPage() {
  const [libraries, setLibraries] = useState<IngredientLibrary[]>([])
  const [activeLibId, setActiveLibId] = useState<string>(MY_LIBRARY_ID)
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Modal state: undefined = closed, null = new, IngredientRef = editing
  const [modalTarget, setModalTarget] = useState<IngredientRef | null | undefined>(undefined)

  const [barcodeMode, setBarcodeMode] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeStatus, setBarcodeStatus] = useState<BarcodeStatus>('idle')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [barcodePreFill, setBarcodePreFill] = useState<Omit<IngredientRef, 'id'> | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [enrichInfo, setEnrichInfo] = useState<{ canEnrich: boolean; used: number; limit: number | null; remaining: number | null; plan?: string } | null>(null)
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number; errors: number } | null>(null)

  useEffect(() => {
    fetch('/api/ingredients')
      .then(r => r.ok ? r.json() : [])
      .then((personalIngredients: IngredientRef[]) => {
        const personalLib = { id: MY_LIBRARY_ID, name: 'Мои ингредиенты', isSystem: false, ingredients: personalIngredients }
        setLibraries([...systemLibraries, personalLib])
        setActiveLibId(MY_LIBRARY_ID)
      })
    fetch('/api/ingredients/enrich-limit')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setEnrichInfo(data) })
  }, [])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedIds(new Set())
    setConfirmBulkDelete(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeLibId])

  const activeLib = libraries.find(l => l.id === activeLibId) ?? null
  const ingredients = activeLib?.ingredients ?? []
  const isSystem = activeLib?.isSystem ?? false

  const allRefs = libraries.flatMap(l => l.ingredients)

  function updateLocalLib(updated: IngredientRef[]) {
    setLibraries(libs => libs.map(l => l.id === activeLibId ? { ...l, ingredients: updated } : l))
  }

  async function handleSave(ing: IngredientRef) {
    const isEdit = ingredients.some(i => i.id === ing.id)
    if (isEdit) {
      await fetch(`/api/ingredients/${ing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ing),
      })
      updateLocalLib(ingredients.map(i => i.id === ing.id ? ing : i))
    } else {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ing),
      })
      const saved = await res.json()
      updateLocalLib([...ingredients, saved])
    }
    toast.success(isEdit ? 'Ингредиент сохранён' : 'Ингредиент добавлен')
    setModalTarget(undefined)
    setBarcodePreFill(null)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/ingredients/${id}`, { method: 'DELETE' })
    updateLocalLib(ingredients.filter(i => i.id !== id))
    setConfirmDeleteId(null)
  }

  function handleSelectToggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAll(visibleIds: string[]) {
    const allSelected = visibleIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        visibleIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => new Set([...prev, ...visibleIds]))
    }
  }

  async function handleBulkEnrich() {
    if (!enrichInfo?.canEnrich || enrichProgress) return
    const ids = [...selectedIds]
    if (ids.length === 0) return

    setEnrichProgress({ done: 0, total: ids.length, errors: 0 })
    let done = 0
    let errors = 0
    let lastInfo = enrichInfo

    for (const id of ids) {
      try {
        const res = await fetch(`/api/ingredients/${id}/enrich`, { method: 'POST' })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.ok) {
          errors++
          if (data?.code === 'quota_exceeded' || data?.code === 'plan_required') {
            toast.error(data.error ?? 'Лимит AI-обогащения исчерпан')
            break
          }
        } else if (data.ingredient) {
          updateLocalLib(ingredients.map(i => i.id === id ? { ...i, ...data.ingredient } as IngredientRef : i))
          if (typeof data.remaining === 'number') {
            lastInfo = { ...lastInfo, used: data.used ?? lastInfo.used, remaining: data.remaining, canEnrich: data.remaining > 0, limit: lastInfo.limit }
          }
        }
      } catch {
        errors++
      }
      done++
      setEnrichProgress({ done, total: ids.length, errors })
    }

    setEnrichInfo(lastInfo)
    setEnrichProgress(null)
    setSelectedIds(new Set())
    const success = done - errors
    if (success > 0 && errors === 0) toast.success(`Обогащено: ${success}`)
    else if (success > 0) toast.success(`Обогащено: ${success}, ошибок: ${errors}`)
    else if (errors > 0) toast.error(`Не удалось обогатить (${errors})`)
  }

  async function handleBulkDeleteRequest() {
    if (confirmBulkDelete) {
      const toDelete = [...selectedIds]
      await Promise.all(toDelete.map(id => fetch(`/api/ingredients/${id}`, { method: 'DELETE' })))
      updateLocalLib(ingredients.filter(i => !selectedIds.has(i.id)))
      setSelectedIds(new Set())
      setConfirmBulkDelete(false)
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    } else {
      setConfirmBulkDelete(true)
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = setTimeout(() => setConfirmBulkDelete(false), 4000)
    }
  }

  async function handleBarcodeLookup(input?: string) {
    const code = (input ?? barcodeInput).trim()
    if (!code) return
    setBarcodeStatus('loading')
    try {
      const res = await fetch(`/api/ingredients/lookup-barcode?code=${encodeURIComponent(code)}`)
      const data = await res.json()

      if (res.ok && data.source === 'local' && data.ref) {
        setBarcodeStatus('idle')
        setBarcodeMode(false)
        setBarcodeInput('')
        toast.success('Уже в библиотеке — открываем для редактирования')
        setModalTarget(data.ref as IngredientRef)
        return
      }

      if (res.status === 503 || data.source === 'transient') {
        setBarcodeStatus('error')
        toast.error(data.error ?? 'AI временно недоступен, попробуйте ещё раз')
        return
      }

      if (res.ok && (data.source === 'off' || data.source === 'sonar' || data.source === 'cache') && data.prefill) {
        const p = data.prefill
        const hasFullNutri = p.caloriesPer100 != null && p.proteinPer100 != null && p.fatPer100 != null && p.carbsPer100 != null
        setBarcodePreFill({
          name: (p.name ?? '').trim(),
          unit: 'г',
          caloriesPer100: p.caloriesPer100 ?? 0,
          proteinPer100: p.proteinPer100 ?? 0,
          fatPer100: p.fatPer100 ?? 0,
          carbsPer100: p.carbsPer100 ?? 0,
          category: asCategory(p.category) ?? 'other',
          type: 'mono',
          barcode: code,
          compositionText: p.compositionText || undefined,
          manufacturer: p.manufacturer || undefined,
          packageSize: p.packageSize || undefined,
        })
        setBarcodeStatus('idle')
        setBarcodeMode(false)
        setBarcodeInput('')
        setModalTarget(null)
        const conf = data.confidence as 'low' | 'medium' | 'high' | undefined
        const warning = data.warning as string | undefined
        if (warning === 'zero-calories-with-sugar') {
          toast.error('⚠️ КБЖУ выглядят подозрительно: у напитка с сахаром почти нет калорий. Перепроверьте с упаковкой.')
        } else if (warning === 'calories-vs-carbs-mismatch') {
          toast.error('⚠️ КБЖУ не сходятся: углеводов много, а калорий мало. Перепроверьте.')
        } else if (!hasFullNutri) toast.warning('Название нашли, КБЖУ — впишите с упаковки')
        else if (conf === 'low') toast.warning('AI-оценка КБЖУ — обязательно проверьте перед сохранением')
        else if (conf === 'high') toast.success('Нашли точные данные')
        else toast.success('Нашли данные — проверьте перед сохранением')
        return
      }

      if (res.status === 404 || data.source === 'manual') {
        setBarcodePreFill({
          name: '',
          unit: 'г',
          caloriesPer100: 0,
          proteinPer100: 0,
          fatPer100: 0,
          carbsPer100: 0,
          category: 'other',
          type: 'mono',
          barcode: code,
        })
        setBarcodeStatus('idle')
        setBarcodeMode(false)
        setBarcodeInput('')
        setModalTarget(null)
        toast.info(`Код ${code} не найден — заполните вручную, штрих-код сохранится`)
        return
      }

      setBarcodeStatus('not_found')
    } catch {
      setBarcodeStatus('error')
    }
  }

  const filtered = ingredients.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const allCategories = Object.keys(CATEGORY_LABELS) as IngredientCategory[]

  const grouped = allCategories.reduce<Record<string, IngredientRef[]>>((acc, cat) => {
    const items = filtered.filter(i => (asCategory(i.category) ?? 'other') === cat)
    if (items.length > 0) acc[CATEGORY_LABELS[cat]] = items
    return acc
  }, {})

  const allFilteredIds = filtered.map(i => i.id)
  const allFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id))
  const someFilteredSelected = allFilteredIds.some(id => selectedIds.has(id))

  const barcodeAsRef: IngredientRef | undefined = barcodePreFill
    ? { ...barcodePreFill, id: '__barcode__' }
    : undefined

  const desktopCols = isSystem
    ? '1fr 80px 80px 60px 60px 70px'
    : '28px 1fr 80px 80px 60px 60px 70px 72px'

  return (
    <div className="flex flex-col md:flex-row h-full">

      {/* ── Library sidebar ── */}
      <div
        className="md:w-56 md:shrink-0 md:flex-col md:gap-1 md:pt-8 md:pb-6 md:pr-2 md:border-r md:border-b-0 md:flex
                   flex overflow-x-auto gap-2 px-4 pt-4 pb-3 border-b shrink-0"
        style={{ borderColor: 'rgba(139,92,246,0.18)' }}
      >
        <p className="hidden md:block text-xs font-medium uppercase tracking-wider px-3 mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Библиотеки
        </p>

        {libraries.map(lib => {
          const active = activeLibId === lib.id
          return (
            <button
              key={lib.id}
              onClick={() => { setActiveLibId(lib.id); setSearch('') }}
              className="flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl text-sm text-left shrink-0 md:w-full transition-all active:scale-[0.98]"
              style={{
                background: active ? 'rgba(176,166,223,0.25)' : 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: active ? 500 : 400,
                border: `0.5px solid ${active ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.12)'}`,
                boxShadow: active ? '0 2px 8px rgba(139,92,246,0.10)' : 'none',
              }}
            >
              {lib.isSystem ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
                  <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
                  <path d="M2 10.5h10M2 7.5h10M2 4.5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              )}
              <span className="truncate">{lib.name}</span>
              <span className="ml-auto text-xs shrink-0 hidden md:inline" style={{ color: 'var(--color-text-muted)' }}>
                {lib.ingredients.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className={`flex-1 p-4 sm:p-8 overflow-y-auto${!isSystem && selectedIds.size > 0 ? ' pb-28' : ''}`}>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {activeLib?.name ?? ''}
                </h1>
                {isSystem && <NutriPill tone="neutral" size="sm">Системная</NutriPill>}
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {ingredients.length} ингредиентов
                {isSystem && ' · только просмотр'}
              </p>
            </div>

            {!isSystem && (
              <div className="flex items-center gap-2 shrink-0">
                <GlassButton
                  variant={barcodeMode ? 'primary' : 'secondary'}
                  onClick={() => { setBarcodeMode(m => !m); setBarcodeInput(''); setBarcodeStatus('idle') }}
                  style={barcodeMode ? { background: 'var(--color-text-primary)', borderColor: 'rgba(44,41,80,0.6)' } : undefined}
                  leftIcon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M1 3v10M3 3v10M5 3v10M7 3v6M9 3v10M11 3v10M13 3v6M7 11v2M10 9h3v4h-3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  }
                >
                  <span className="hidden sm:inline">По штрихкоду</span>
                </GlassButton>
                <GlassButton
                  variant="brand"
                  onClick={() => { setBarcodePreFill(null); setModalTarget(null); setBarcodeMode(false) }}
                  leftIcon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  }
                >
                  <span className="hidden sm:inline">Добавить ингредиент</span>
                  <span className="sm:hidden">Добавить</span>
                </GlassButton>
              </div>
            )}
          </div>

          {/* Barcode section */}
          {!isSystem && barcodeMode && (
            <GlassCard
              tone="solid"
              padding="md"
              className="mb-6"
              style={{ background: 'rgba(234,231,248,0.85)', borderColor: 'rgba(139,92,246,0.30)' }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Поиск по штрихкоду
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Введите штрихкод с упаковки — данные о КБЖУ заполнятся автоматически
              </p>
              <div className="flex flex-col sm:flex-row gap-2 items-start">
                <div className="flex flex-col gap-1 flex-1 w-full">
                  <GlassInput
                    value={barcodeInput}
                    onChange={e => { setBarcodeInput(e.target.value); setBarcodeStatus('idle') }}
                    onKeyDown={e => e.key === 'Enter' && handleBarcodeLookup()}
                    placeholder="4630146040576"
                    className="font-mono"
                    invalid={barcodeStatus === 'not_found' || barcodeStatus === 'error'}
                  />
                  {barcodeStatus === 'not_found' && (
                    <p className="text-xs" style={{ color: '#DC2626' }}>
                      Товар не найден. Попробуйте другой штрихкод или добавьте вручную.
                    </p>
                  )}
                  {barcodeStatus === 'error' && (
                    <p className="text-xs" style={{ color: '#DC2626' }}>
                      Ошибка сети. Проверьте подключение.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <GlassButton
                    variant="secondary"
                    onClick={() => setScannerOpen(true)}
                    title="Сканировать камерой"
                    leftIcon={
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <rect x="1.5" y="4" width="13" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                        <circle cx="8" cy="8.75" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M5.5 4l1-1.5h3l1 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      </svg>
                    }
                  >
                    <span className="hidden sm:inline">Камера</span>
                  </GlassButton>
                  <GlassButton
                    variant="brand"
                    onClick={() => handleBarcodeLookup()}
                    disabled={!barcodeInput.trim() || barcodeStatus === 'loading'}
                    className="flex-1 sm:flex-none"
                    leftIcon={
                      barcodeStatus === 'loading' ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin" aria-hidden>
                          <circle cx="7" cy="7" r="5.5" stroke="rgba(44,41,80,0.25)" strokeWidth="1.5" />
                          <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : undefined
                    }
                  >
                    {barcodeStatus === 'loading' ? 'Поиск...' : 'Найти'}
                  </GlassButton>
                  <GlassButton
                    variant="ghost"
                    onClick={() => { setBarcodeMode(false); setBarcodeInput(''); setBarcodeStatus('idle') }}
                  >
                    Отмена
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Search */}
          <div className="mb-6">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Поиск ингредиента..."
            />
          </div>

          {/* Empty state */}
          {ingredients.length === 0 && (
            <GlassCard tone="solid" padding="lg" className="text-center py-16">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(176,166,223,0.20)' }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 4v20M4 14h20" stroke="#B0A6DF" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {isSystem ? 'Библиотека пуста' : 'Справочник пуст'}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {isSystem
                  ? 'Ингредиенты появятся после обновления сервиса'
                  : 'Добавьте первый ингредиент чтобы начать'
                }
              </p>
            </GlassCard>
          )}

          {/* Grouped list */}
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {cat}
              </p>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <div
                  className="grid gap-3 px-4 py-2 text-xs rounded-xl mb-1"
                  style={{
                    color: 'var(--color-text-muted)',
                    gridTemplateColumns: desktopCols,
                    background: 'rgba(176,166,223,0.18)',
                    border: '0.5px solid rgba(139,92,246,0.12)',
                  }}
                >
                  {!isSystem && (
                    <GlassCheckbox
                      checked={items.every(i => selectedIds.has(i.id))}
                      indeterminate={items.some(i => selectedIds.has(i.id)) && !items.every(i => selectedIds.has(i.id))}
                      onChange={() => handleSelectAll(items.map(i => i.id))}
                    />
                  )}
                  <span>Название</span>
                  <span>Единица</span>
                  <span>Калории</span>
                  <span>Белки</span>
                  <span>Жиры</span>
                  <span>Углеводы</span>
                  {!isSystem && <span></span>}
                </div>

                {items.map(ing => (
                  <div
                    key={ing.id}
                    className="grid gap-3 px-4 py-2.5 rounded-xl items-center transition-colors"
                    style={{
                      gridTemplateColumns: desktopCols,
                      borderBottom: '0.5px solid rgba(139,92,246,0.10)',
                      background: selectedIds.has(ing.id) ? 'rgba(139,92,246,0.08)' : 'transparent',
                    }}
                  >
                    {!isSystem && (
                      <GlassCheckbox
                        checked={selectedIds.has(ing.id)}
                        onChange={() => handleSelectToggle(ing.id)}
                      />
                    )}
                    <span className="flex items-center gap-1.5 text-sm font-medium min-w-0" style={{ color: 'var(--color-text-primary)' }}>
                      {ing.type === 'composite' && <CompositeIcon />}
                      <span className="truncate">{ing.name}</span>
                    </span>
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>100 {ing.unit}</span>
                    <span className="text-sm" style={{ color: '#7C5200' }}>{ing.caloriesPer100}</span>
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{ing.proteinPer100}г</span>
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{ing.fatPer100}г</span>
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{ing.carbsPer100}г</span>
                    {!isSystem && (
                      <div className="flex items-center gap-1 justify-end">
                        <IngredientActions
                          ing={ing}
                          confirmDeleteId={confirmDeleteId}
                          onEdit={i => setModalTarget(i)}
                          onConfirmDelete={setConfirmDeleteId}
                          onDelete={handleDelete}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden flex flex-col gap-2">
                {items.map(ing => (
                  <GlassCard
                    key={ing.id}
                    tone="solid"
                    padding="sm"
                    style={
                      selectedIds.has(ing.id)
                        ? { background: 'rgba(139,92,246,0.10)', borderColor: 'rgba(139,92,246,0.35)' }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {!isSystem && (
                          <GlassCheckbox
                            checked={selectedIds.has(ing.id)}
                            onChange={() => handleSelectToggle(ing.id)}
                          />
                        )}
                        <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {ing.type === 'composite' && <CompositeIcon />}
                          {ing.name}
                        </span>
                      </div>
                      {!isSystem && (
                        <div className="flex items-center gap-1 shrink-0">
                          <IngredientActions
                            ing={ing}
                            confirmDeleteId={confirmDeleteId}
                            onEdit={i => setModalTarget(i)}
                            onConfirmDelete={setConfirmDeleteId}
                            onDelete={handleDelete}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <NutriPill tone="neutral" size="xs">100 {ing.unit}</NutriPill>
                      <NutriPill tone="calorie" size="xs" value={ing.caloriesPer100} unit=" ккал" />
                      <NutriPill tone="protein" size="xs" label="Б" value={ing.proteinPer100} unit="г" />
                      <NutriPill tone="fat" size="xs" label="Ж" value={ing.fatPer100} unit="г" />
                      <NutriPill tone="carbs" size="xs" label="У" value={ing.carbsPer100} unit="г" />
                      {ing.type === 'composite' && (
                        <NutriPill tone="brand" size="xs">
                          {ing.composition?.length ?? 0} комп.
                        </NutriPill>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Bulk selection bar (fixed floating dark island) ── */}
      {!isSystem && selectedIds.size > 0 && (
        <>
          <style>{`
            @keyframes bulk-bar-in {
              from { opacity: 0; transform: translateX(-50%) translateY(24px); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
          <div
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 2rem)',
              maxWidth: '640px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '16px',
              background: 'rgba(28, 25, 56, 0.78)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '0.5px solid rgba(176,166,223,0.25)',
              boxShadow: '0 8px 32px rgba(28,25,56,0.35), 0 1px 0 rgba(255,255,255,0.06) inset',
              zIndex: 50,
              animation: 'bulk-bar-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <GlassCheckbox
              checked={allFilteredSelected}
              indeterminate={someFilteredSelected && !allFilteredSelected}
              onChange={() => handleSelectAll(allFilteredIds)}
            />
            <span className="text-sm flex-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Выбрано: <strong>{selectedIds.size}</strong>
            </span>

            <button
              onClick={() => { setSelectedIds(new Set()); setConfirmBulkDelete(false) }}
              disabled={!!enrichProgress}
              className="px-3 h-9 rounded-xl text-sm transition-all active:scale-[0.97]"
              style={{ background: 'rgba(176,166,223,0.18)', color: 'rgba(255,255,255,0.7)' }}
            >
              Отмена
            </button>

            <button
              onClick={handleBulkEnrich}
              disabled={!enrichInfo?.canEnrich || !!enrichProgress}
              title={
                enrichProgress
                  ? `Обогащение… ${enrichProgress.done}/${enrichProgress.total}`
                  : enrichInfo?.canEnrich
                    ? `AI заполнит категорию, потери и КБЖУ. Осталось в этом месяце: ${enrichInfo.remaining ?? '∞'}`
                    : 'AI-обогащение доступно с тарифа Старт'
              }
              className="px-3 h-9 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all active:scale-[0.97]"
              style={{
                background: enrichInfo?.canEnrich && !enrichProgress ? 'rgba(176,166,223,0.4)' : 'rgba(176,166,223,0.15)',
                color: enrichInfo?.canEnrich && !enrichProgress ? '#fff' : 'rgba(255,255,255,0.45)',
                cursor: enrichInfo?.canEnrich && !enrichProgress ? 'pointer' : 'not-allowed',
              }}
            >
              🪄
              {enrichProgress
                ? `${enrichProgress.done}/${enrichProgress.total}`
                : `Дополнить AI`}
            </button>

            <button
              onClick={handleBulkDeleteRequest}
              disabled={!!enrichProgress}
              className="px-4 h-9 rounded-xl text-sm font-medium flex items-center gap-2 transition-all active:scale-[0.97]"
              style={{
                background: confirmBulkDelete ? '#DC2626' : 'rgba(176,166,223,0.25)',
                color: confirmBulkDelete ? '#fff' : 'rgba(255,255,255,0.9)',
                boxShadow: confirmBulkDelete ? '0 4px 12px rgba(220,38,38,0.4)' : 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"
                  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {confirmBulkDelete ? `Подтвердить удаление ${selectedIds.size} записей` : `Удалить ${selectedIds.size}`}
            </button>
          </div>
        </>
      )}

      {/* ── Barcode scanner overlay ── */}
      {scannerOpen && (
        <BarcodeScannerOverlay
          onDetect={code => {
            setScannerOpen(false)
            void handleBarcodeLookup(code)
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* ── Ingredient form modal ── */}
      {modalTarget !== undefined && (
        <IngredientFormModal
          editing={modalTarget === null
            ? (barcodeAsRef?.id === '__barcode__' ? { ...barcodeAsRef, id: crypto.randomUUID() } : undefined)
            : modalTarget
          }
          libraries={libraries}
          allRefs={allRefs}
          selfId={modalTarget?.id}
          onSave={handleSave}
          onClose={() => { setModalTarget(undefined); setBarcodePreFill(null) }}
        />
      )}
    </div>
  )
}

function CompositeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
      <rect x="1" y="9" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1" y="5.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1" y="1.5" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function IngredientActions({
  ing,
  confirmDeleteId,
  onEdit,
  onConfirmDelete,
  onDelete,
}: {
  ing: IngredientRef
  confirmDeleteId: string | null
  onEdit: (ing: IngredientRef) => void
  onConfirmDelete: (id: string | null) => void
  onDelete: (id: string) => void
}) {
  return confirmDeleteId === ing.id ? (
    <>
      <button
        onClick={() => onDelete(ing.id)}
        className="px-2 h-8 rounded-lg text-xs font-medium transition-all active:scale-[0.96]"
        style={{ background: '#DC2626', color: '#fff', boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}
      >
        Удалить
      </button>
      <button
        onClick={() => onConfirmDelete(null)}
        className="px-2 h-8 rounded-lg text-xs transition-all active:scale-[0.96]"
        style={{ background: 'rgba(139,92,246,0.10)', color: 'var(--color-text-secondary)' }}
      >
        ✕
      </button>
    </>
  ) : (
    <>
      <button
        onClick={() => onEdit(ing)}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
        style={{ color: 'var(--color-text-secondary)', background: 'rgba(139,92,246,0.10)' }}
        aria-label="Редактировать"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={() => onConfirmDelete(ing.id)}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
        style={{ color: 'var(--color-text-secondary)', background: 'rgba(139,92,246,0.10)' }}
        aria-label="Удалить"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  )
}
