'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { X, Upload, Download, AlertTriangle, Check, FileSpreadsheet, RotateCcw, Trash2, Info, ChevronRight } from 'lucide-react'
import {
  parseFile,
  buildImportedCategories,
  detectConflicts,
  detectIngredientMatches,
  dishKey,
  TEMPLATE_CSV,
  type ParsedDish,
  type IngredientMatch,
} from '@/lib/importer'
import {
  getCategories,
  saveCategories,
  getAllIngredients,
  getIngredients,
  saveLibraryIngredients,
  MY_LIBRARY_ID,
  getVenue,
  createImportBackup,
  rollbackImport,
  clearImportBackup,
} from '@/lib/store'
import GlassCheckbox from '@/components/ui/GlassCheckbox'

const UNDO_SECONDS = 30

interface Props {
  onClose: () => void
  onImported: (count: number) => void
}

function pluralBlud(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 14) return 'блюд'
  const r = n % 10
  if (r === 1) return 'блюдо'
  if (r >= 2 && r <= 4) return 'блюда'
  return 'блюд'
}

function buildButtonLabel(dishCount: number, prepCount: number): string {
  const parts: string[] = []
  if (dishCount > 0) parts.push(`${dishCount} ${pluralBlud(dishCount)}`)
  if (prepCount > 0) parts.push(`${prepCount} заготовок`)
  return parts.length ? `Импортировать: ${parts.join(' + ')}` : 'Нечего импортировать'
}

