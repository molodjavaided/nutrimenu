'use client'

import { useState, useCallback, useRef } from 'react'
import { X, Upload, Download, AlertTriangle, Check, FileSpreadsheet } from 'lucide-react'
import {
  parseFile,
  buildImportedCategories,
  detectConflicts,
  dishKey,
  TEMPLATE_CSV,
  type ParsedDish,
} from '@/lib/importer'
import {
  getCategories,
  saveCategories,
  getAllIngredients,
  getIngredients,
  saveLibraryIngredients,
  MY_LIBRARY_ID,
  getVenue,
} from '@/lib/store'

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

export default function ImportModal({ onClose, onImported }: Props) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dishes, setDishes] = useState<ParsedDish[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [conflicts, setConflicts] = useState<Set<string>>(new Set())
  const [resolutions, setResolutions] = useState<Map<string, 'skip' | 'overwrite'>>(new Map())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
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
      const found = detectConflicts(result.dishes, existing)
      const defaultRes = new Map<string, 'skip' | 'overwrite'>()
      for (const key of found) defaultRes.set(key, 'overwrite')
      setDishes(result.dishes)
      setParseErrors(result.errors)
      setConflicts(found)
      setResolutions(defaultRes)
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

  const handleImport = () => {
    setIsSaving(true)
    const existing = getCategories()
    const allIngredients = getAllIngredients()
    const venue = getVenue()
    const venueId = venue?.id ?? '1'

    const { categories, newIngredients } = buildImportedCategories(
      dishes,
      allIngredients,
      existing,
      resolutions,
      venueId,
    )

    if (newIngredients.length > 0) {
      const existingPersonal = getIngredients()
      saveLibraryIngredients(MY_LIBRARY_ID, [...existingPersonal, ...newIngredients])
    }

    saveCategories(categories)

    const imported = dishes.filter(d => resolutions.get(dishKey(d)) !== 'skip').length
    onImported(imported)
  }

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nutrimenu-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importCount = dishes.filter(d => resolutions.get(dishKey(d)) !== 'skip').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(44,41,80,0.25)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
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
            <h2 className="text-base font-semibold" style={{ color: '#2C2950' }}>
              Импорт меню
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B6490' }}>
              {step === 'upload'
                ? 'Загрузите XLSX или CSV файл с вашим ТТК'
                : `${dishes.length} ${pluralBlud(dishes.length)} распознано`}
            </p>
          </div>
          <button
            onClick={onClose}
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
          ) : (
            <PreviewStep
              dishes={dishes}
              conflicts={conflicts}
              resolutions={resolutions}
              onToggle={(key, val) =>
                setResolutions(prev => new Map(prev).set(key, val))
              }
            />
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div
            className="flex items-center justify-between gap-3 px-6 py-4 shrink-0"
            style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}
          >
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: '#EAE7F8', color: '#6B6490' }}
            >
              Назад
            </button>
            <button
              onClick={handleImport}
              disabled={importCount === 0 || isSaving}
              className="px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
              style={{ background: '#B0A6DF', color: '#2C2950' }}
            >
              {isSaving
                ? 'Сохранение…'
                : `Импортировать ${importCount} ${pluralBlud(importCount)}`}
            </button>
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
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all py-12 px-6 text-center select-none"
        style={{
          border: isDragging
            ? '2px dashed #B0A6DF'
            : '2px dashed rgba(176,166,223,0.5)',
          background: isDragging
            ? 'rgba(176,166,223,0.12)'
            : 'rgba(234,231,248,0.4)',
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

      {/* Errors */}
      {parseErrors.length > 0 && (
        <div
          className="rounded-xl px-4 py-3 space-y-1"
          style={{ background: 'rgba(255,100,80,0.08)', border: '0.5px solid rgba(255,100,80,0.2)' }}
        >
          {parseErrors.map((e, i) => (
            <p key={i} className="text-xs" style={{ color: '#C0392B' }}>
              {e}
            </p>
          ))}
        </div>
      )}

      {/* Format hint + template download */}
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
  onToggle: (key: string, val: 'skip' | 'overwrite') => void
}

function PreviewStep({ dishes, conflicts, resolutions, onToggle }: PreviewStepProps) {
  const conflictCount = conflicts.size

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

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '0.5px solid rgba(176,166,223,0.35)' }}
      >
        {/* Header row */}
        <div
          className="grid text-xs font-medium px-4 py-2.5"
          style={{
            gridTemplateColumns: '1fr 120px 80px 140px',
            background: 'rgba(234,231,248,0.8)',
            color: '#6B6490',
            borderBottom: '0.5px solid rgba(176,166,223,0.3)',
          }}
        >
          <span>Блюдо / Категория</span>
          <span>Ингредиенты</span>
          <span>Вес</span>
          <span>Статус</span>
        </div>

        {/* Dish rows */}
        <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.2)' }}>
          {dishes.map(dish => {
            const key = dishKey(dish)
            const isConflict = conflicts.has(key)
            const resolution = resolutions.get(key)
            const totalWeight = dish.ingredients.reduce((s, i) => s + i.netWeight, 0)

            return (
              <div
                key={key}
                className="grid items-center px-4 py-3 text-sm"
                style={{
                  gridTemplateColumns: '1fr 120px 80px 140px',
                  background:
                    isConflict && resolution === 'skip'
                      ? 'rgba(0,0,0,0.02)'
                      : 'transparent',
                  opacity: isConflict && resolution === 'skip' ? 0.5 : 1,
                }}
              >
                {/* Name + category */}
                <div className="min-w-0 pr-3">
                  <p
                    className="font-medium truncate text-sm"
                    style={{ color: '#2C2950' }}
                  >
                    {dish.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: '#6B6490' }}>
                    {dish.category}
                  </p>
                </div>

                {/* Ingredient count */}
                <span className="text-xs" style={{ color: '#6B6490' }}>
                  {dish.ingredients.length > 0
                    ? `${dish.ingredients.length} ингр.`
                    : '—'}
                </span>

                {/* Weight */}
                <span className="text-xs" style={{ color: '#6B6490' }}>
                  {totalWeight > 0 ? `${totalWeight} г` : '—'}
                </span>

                {/* Status / conflict controls */}
                {isConflict ? (
                  <div className="flex gap-1">
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
                  <span
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: '#2A9D5C' }}
                  >
                    <Check size={13} />
                    Новое
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {dishes.some(d => d.ingredients.some(i => i.netWeight === 0)) && (
        <p className="text-xs px-1" style={{ color: '#6B6490' }}>
          Ингредиенты с нулевым весом будут добавлены без учёта в состав.
        </p>
      )}
    </div>
  )
}
