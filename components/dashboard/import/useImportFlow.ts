'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
import { Category, IngredientRef } from '@/types'
import { getTTKExamples, saveTTKExample } from '@/lib/ttk-examples'
import { pluralBlud, buildButtonLabel } from './utils'

const UNDO_SECONDS = 30

export interface ImportLimit {
  emailVerified: boolean
  ttkImportCount: number
  limit: number
  remaining: number
  canImport: boolean
}

export type ImportStep = 'upload' | 'preview' | 'matching' | 'success'

export function useImportFlow(onClose: () => void, onImported: (count: number) => void) {
  const [existingCategories, setExistingCategories] = useState<Category[]>([])
  const [existingIngredients, setExistingIngredients] = useState<IngredientRef[]>([])
  const [importLimit, setImportLimit] = useState<ImportLimit | null>(null)

  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : []).then(setExistingCategories)
    fetch('/api/ingredients').then(r => r.ok ? r.json() : []).then(setExistingIngredients)
    fetch('/api/import/limit').then(r => r.ok ? r.json() : null).then(setImportLimit)
  }, [])

  const [step, setStep] = useState<ImportStep>('upload')
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
  const [aiCorrections, setAiCorrections] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [rawSheets, setRawSheets] = useState<Array<{ name: string; rows: string[][] }>>([])
  const [importSource, setImportSource] = useState<'file' | 'sheets' | 'pdf'>('file')
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-close after undo window expires
  useEffect(() => {
    if (step !== 'success') return
    if (countdown <= 0) { onImported(savedDishCount); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown, savedDishCount, onImported])

  // Auto-cancel confirm state after 3s of inaction
  useEffect(() => {
    if (!confirmDelete) return
    confirmTimeoutRef.current = setTimeout(() => setConfirmDelete(false), 3000)
    return () => { if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current) }
  }, [confirmDelete])

  const handleSuccessClose = useCallback(() => { onImported(savedDishCount) }, [savedDishCount, onImported])
  const handleUndo = useCallback(() => { onImported(0) }, [onImported])

  const resetParseState = () => {
    setDishes([])
    setConflicts(new Set())
    setResolutions(new Map())
    setSelectedIds(new Set())
    setMatches([])
    setIngredientDecisions(new Map())
    setConfirmDelete(false)
    setAiCorrections([])
    setRawSheets([])
    setParseErrors([])
  }

  const applyParsedResult = (
    parsedDishes: ParsedDish[],
    errors: string[],
    corrections: string[],
  ) => {
    const found = detectConflicts(parsedDishes, existingCategories)
    const defaultRes = new Map<string, 'skip' | 'overwrite'>()
    for (const key of found) defaultRes.set(key, 'overwrite')
    const foundMatches = detectIngredientMatches(parsedDishes, existingIngredients)
    const initDecisions = new Map<string, string | 'new'>()
    for (const m of foundMatches) initDecisions.set(m.normalizedKey, m.autoPreselect)

    setDishes(parsedDishes)
    setParseErrors(errors)
    setAiCorrections(corrections)
    setConflicts(found)
    setResolutions(defaultRes)
    setMatches(foundMatches)
    setIngredientDecisions(initDecisions)
    setStep('preview')
  }

  const handleFile = useCallback(async (file: File) => {
    resetParseState()
    setImportSource('file')
    setIsLoading(true)
    try {
      const result = await parseFile(file)
      if (result.dishes.length === 0 && result.errors.length === 0) {
        setParseErrors(['Файл пустой или не удалось распознать данные. Проверьте заголовки столбцов.'])
        return
      }

      let finalDishes = result.dishes

      if (result.rawSheets && result.rawSheets.length > 0) {
        setRawSheets(result.rawSheets)
        setIsValidating(true)
        try {
          const dishBySheet = new Map<string, ParsedDish[]>()
          for (const d of result.dishes) dishBySheet.set(d.category, [...(dishBySheet.get(d.category) ?? []), d])
          const sheets = result.rawSheets.map(s => ({
            name: s.name,
            rows: s.rows,
            dishes: dishBySheet.get(s.name) ?? [],
          }))
          const examples = getTTKExamples()
          const res = await fetch('/api/validate-ttk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheets, examples }),
          })
          if (res.ok) {
            const validated = await res.json() as { dishes: ParsedDish[]; corrections: string[] }
            if (validated.dishes.length > 0) {
              finalDishes = validated.dishes
              applyParsedResult(finalDishes, result.errors, validated.corrections ?? [])
              return
            }
          }
        } catch {
          // AI validation failed — keep heuristic result
        } finally {
          setIsValidating(false)
        }
      }

      applyParsedResult(finalDishes, result.errors, [])
    } catch (err) {
      setParseErrors([String(err)])
    } finally {
      setIsLoading(false)
      setIsValidating(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCategories, existingIngredients])

  const handleSheetsUrl = useCallback(async (url: string) => {
    resetParseState()
    setImportSource('sheets')
    setIsLoading(true)
    try {
      const examples = getTTKExamples()
      const res = await fetch('/api/parse-ttk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, examples }),
      })
      const json = await res.json()
      if (!res.ok) { setParseErrors([json?.error ?? `Ошибка ${res.status}`]); return }

      const { dishes: parsedDishes, errors: parseErrs, corrections } = json as {
        dishes: ParsedDish[]
        errors: string[]
        strategy: string
        usedAI: boolean
        corrections: string[]
      }

      if (parsedDishes.length === 0 && parseErrs.length === 0) {
        setParseErrors(['Не удалось распознать данные в таблице.'])
        return
      }

      applyParsedResult(parsedDishes, parseErrs ?? [], corrections ?? [])
    } catch {
      setParseErrors(['Не удалось загрузить таблицу. Проверьте ссылку и доступ.'])
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCategories, existingIngredients])

  const handlePdf = useCallback(async (file: File) => {
    resetParseState()
    setImportSource('pdf')
    setIsLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const fileData = btoa(binary)
      const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
      const examples = getTTKExamples()

      const res = await fetch('/api/parse-pdf-ttk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData, mimeType, examples }),
      })
      const json = await res.json()
      if (!res.ok) { setParseErrors([json?.error ?? `Ошибка ${res.status}`]); return }

      const { dishes: parsedDishes, corrections } = json as { dishes: ParsedDish[]; corrections: string[] }
      if (parsedDishes.length === 0) {
        setParseErrors(['AI не смог распознать блюда в этом документе. Попробуйте другой файл.'])
        return
      }

      applyParsedResult(parsedDishes, [], corrections ?? [])
    } catch {
      setParseErrors(['Не удалось обработать файл. Проверьте формат.'])
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCategories, existingIngredients])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleImport = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 0))

    const { categories, preparations, newIngredients } = buildImportedCategories(
      dishes, existingIngredients, existingCategories, resolutions, 'venue', ingredientDecisions,
    )

    const overwriteCategoryIds = Array.from(resolutions.entries())
      .filter(([, v]) => v === 'overwrite')
      .map(([k]) => existingCategories.find(c => c.name === k.split('::')[0])?.id)
      .filter((id): id is string => !!id)

    await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories, ingredients: [...preparations, ...newIngredients], overwriteCategoryIds }),
    })

    if (importSource === 'file' && rawSheets.length > 0) {
      for (const sheet of rawSheets) {
        const sheetDishes = dishes.filter(d =>
          d.category === sheet.name || d.category === (sheet.name.trim() || 'Основное'),
        )
        if (sheetDishes.length > 0) saveTTKExample(sheet.name, sheet.rows, sheetDishes)
      }
    } else if (importSource === 'pdf' && dishes.length > 0) {
      const byCategory = new Map<string, typeof dishes>()
      for (const d of dishes) { const arr = byCategory.get(d.category) ?? []; arr.push(d); byCategory.set(d.category, arr) }
      for (const [cat, catDishes] of byCategory) saveTTKExample(cat, null, catDishes)
    }

    const dishCount = dishes.filter(d => d.kind === 'dish' && resolutions.get(dishKey(d)) !== 'skip').length
    const prepCount = dishes.filter(d => d.kind === 'preparation').length

    setSavedDishCount(dishCount)
    setSavedPrepCount(prepCount)
    setSavedNewIngCount(newIngredients.length)
    setCountdown(UNDO_SECONDS)
    setStep('success')
    setIsSaving(false)
  }

  const handleSelectToggle = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }, [])

  const handleSelectAll = useCallback((visibleIds: string[]) => {
    setSelectedIds(prev => prev.size === visibleIds.length ? new Set() : new Set(visibleIds))
  }, [])

  const handleDeleteSelected = useCallback(() => {
    const remaining = dishes.filter(d => !selectedIds.has(d.id))
    setDishes(remaining)
    const remainingKeys = new Set(remaining.map(d => dishKey(d)))
    setConflicts(prev => new Set([...prev].filter(k => remainingKeys.has(k))))
    setResolutions(prev => {
      const next = new Map(prev)
      for (const k of prev.keys()) { if (!remainingKeys.has(k)) next.delete(k) }
      return next
    })
    setSelectedIds(new Set())
    setConfirmDelete(false)
  }, [dishes, selectedIds])

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'nutrimenu-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // Derived counts
  const dishImportCount = dishes.filter(d => d.kind === 'dish' && resolutions.get(dishKey(d)) !== 'skip').length
  const prepCount = dishes.filter(d => d.kind === 'preparation').length
  const importCount = dishImportCount + prepCount
  const undecidedCount = matches.filter(m => !ingredientDecisions.has(m.normalizedKey)).length

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

  return {
    // data
    step, importLimit, dishes, conflicts, resolutions, matches,
    ingredientDecisions, selectedIds, confirmDelete, aiCorrections,
    isDragging, isLoading, isSaving, isValidating, parseErrors,
    savedDishCount, savedPrepCount, savedNewIngCount, countdown,
    fileInputRef,
    // derived
    dishImportCount, prepCount, importCount, undecidedCount, headerSubtitle,
    // handlers
    setStep, setIsDragging, setIngredientDecisions, setResolutions, setConfirmDelete, setSelectedIds,
    handleFile, handleSheetsUrl, handlePdf, handleDrop, handleImport,
    handleSelectToggle, handleSelectAll, handleDeleteSelected,
    handleSuccessClose, handleUndo, downloadTemplate,
  }
}