export default function ImportModal({ onClose, onImported }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'matching' | 'success'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dishes, setDishes] = useState<ParsedDish[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [conflicts, setConflicts] = useState<Set<string>>(new Set())
  const [resolutions, setResolutions] = useState<Map<string, 'skip' | 'overwrite'>>(new Map())
  const [matches, setMatches] = useState<IngredientMatch[]>([])
  const [ingredientDecisions, setIngredientDecisions] = useState<Map<string, string | 'new'>>(new Map())
  const [countdown, setCountdown] = useState(UNDO_SECONDS)
  const [savedDishCount, setSavedDishCount] = useState(0)
  const [savedPrepCount, setSavedPrepCount] = useState(0)
  const [savedNewIngCount, setSavedNewIngCount] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-close after undo window expires
  useEffect(() => {
    if (step !== 'success') return
    if (countdown <= 0) {
      clearImportBackup()
      onImported(savedDishCount)
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown, savedDishCount, onImported])

  // Auto-cancel confirm state after 3 s of inaction
  useEffect(() => {
    if (!confirmDelete) return
    confirmTimeoutRef.current = setTimeout(() => setConfirmDelete(false), 3000)
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
    }
  }, [confirmDelete])

  const handleSuccessClose = useCallback(() => {
    clearImportBackup()
    onImported(savedDishCount)
  }, [savedDishCount, onImported])

  const handleUndo = useCallback(() => {
    rollbackImport()
    onImported(0)
  }, [onImported])

  const handleFile = useCallback(async (file: File) => {
    setDishes([])
    setConflicts(new Set())
    setResolutions(new Map())
    setSelectedIds(new Set())
    setMatches([])
    setIngredientDecisions(new Map())
    setConfirmDelete(false)
    setIsLoading(true)
    setParseErrors([])
    try {
      const result = await parseFile(file)
      if (result.dishes.length === 0 && result.errors.length === 0) {
        setParseErrors(['Файл пустой или не удалось распознать данные. Проверьте заголовки столбцов.'])
        setIsLoading(false)
        return
      }
      const existing = getCategories()
      const allIngr = getAllIngredients()
      const found = detectConflicts(result.dishes, existing)
      const defaultRes = new Map<string, 'skip' | 'overwrite'>()
      for (const key of found) defaultRes.set(key, 'overwrite')

      // Detect uncertain ingredient matches for the review step
      const foundMatches = detectIngredientMatches(result.dishes, allIngr)
      const initDecisions = new Map<string, string | 'new'>()
      for (const m of foundMatches) initDecisions.set(m.normalizedKey, m.autoPreselect)

      setDishes(result.dishes)
      setParseErrors(result.errors)
      setConflicts(found)
      setResolutions(defaultRes)
      setMatches(foundMatches)
      setIngredientDecisions(initDecisions)
      setStep('preview')
    } catch (err) {
      setParseErrors([String(err)])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleImport = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 0))
    createImportBackup()

    const existing = getCategories()
    const allIngredients = getAllIngredients()
    const venue = getVenue()
    const venueId = venue?.id ?? '1'

    const { categories, preparations, newIngredients } = buildImportedCategories(
      dishes,
      allIngredients,
      existing,
      resolutions,
      venueId,
      ingredientDecisions,
    )

    const allToLibrary = [...preparations, ...newIngredients]
    if (allToLibrary.length > 0) {
      const existingPersonal = getIngredients()
      const replacedIds = new Set(allToLibrary.map(r => r.id))
      const kept = existingPersonal.filter(r => !replacedIds.has(r.id))
      saveLibraryIngredients(MY_LIBRARY_ID, [...kept, ...allToLibrary])
    }

    saveCategories(categories)

    const dishCount = dishes.filter(
      d => d.kind === 'dish' && resolutions.get(dishKey(d)) !== 'skip'
    ).length
    const prepCount = dishes.filter(d => d.kind === 'preparation').length

    setSavedDishCount(dishCount)
    setSavedPrepCount(prepCount)
    setSavedNewIngCount(newIngredients.length)
    setCountdown(UNDO_SECONDS)
    setStep('success')
    setIsSaving(false)
  }

  // ─── Selection handlers ────────────────────────────────────────

  const handleSelectToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback((visibleIds: string[]) => {
    setSelectedIds(prev =>
      prev.size === visibleIds.length
        ? new Set()
        : new Set(visibleIds),
    )
  }, [])

  const handleDeleteSelected = useCallback(() => {
    const remaining = dishes.filter(d => !selectedIds.has(d.id))
    setDishes(remaining)
    const remainingKeys = new Set(remaining.map(d => dishKey(d)))
    setConflicts(prev => new Set([...prev].filter(k => remainingKeys.has(k))))
    setResolutions(prev => {
      const next = new Map(prev)
      for (const k of prev.keys()) {
        if (!remainingKeys.has(k)) next.delete(k)
      }
      return next
    })
    setSelectedIds(new Set())
    setConfirmDelete(false)
  }, [dishes, selectedIds])

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nutrimenu-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const dishImportCount = dishes.filter(
    d => d.kind === 'dish' && resolutions.get(dishKey(d)) !== 'skip'
  ).length
  const prepCount = dishes.filter(d => d.kind === 'preparation').length
  const importCount = dishImportCount + prepCount

  // Counts for matching step
  const undecidedCount = matches.filter(m => !ingredientDecisions.has(m.normalizedKey)).length

  // ─── Step labels ───────────────────────────────────────────────

  const headerSubtitle =
    step === 'upload'
      ? 'Загрузите XLSX или CSV файл с вашим ТТК'
      : step === 'matching'
      ? `${matches.length} ингред${matches.length === 1 ? 'иент' : 'иента'} требуют проверки`
      : step === 'success'
      ? `${savedDishCount} ${pluralBlud(savedDishCount)} в меню` +
        (savedPrepCount > 0 ? ` · ${savedPrepCount} заготовок в ингредиенты` : '')
      : `${dishImportCount} ${pluralBlud(dishImportCount)} в меню` +
        (prepCount > 0 ? ` · ${prepCount} заготовок в ингредиенты` : '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(44,41,80,0.25)', backdropFilter: 'blur(8px)' }}
        onClick={step === 'success' ? handleSuccessClose : onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(254,254,242,0.97)',
          border: '0.5px solid rgba(176,166,223,0.5)',
          boxShadow: '0 24px 80px rgba(44,41,80,0.18)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: '0.5px solid rgba(176,166,223,0.3)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold" style={{ color: '#2C2950' }}>
                Импорт меню
              </h2>
              {/* Step breadcrumb */}
              {(step === 'preview' || step === 'matching') && (
                <div className="flex items-center gap-1 text-xs" style={{ color: '#9D99B8' }}>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{
                      background: step === 'preview' ? 'rgba(176,166,223,0.25)' : 'transparent',
                      color: step === 'preview' ? '#2C2950' : '#9D99B8',
                    }}
                  >
                    Просмотр
                  </span>
                  {matches.length > 0 && (
                    <>
                      <ChevronRight size={11} />
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          background: step === 'matching' ? 'rgba(176,166,223,0.25)' : 'transparent',
                          color: step === 'matching' ? '#2C2950' : '#9D99B8',
                        }}
                      >
                        Сопоставление
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: '#6B6490' }}>{headerSubtitle}</p>
          </div>
          <button
            onClick={step === 'success' ? handleSuccessClose : onClose}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
          >
            <X size={16} style={{ color: '#6B6490' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'upload' ? (
            <UploadStep
              isDragging={isDragging}
              isLoading={isLoading}
              parseErrors={parseErrors}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onFileSelect={handleFile}
              onDownloadTemplate={downloadTemplate}
              fileInputRef={fileInputRef}
            />
          ) : step === 'success' ? (
            <SuccessStep
              dishCount={savedDishCount}
              prepCount={savedPrepCount}
              newIngCount={savedNewIngCount}
              countdown={countdown}
              total={UNDO_SECONDS}
              onUndo={handleUndo}
              onClose={handleSuccessClose}
            />
          ) : step === 'matching' ? (
            <MatchingStep
              matches={matches}
              decisions={ingredientDecisions}
              onDecide={(key, choice) =>
                setIngredientDecisions(prev => new Map(prev).set(key, choice))
              }
            />
          ) : (
            <PreviewStep
              dishes={dishes}
              conflicts={conflicts}
              resolutions={resolutions}
              selectedIds={selectedIds}
              onToggle={(key, val) =>
                setResolutions(prev => new Map(prev).set(key, val))
              }
              onSelectToggle={handleSelectToggle}
              onSelectAll={handleSelectAll}
            />
          )}
        </div>

        {/* Bulk delete bar — preview only */}
        {step === 'preview' && selectedIds.size > 0 && (
          <div
            className="flex items-center justify-between gap-3 px-6 py-3 shrink-0"
            style={{
              background: confirmDelete ? 'rgba(192,57,43,0.06)' : 'rgba(176,166,223,0.1)',
              borderTop: confirmDelete ? '0.5px solid rgba(192,57,43,0.2)' : '0.5px solid rgba(176,166,223,0.25)',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
          >
            {confirmDelete ? (
              <>
                <span className="text-xs font-medium" style={{ color: '#C0392B' }}>
                  Удалить {selectedIds.size} позиц{selectedIds.size === 1 ? 'ию' : 'ии'}? Это нельзя отменить.
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-70"
                    style={{ background: 'rgba(176,166,223,0.2)', color: '#6B6490' }}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(192,57,43,0.12)', color: '#C0392B', border: '0.5px solid rgba(192,57,43,0.3)' }}
                  >
                    <Trash2 size={12} />
                    Да, удалить
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-xs" style={{ color: '#6B6490' }}>
                  Выбрано: <span className="font-medium" style={{ color: '#2C2950' }}>{selectedIds.size}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                    style={{ color: '#6B6490' }}
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      background: 'rgba(176,166,223,0.2)',
                      color: '#2C2950',
                      border: '0.5px solid rgba(176,166,223,0.4)',
                    }}
                  >
                    <Trash2 size={12} />
                    Удалить выбранные
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer — preview */}
        {step === 'preview' && (
          <div
            className="flex items-center justify-between gap-3 px-6 py-4 shrink-0"
            style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}
          >
            <button
              onClick={() => {
                setStep('upload')
                setSelectedIds(new Set())
                setConfirmDelete(false)
              }}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: '#EAE7F8', color: '#6B6490' }}
            >
              Назад
            </button>
            {matches.length > 0 ? (
              <button
                onClick={() => setStep('matching')}
                disabled={importCount === 0}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
                style={{ background: '#B0A6DF', color: '#2C2950' }}
              >
                Сопоставление ингредиентов
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleImport}
                disabled={importCount === 0 || isSaving}
                className="px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
                style={{ background: '#B0A6DF', color: '#2C2950' }}
              >
                {isSaving ? 'Сохранение…' : buildButtonLabel(dishImportCount, prepCount)}
              </button>
            )}
          </div>
        )}

        {/* Footer — matching */}
        {step === 'matching' && (
          <div
            className="flex items-center justify-between gap-3 px-6 py-4 shrink-0"
            style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}
          >
            <button
              onClick={() => setStep('preview')}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: '#EAE7F8', color: '#6B6490' }}
            >
              Назад
            </button>
            <div className="flex items-center gap-3">
              {undecidedCount > 0 && (
                <span className="text-xs" style={{ color: '#D4830A' }}>
                  Не указано: {undecidedCount}
                </span>
              )}
              <button
                onClick={handleImport}
                disabled={undecidedCount > 0 || isSaving}
                className="px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
                style={{ background: '#B0A6DF', color: '#2C2950' }}
              >
                {isSaving ? 'Сохранение…' : buildButtonLabel(dishImportCount, prepCount)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Upload step ───────────────────────────────────────────────

interface UploadStepProps {
  isDragging: boolean
  isLoading: boolean
  parseErrors: string[]
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onFileSelect: (f: File) => void
  onDownloadTemplate: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

function UploadStep({
  isDragging,
  isLoading,
  parseErrors,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onDownloadTemplate,
  fileInputRef,
}: UploadStepProps) {
  return (
    <div className="p-6 space-y-5">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all py-12 px-6 text-center select-none"
        style={{
          border: isDragging ? '2px dashed #B0A6DF' : '2px dashed rgba(176,166,223,0.5)',
          background: isDragging ? 'rgba(176,166,223,0.12)' : 'rgba(234,231,248,0.4)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {isLoading ? (
          <>
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: '#6B6490' }}>Обрабатываем файл…</p>
          </>
        ) : (
          <>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(176,166,223,0.2)' }}
            >
              <Upload size={24} style={{ color: '#B0A6DF' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: '#2C2950' }}>
                Перетащите файл сюда
              </p>
              <p className="text-xs mt-1" style={{ color: '#6B6490' }}>
                или нажмите чтобы выбрать · XLSX, XLS, CSV
              </p>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) onFileSelect(f)
            e.target.value = ''
          }}
        />
      </div>

      {parseErrors.length > 0 && (
        <div
          className="rounded-xl px-4 py-3 space-y-1"
          style={{ background: 'rgba(255,100,80,0.08)', border: '0.5px solid rgba(255,100,80,0.2)' }}
        >
          {parseErrors.map((e, i) => (
            <p key={i} className="text-xs" style={{ color: '#C0392B' }}>{e}</p>
          ))}
        </div>
      )}

      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: 'rgba(234,231,248,0.6)', border: '0.5px solid rgba(176,166,223,0.3)' }}
      >
        <div className="flex items-start gap-3">
          <FileSpreadsheet size={16} className="mt-0.5 shrink-0" style={{ color: '#B0A6DF' }} />
          <div className="space-y-1 text-xs" style={{ color: '#6B6490' }}>
            <p className="font-medium" style={{ color: '#2C2950' }}>Формат файла</p>
            <p>Каждая строка — один ингредиент одного блюда. Нужные колонки:</p>
            <code
              className="block rounded-lg px-3 py-2 text-xs mt-1 font-mono leading-relaxed"
              style={{ background: 'rgba(176,166,223,0.15)', color: '#2C2950' }}
            >
              Dish Name · Category · Ingredient Name · Net Weight (g) · Instructions
            </code>
            <p className="pt-0.5">
              Несколько строк с одинаковым блюдом объединяются в состав автоматически.
            </p>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDownloadTemplate() }}
          className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: '#2C2950' }}
        >
          <Download size={13} />
          Скачать шаблон CSV
        </button>
      </div>
    </div>
  )
}

