'use client'

import { useState, useEffect, useRef } from 'react'
import { IngredientLibrary, IngredientRef, IngredientCategory } from '@/types'
import { resolveIngredientPer100 } from '@/lib/utils'
import { CATEGORY_LABELS, asCategory } from '@/lib/cooking-coefficients'
import BarcodeScannerOverlay from './BarcodeScannerOverlay'

interface Props {
  libraries: IngredientLibrary[]
  alreadyAddedIds: string[]
  onSelect: (ref: IngredientRef) => void
  onClose: () => void
  allRefs?: IngredientRef[]
  onIngredientCreated?: (ref: IngredientRef) => void
}

const MY_LIBRARY_ID = 'my-library'

const inputStyle = {
  background: 'rgba(255,255,255,0.6)',
  border: '0.5px solid rgba(255,255,255,0.5)',
  color: 'var(--color-text-primary)',
}

export default function IngredientPickerModal({ libraries, alreadyAddedIds, onSelect, onClose, allRefs, onIngredientCreated }: Props) {
  const [activeLibId, setActiveLibId] = useState<string>(libraries[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Inline create state
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCalories, setNewCalories] = useState(0)
  const [newProtein, setNewProtein] = useState(0)
  const [newFat, setNewFat] = useState(0)
  const [newCarbs, setNewCarbs] = useState(0)
  const [newUnit, setNewUnit] = useState<'г' | 'мл' | 'шт'>('г')
  const [newBarcode, setNewBarcode] = useState('')
  const [newManufacturer, setNewManufacturer] = useState('')
  const [newPackageSize, setNewPackageSize] = useState('')
  const [newCompositionText, setNewCompositionText] = useState('')
  const [newCategory, setNewCategory] = useState<IngredientCategory>('other')
  const [saving, setSaving] = useState(false)

  // Barcode scanner — delegates to shared overlay
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanStatus, setScanStatus] = useState('')

  // Не автофокусим поиск — клавиатура на мобильном перекрывает контент
  useEffect(() => { setSearch('') }, [activeLibId])

  const activeLib = libraries.find(l => l.id === activeLibId)
  const ingredients = activeLib?.ingredients ?? []

  const filtered = search.trim()
    ? ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : ingredients

  const categoryOrder: string[] = []
  const grouped: Record<string, IngredientRef[]> = {}
  for (const ing of filtered) {
    const enumCat = asCategory(ing.category) ?? 'other'
    const cat = CATEGORY_LABELS[enumCat]
    if (!grouped[cat]) { grouped[cat] = []; categoryOrder.push(cat) }
    grouped[cat].push(ing)
  }

  async function lookupBarcode(code: string) {
    setScanStatus(`Ищем продукт (${code})…`)
    setScanError('')
    try {
      const res = await fetch(`/api/ingredients/lookup-barcode?code=${encodeURIComponent(code)}`)
      const data = await res.json()

      // Level 1: local DB — instantly select and close
      if (res.ok && data.source === 'local' && data.ref) {
        setCreating(false)
        onSelect(data.ref as IngredientRef)
        onClose()
        return
      }

      // Transient AI failure — keep form clean, ask user to retry
      if (res.status === 503 || data.source === 'transient') {
        setNewBarcode(code)
        setScanError(data.error ?? 'AI временно недоступен, попробуйте ещё раз')
        return
      }

      // Level 2/3: Gemini grounded search (or cache hit) — prefill, ask to verify
      if (res.ok && (data.source === 'off' || data.source === 'sonar' || data.source === 'cache') && data.prefill) {
        const p = data.prefill
        setNewName(p.name ?? '')
        setNewCalories(p.caloriesPer100 ?? 0)
        setNewProtein(p.proteinPer100 ?? 0)
        setNewFat(p.fatPer100 ?? 0)
        setNewCarbs(p.carbsPer100 ?? 0)
        setNewBarcode(code)
        setNewManufacturer(p.manufacturer ?? '')
        setNewPackageSize(p.packageSize ?? '')
        setNewCompositionText(p.compositionText ?? '')
        setNewCategory(asCategory(p.category) ?? 'other')
        const hasFullNutri = p.caloriesPer100 != null && p.proteinPer100 != null && p.fatPer100 != null && p.carbsPer100 != null
        const conf = data.confidence as 'low' | 'medium' | 'high' | undefined
        const warning = data.warning as string | undefined
        const note = warning === 'zero-calories-with-sugar'
          ? '⚠️ КБЖУ подозрительные: напиток с сахаром, но мало калорий. Сверьте с упаковкой.'
          : warning === 'calories-vs-carbs-mismatch'
            ? '⚠️ КБЖУ не сходятся: углеводов много, а калорий мало. Сверьте.'
            : !hasFullNutri
              ? '⚠️ Название нашли, КБЖУ — впишите с упаковки'
              : conf === 'low'
                ? '⚠️ AI-оценка — проверьте КБЖУ перед сохранением'
                : conf === 'medium'
                  ? 'Данные найдены, проверьте перед сохранением'
                  : 'Нашли точные данные'
        setScanStatus(note)
        return
      }

      // Level 3: not found — keep form open with barcode pinned so user fills manually
      setNewBarcode(code)
      setScanError(`Продукт ${code} не найден — заполните данные вручную, штрих-код сохранится`)
    } catch {
      setScanError('Ошибка при поиске продукта')
    } finally {
      setScanStatus('')
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          unit: newUnit,
          caloriesPer100: newCalories,
          proteinPer100: newProtein,
          fatPer100: newFat,
          carbsPer100: newCarbs,
          type: 'mono',
          category: newCategory,
          barcode: newBarcode || undefined,
          manufacturer: newManufacturer || undefined,
          packageSize: newPackageSize || undefined,
          compositionText: newCompositionText || undefined,
        }),
      })
      if (res.ok) {
        const created: IngredientRef = await res.json()
        onIngredientCreated?.(created)
        onSelect(created)
        setCreating(false)
        setNewName('')
        setNewCalories(0)
        setNewProtein(0)
        setNewFat(0)
        setNewCarbs(0)
        setNewBarcode('')
        setNewManufacturer('')
        setNewPackageSize('')
        setNewCompositionText('')
        setNewCategory('other')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(44,41,80,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col w-full sm:max-w-[560px] overflow-hidden h-[95dvh] sm:h-auto sm:max-h-[92dvh] rounded-t-[20px] sm:rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '0.5px solid rgba(255,255,255,0.6)',
          boxShadow: '0 -8px 48px rgba(139,92,246,0.18)',
        }}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 rounded-full" style={{ background: 'rgba(176,166,223,0.5)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-4"
          style={{ borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
          <p className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {creating ? 'Новый ингредиент' : 'Выбрать ингредиент'}
          </p>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'rgba(139,92,246,0.08)', color: '#7C3AED' }}
            aria-label="Закрыть"
          >✕</button>
        </div>

        {/* ─── Inline create form ─── */}
        {creating ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Название *</p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Например: Куриная грудка"
                  className="flex-1 h-10 px-3 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  title="Сканировать штрих-код"
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M2 7V4a1 1 0 011-1h3M16 3h3a1 1 0 011 1v3M22 17v3a1 1 0 01-1 1h-3M8 21H5a1 1 0 01-1-1v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    <rect x="6" y="8" width="2" height="8" rx="0.5" fill="currentColor"/>
                    <rect x="10" y="8" width="1" height="8" rx="0.5" fill="currentColor"/>
                    <rect x="13" y="8" width="3" height="8" rx="0.5" fill="currentColor"/>
                    <rect x="18" y="8" width="1" height="8" rx="0.5" fill="currentColor"/>
                  </svg>
                </button>
              </div>
              {(scanError || scanStatus) && (
                <p className="text-xs mt-1" style={{ color: scanError ? '#EF4444' : '#7C3AED' }}>
                  {scanError || scanStatus}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Единица измерения</p>
              <select
                value={newUnit}
                onChange={e => setNewUnit(e.target.value as 'г' | 'мл' | 'шт')}
                className="w-28 h-10 px-3 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                <option value="г">г</option>
                <option value="мл">мл</option>
                <option value="шт">шт</option>
              </select>
            </div>

            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>{newUnit === 'шт' ? 'КБЖУ на 1 шт' : 'КБЖУ на 100 г'}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Калории', value: newCalories, set: setNewCalories },
                  { label: 'Белки', value: newProtein, set: setNewProtein },
                  { label: 'Жиры', value: newFat, set: setNewFat },
                  { label: 'Углеводы', value: newCarbs, set: setNewCarbs },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.1}
                      value={value || ''}
                      onChange={e => set(Number(e.target.value))}
                      placeholder="0"
                      className="w-full h-10 px-3 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Library tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-2 flex-wrap"
              style={{ borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
              {libraries.map(lib => (
                <button
                  key={lib.id}
                  onClick={() => setActiveLibId(lib.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg whitespace-nowrap shrink-0 transition-colors"
                  style={{
                    background: activeLibId === lib.id ? 'rgba(139,92,246,0.1)' : 'transparent',
                    color: activeLibId === lib.id ? '#7C3AED' : 'var(--color-text-muted)',
                    fontWeight: activeLibId === lib.id ? 500 : 400,
                    boxShadow: activeLibId === lib.id ? 'inset 0 -2px 0 0 #8B5CF6' : 'none',
                  }}
                >
                  {lib.isSystem && (
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ color: '#B0A6DF' }}>
                      <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  )}
                  {lib.name}
                  <span className="text-xs" style={{ color: '#C8C3F0' }}>{lib.ingredients.length}</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
              <div className="flex items-center gap-2 px-3 h-9 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.5)' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="4.5" stroke="#9D99B8" strokeWidth="1.3"/>
                  <path d="M11 11L14 14" stroke="#9D99B8" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--color-text-primary)' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>✕</button>
                )}
              </div>
            </div>

            {/* Ingredient list */}
            <div className="overflow-y-auto flex-1 px-4 py-3">
              {categoryOrder.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                  {search ? 'Ничего не найдено' : 'Справочник пуст'}
                </p>
              )}
              {categoryOrder.map(cat => (
                <div key={cat} className="mb-4">
                  <p className="text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#C8C3F0' }}>{cat}</p>
                  <div className="space-y-0.5">
                    {grouped[cat].map(ref => {
                      const added = alreadyAddedIds.includes(ref.id)
                      const isComposite = ref.type === 'composite'
                      const resolved = isComposite && allRefs
                        ? resolveIngredientPer100(ref, allRefs)
                        : { caloriesPer100: ref.caloriesPer100, proteinPer100: ref.proteinPer100, fatPer100: ref.fatPer100, carbsPer100: ref.carbsPer100 }
                      return (
                        <button
                          key={ref.id}
                          onClick={() => !added && onSelect(ref)}
                          disabled={added}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-colors"
                          style={{ color: added ? '#C8C3F0' : 'var(--color-text-primary)', cursor: added ? 'default' : 'pointer' }}
                          onMouseEnter={e => { if (!added) (e.currentTarget as HTMLButtonElement).style.background = '#EAE7F8' }}
                          onMouseLeave={e => { if (!added) (e.currentTarget as HTMLButtonElement).style.background = '' }}
                        >
                          <span className="flex items-center gap-1.5 font-medium min-w-0">
                            {isComposite && (
                              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: '#B0A6DF' }}>
                                <rect x="1" y="9" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="1" y="5.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="1" y="1.5" width="12" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                              </svg>
                            )}
                            <span className="truncate">{ref.name}</span>
                          </span>
                          <span className="flex items-center gap-3 text-xs shrink-0 ml-3" style={{ color: added ? '#C8C3F0' : 'var(--color-text-muted)' }}>
                            <span>{resolved.caloriesPer100} ккал</span>
                            <span>Б {resolved.proteinPer100}г</span>
                            <span>Ж {resolved.fatPer100}г</span>
                            <span>У {resolved.carbsPer100}г</span>
                            {added && <span style={{ color: '#B0A6DF' }}>✓</span>}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.4)' }}>
          {creating ? (
            <>
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-xl text-sm"
                style={{ color: 'var(--color-text-secondary)', background: '#EAE7F8' }}
              >
                ← Назад
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || saving}
                className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}
              >
                {saving ? 'Сохраняем…' : 'Создать и добавить'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setCreating(true); setActiveLibId(MY_LIBRARY_ID) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
                style={{ color: '#7C3AED', background: 'rgba(139,92,246,0.08)' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Новый ингредиент
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: '#8B5CF6', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}
              >
                Готово
              </button>
            </>
          )}
        </div>
      </div>
      {scannerOpen && (
        <BarcodeScannerOverlay
          onDetect={(code) => {
            setScannerOpen(false)
            void lookupBarcode(code)
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}

    </div>
  )
}
