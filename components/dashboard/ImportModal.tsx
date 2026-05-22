'use client'

import { X, ChevronRight, Trash2 } from 'lucide-react'
import TestBadge from '@/components/ui/TestBadge'
import { useImportFlow } from './import/useImportFlow'
import PaywallStep from './import/PaywallStep'
import UploadStep from './import/UploadStep'
import PreviewStep from './import/PreviewStep'
import MatchingStep from './import/MatchingStep'
import SuccessStep from './import/SuccessStep'
import { buildButtonLabel } from './import/utils'

interface Props {
  onClose: () => void
  onImported: (count: number) => void
}

export default function ImportModal({ onClose, onImported }: Props) {
  const flow = useImportFlow(onClose, onImported)
  const {
    step, importLimit, dishes, conflicts, resolutions, matches,
    ingredientDecisions, selectedIds, confirmDelete, aiCorrections,
    isDragging, isLoading, isSaving, isValidating, parseErrors,
    savedDishCount, savedPrepCount, savedNewIngCount, countdown,
    fileInputRef, dishImportCount, prepCount, importCount, undecidedCount, headerSubtitle,
    setStep, setIsDragging, setIngredientDecisions, setResolutions, setConfirmDelete, setSelectedIds,
    handleFile, handleSheetsUrl, handlePdf, handleDrop, handleImport,
    handleSelectToggle, handleSelectAll, handleDeleteSelected,
    handleSuccessClose, handleUndo, downloadTemplate,
  } = flow

  const UNDO_SECONDS = 30

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
              <h2 className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Импорт меню
                <TestBadge />
              </h2>
              {importLimit && importLimit.remaining !== Infinity && step === 'upload' && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: importLimit.remaining === 0 ? 'rgba(192,57,43,0.1)' : 'rgba(42,157,92,0.1)',
                    color: importLimit.remaining === 0 ? '#C0392B' : '#2A9D5C',
                    border: `0.5px solid ${importLimit.remaining === 0 ? 'rgba(192,57,43,0.3)' : 'rgba(42,157,92,0.3)'}`,
                  }}
                >
                  {importLimit.remaining === 0 ? 'Лимит исчерпан' : `${importLimit.remaining} из ${importLimit.limit} бесплатных`}
                </span>
              )}
              {(step === 'preview' || step === 'matching') && (
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="px-2 py-0.5 rounded-full"
                    style={{
                      background: step === 'preview' ? 'rgba(176,166,223,0.25)' : 'transparent',
                      color: step === 'preview' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    }}>
                    Просмотр
                  </span>
                  {matches.length > 0 && (
                    <>
                      <ChevronRight size={11} />
                      <span className="px-2 py-0.5 rounded-full"
                        style={{
                          background: step === 'matching' ? 'rgba(176,166,223,0.25)' : 'transparent',
                          color: step === 'matching' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        }}>
                        Сопоставление
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{headerSubtitle}</p>
          </div>
          <button
            onClick={step === 'success' ? handleSuccessClose : onClose}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
          >
            <X size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {importLimit && !importLimit.canImport && step === 'upload' ? (
            <PaywallStep
              emailVerified={importLimit.emailVerified}
              remaining={importLimit.remaining}
              limit={importLimit.limit}
              onClose={onClose}
            />
          ) : step === 'upload' ? (
            <UploadStep
              isDragging={isDragging}
              isLoading={isLoading}
              isValidating={isValidating}
              parseErrors={parseErrors}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onFileSelect={handleFile}
              onSheetsUrl={handleSheetsUrl}
              onPdfFile={handlePdf}
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
              onDecide={(key, choice) => setIngredientDecisions(prev => new Map(prev).set(key, choice))}
            />
          ) : (
            <PreviewStep
              dishes={dishes}
              conflicts={conflicts}
              resolutions={resolutions}
              selectedIds={selectedIds}
              aiCorrections={aiCorrections}
              onToggle={(key, val) => setResolutions(prev => new Map(prev).set(key, val))}
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
                  <button onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-70"
                    style={{ background: 'rgba(176,166,223,0.2)', color: 'var(--color-text-secondary)' }}>
                    Отмена
                  </button>
                  <button onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(192,57,43,0.12)', color: '#C0392B', border: '0.5px solid rgba(192,57,43,0.3)' }}>
                    <Trash2 size={12} />
                    Да, удалить
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Выбрано: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedIds.size}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedIds(new Set())}
                    className="text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    Сбросить
                  </button>
                  <button onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: 'rgba(176,166,223,0.2)', color: 'var(--color-text-primary)', border: '0.5px solid rgba(176,166,223,0.4)' }}>
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
              onClick={() => { setStep('upload'); setSelectedIds(new Set()); setConfirmDelete(false) }}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
            >
              Назад
            </button>
            {matches.length > 0 ? (
              <button onClick={() => setStep('matching')} disabled={importCount === 0}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
                style={{ background: '#B0A6DF', color: 'var(--color-text-primary)' }}>
                Сопоставление ингредиентов
                <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleImport} disabled={importCount === 0 || isSaving}
                className="px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
                style={{ background: '#B0A6DF', color: 'var(--color-text-primary)' }}>
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
            <button onClick={() => setStep('preview')}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}>
              Назад
            </button>
            <div className="flex items-center gap-3">
              {undecidedCount > 0 && (
                <span className="text-xs" style={{ color: '#D4830A' }}>Не указано: {undecidedCount}</span>
              )}
              <button onClick={handleImport} disabled={undecidedCount > 0 || isSaving}
                className="px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
                style={{ background: '#B0A6DF', color: 'var(--color-text-primary)' }}>
                {isSaving ? 'Сохранение…' : buildButtonLabel(dishImportCount, prepCount)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