// ─── Preview step ──────────────────────────────────────────────

interface PreviewStepProps {
  dishes: ParsedDish[]
  conflicts: Set<string>
  resolutions: Map<string, 'skip' | 'overwrite'>
  selectedIds: Set<string>
  onToggle: (key: string, val: 'skip' | 'overwrite') => void
  onSelectToggle: (id: string) => void
  onSelectAll: (visibleIds: string[]) => void
}

function PreviewStep({
  dishes,
  conflicts,
  resolutions,
  selectedIds,
  onToggle,
  onSelectToggle,
  onSelectAll,
}: PreviewStepProps) {
  const conflictCount = conflicts.size

  const seenKeys = new Set<string>()
  const uniqueDishes = dishes.filter(d => {
    if (seenKeys.has(d.id)) return false
    seenKeys.add(d.id)
    return true
  })

  const visibleIds = uniqueDishes.map(d => d.id)
  const allSelected = visibleIds.length > 0 && selectedIds.size === visibleIds.length
  const someSelected = selectedIds.size > 0 && !allSelected

  return (
    <div className="p-6 space-y-4">
      {conflictCount > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,180,50,0.1)', border: '0.5px solid rgba(255,180,50,0.3)' }}
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: '#D4830A' }} />
          <p className="text-xs" style={{ color: '#8A5500' }}>
            <span className="font-medium">{conflictCount} {pluralBlud(conflictCount)}</span> уже существуют в меню.
            Выберите: перезаписать или пропустить.
          </p>
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '0.5px solid rgba(176,166,223,0.35)' }}
      >
        <div
          className="grid items-center text-xs font-medium px-4 py-2.5"
          style={{
            gridTemplateColumns: '28px 1fr 110px 72px 140px',
            background: 'rgba(234,231,248,0.8)',
            color: '#6B6490',
            borderBottom: '0.5px solid rgba(176,166,223,0.3)',
          }}
        >
          <GlassCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={() => onSelectAll(visibleIds)}
          />
          <span className="pl-1">Блюдо / Категория</span>
          <span>Ингредиенты</span>
          <span>Вес</span>
          <span>Статус</span>
        </div>

        <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.2)' }}>
          {uniqueDishes.map((dish) => {
            const key = dishKey(dish)
            const isConflict = conflicts.has(key)
            const resolution = resolutions.get(key)
            const totalWeight = dish.ingredients.filter(i => i.unit !== 'шт').reduce((s, i) => s + i.netWeight, 0)
            const isSelected = selectedIds.has(dish.id)
            const isSkipped = dish.kind === 'dish' && isConflict && resolution === 'skip'

            return (
              <div
                key={dish.id}
                onClick={() => onSelectToggle(dish.id)}
                className="grid items-center px-4 py-3 text-sm cursor-pointer"
                style={{
                  gridTemplateColumns: '28px 1fr 110px 72px 140px',
                  background: isSelected ? 'rgba(176,166,223,0.13)' : isSkipped ? 'rgba(0,0,0,0.02)' : 'transparent',
                  borderLeft: isSelected ? '2px solid #B0A6DF' : '2px solid transparent',
                  opacity: isSkipped && !isSelected ? 0.5 : 1,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
              >
                <GlassCheckbox checked={isSelected} onChange={() => onSelectToggle(dish.id)} />

                <div className="min-w-0 pl-1 pr-3">
                  <p className="font-medium truncate text-sm" style={{ color: '#2C2950' }}>{dish.name}</p>
                  <p className="text-xs truncate" style={{ color: '#6B6490' }}>{dish.category}</p>
                </div>

                <span className="text-xs" style={{ color: '#6B6490' }}>
                  {dish.ingredients.length > 0 ? `${dish.ingredients.length} ингр.` : '—'}
                </span>

                <span className="text-xs" style={{ color: '#6B6490' }}>
                  {totalWeight > 0 ? `${Math.round(totalWeight)} г` : '—'}
                </span>

                {dish.kind === 'preparation' ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit"
                    style={{ background: 'rgba(176,166,223,0.2)', color: '#6B6490', border: '0.5px solid rgba(176,166,223,0.4)' }}
                  >
                    → Ингредиенты
                  </span>
                ) : isConflict ? (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onToggle(key, 'overwrite')}
                      className="flex-1 h-7 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: resolution === 'overwrite' ? '#B0A6DF' : 'rgba(176,166,223,0.15)',
                        color: resolution === 'overwrite' ? '#2C2950' : '#6B6490',
                        border: resolution === 'overwrite' ? 'none' : '0.5px solid rgba(176,166,223,0.3)',
                      }}
                    >
                      Заменить
                    </button>
                    <button
                      onClick={() => onToggle(key, 'skip')}
                      className="flex-1 h-7 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: resolution === 'skip' ? '#EAE7F8' : 'rgba(176,166,223,0.08)',
                        color: resolution === 'skip' ? '#2C2950' : '#6B6490',
                        border: '0.5px solid rgba(176,166,223,0.3)',
                      }}
                    >
                      Пропустить
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: '#2A9D5C' }}>
                    <Check size={13} />
                    Новое
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {uniqueDishes.some(d => d.ingredients.some(i => i.netWeight === 0)) && (
        <p className="text-xs px-1" style={{ color: '#6B6490' }}>
          Ингредиенты с нулевым весом будут добавлены без учёта в состав.
        </p>
      )}
    </div>
  )
}

// ─── Matching step ─────────────────────────────────────────────

function UnitBadge({ unit }: { unit: string }) {
  const isSpecial = unit !== 'г' && unit !== 'мл'
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full shrink-0"
      style={{
        background: isSpecial ? 'rgba(255,180,50,0.15)' : 'rgba(176,166,223,0.15)',
        color: isSpecial ? '#D4830A' : '#6B6490',
        border: `0.5px solid ${isSpecial ? 'rgba(255,180,50,0.3)' : 'rgba(176,166,223,0.3)'}`,
      }}
    >
      {unit}
    </span>
  )
}

function MatchingStep({
  matches,
  decisions,
  onDecide,
}: {
  matches: IngredientMatch[]
  decisions: Map<string, string | 'new'>
  onDecide: (key: string, choice: string | 'new') => void
}) {
  return (
    <div className="p-6 space-y-4">
      {/* Info banner */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: 'rgba(176,166,223,0.12)', border: '0.5px solid rgba(176,166,223,0.3)' }}
      >
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: '#6B6490' }} />
        <p className="text-xs leading-relaxed" style={{ color: '#6B6490' }}>
          Система нашла похожие ингредиенты в вашем справочнике, но не может связать их автоматически.
          Просмотрите и выберите для каждого: использовать существующий или создать новый.
        </p>
      </div>

      {/* Match cards */}
      <div className="space-y-3">
        {matches.map(match => {
          const decision = decisions.get(match.normalizedKey)
          const isUndecided = decision === undefined

          return (
            <div
              key={match.normalizedKey}
              className="rounded-xl p-4"
              style={{
                background: isUndecided
                  ? 'rgba(255,180,50,0.06)'
                  : 'rgba(234,231,248,0.5)',
                border: `0.5px solid ${isUndecided ? 'rgba(255,180,50,0.3)' : 'rgba(176,166,223,0.3)'}`,
                transition: 'background 0.2s ease, border-color 0.2s ease',
              }}
            >
              {/* Header row: name + unit + undecided badge */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-sm font-medium" style={{ color: '#2C2950' }}>
                  {match.importedName}
                </span>
                <UnitBadge unit={match.unit} />
                {isUndecided && (
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,180,50,0.2)', color: '#D4830A', border: '0.5px solid rgba(255,180,50,0.35)' }}
                  >
                    Не указано
                  </span>
                )}
                {decision && !isUndecided && (
                  <Check size={13} className="ml-auto" style={{ color: '#2A9D5C' }} />
                )}
              </div>

              {/* Option chips */}
              <div className="flex flex-wrap gap-2">
                {match.candidates.map(c => {
                  const isSelected = decision === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => onDecide(match.normalizedKey, c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all active:scale-95"
                      style={
                        isSelected
                          ? { background: '#8B5CF6', color: '#fff', boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }
                          : { background: 'rgba(255,255,255,0.8)', color: '#6B6490', border: '0.5px solid rgba(176,166,223,0.45)' }
                      }
                    >
                      {isSelected && <Check size={11} />}
                      <span>{c.name}</span>
                      <span style={{ opacity: 0.55 }}>{Math.round(c.score * 100)}%</span>
                    </button>
                  )
                })}

                {/* Create new */}
                <button
                  onClick={() => onDecide(match.normalizedKey, 'new')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all active:scale-95"
                  style={
                    decision === 'new'
                      ? { background: '#2A9D5C', color: '#fff', boxShadow: '0 2px 8px rgba(42,157,92,0.2)' }
                      : { background: 'rgba(255,255,255,0.8)', color: '#6B6490', border: '0.5px solid rgba(176,166,223,0.45)' }
                  }
                >
                  {decision === 'new' && <Check size={11} />}
                  + Создать новый
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Success step ──────────────────────────────────────────────

interface SuccessStepProps {
  dishCount: number
  prepCount: number
  newIngCount: number
  countdown: number
  total: number
  onUndo: () => void
  onClose: () => void
}

function SuccessStep({ dishCount, prepCount, newIngCount, countdown, total, onUndo, onClose }: SuccessStepProps) {
  const progress = (countdown / total) * 100

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3 pt-6 pb-2">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(42,157,92,0.12)' }}
        >
          <Check size={26} style={{ color: '#2A9D5C' }} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-base" style={{ color: '#2C2950' }}>
            {buildButtonLabel(dishCount, prepCount).replace('Импортировать: ', '')}
          </p>
          <p className="text-xs mt-1" style={{ color: '#6B6490' }}>
            {prepCount > 0 ? 'Блюда добавлены в меню, заготовки — в ингредиенты' : 'Блюда добавлены в меню'}
          </p>
          {newIngCount > 0 && (
            <p className="text-xs mt-0.5" style={{ color: '#2A9D5C' }}>
              + {newIngCount} новых ингредиентов добавлено в справочник
            </p>
          )}
        </div>
      </div>

      <div
        className="w-full rounded-xl overflow-hidden"
        style={{ border: '0.5px solid rgba(176,166,223,0.35)' }}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ background: 'rgba(234,231,248,0.6)' }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: '#6B6490' }}>
            <RotateCcw size={13} />
            <span>Отменить импорт · {countdown}с</span>
          </div>
          <button
            onClick={onUndo}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: 'rgba(176,166,223,0.3)', color: '#2C2950' }}
          >
            Отменить
          </button>
        </div>
        <div style={{ height: '3px', background: 'rgba(176,166,223,0.2)' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: '#B0A6DF',
              transition: 'width 1s linear',
            }}
          />
        </div>
      </div>

      <button
        onClick={onClose}
        className="text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: '#6B6490' }}
      >
        Закрыть
      </button>
    </div>
  )
}
