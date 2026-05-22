'use client'

import { useState, useRef } from 'react'
import { Upload, Download, Info, FileSpreadsheet, Link, FileText } from 'lucide-react'

interface Props {
  isDragging: boolean
  isLoading: boolean
  isValidating: boolean
  parseErrors: string[]
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onFileSelect: (f: File) => void
  onSheetsUrl: (url: string) => void
  onPdfFile: (f: File) => void
  onDownloadTemplate: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

export default function UploadStep({
  isDragging, isLoading, isValidating, parseErrors,
  onDrop, onDragOver, onDragLeave, onFileSelect, onSheetsUrl, onPdfFile,
  onDownloadTemplate, fileInputRef,
}: Props) {
  const [tab, setTab] = useState<'file' | 'sheets' | 'pdf'>('file')
  const [sheetsInput, setSheetsInput] = useState('')
  const pdfInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="p-6 space-y-5">
      {/* Tabs */}
      <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(176,166,223,0.15)' }}>
        {([
          ['file',   <Upload size={13} key="u" />,   'XLSX / CSV'],
          ['sheets', <Link size={13} key="l" />,     'Google Таблица'],
          ['pdf',    <FileText size={13} key="p" />, 'PDF / Фото'],
        ] as const).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
            style={tab === id
              ? { background: '#fff', color: 'var(--color-text-primary)', boxShadow: '0 1px 4px rgba(44,41,80,0.1)' }
              : { color: 'var(--color-text-secondary)' }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {tab === 'pdf' ? (
        <div className="space-y-4">
          <div
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onPdfFile(f) }}
            onDragOver={e => e.preventDefault()}
            onClick={() => pdfInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all py-12 px-6 text-center select-none"
            style={{ border: '2px dashed rgba(176,166,223,0.5)', background: 'rgba(234,231,248,0.4)' }}
          >
            {isLoading ? (
              <>
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {isValidating ? 'AI проверяет данные…' : 'AI читает документ…'}
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(176,166,223,0.2)' }}>
                  <FileText size={24} style={{ color: '#B0A6DF' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Перетащите PDF или фото сюда
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    или нажмите чтобы выбрать · PDF, JPG, PNG, WebP
                  </p>
                </div>
              </>
            )}
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onPdfFile(f); e.target.value = '' }}
            />
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(234,231,248,0.6)', border: '0.5px solid rgba(176,166,223,0.3)' }}>
            <div className="flex items-start gap-3">
              <Info size={14} className="mt-0.5 shrink-0" style={{ color: '#B0A6DF' }} />
              <div className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Как работает AI-распознавание</p>
                <p>Gemini читает документ визуально и извлекает блюда с ингредиентами.</p>
                <p>Чем больше ТТК вы импортируете — тем точнее становится распознавание:</p>
                <p style={{ color: '#2A9D5C' }}>каждый подтверждённый импорт сохраняется как пример для AI.</p>
              </div>
            </div>
          </div>
        </div>

      ) : tab === 'file' ? (
        <>
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
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {isValidating ? 'AI проверяет данные…' : 'Обрабатываем файл…'}
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(176,166,223,0.2)' }}>
                  <Upload size={24} style={{ color: '#B0A6DF' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Перетащите файл сюда
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
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
              onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = '' }}
            />
          </div>

          <div className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(234,231,248,0.6)', border: '0.5px solid rgba(176,166,223,0.3)' }}>
            <div className="flex items-start gap-3">
              <FileSpreadsheet size={16} className="mt-0.5 shrink-0" style={{ color: '#B0A6DF' }} />
              <div className="space-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Формат файла</p>
                <p>Каждая строка — один ингредиент одного блюда. Нужные колонки:</p>
                <code className="block rounded-lg px-3 py-2 text-xs mt-1 font-mono leading-relaxed"
                  style={{ background: 'rgba(176,166,223,0.15)', color: 'var(--color-text-primary)' }}>
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
              style={{ color: 'var(--color-text-primary)' }}
            >
              <Download size={13} />
              Скачать шаблон CSV
            </button>
          </div>
        </>

      ) : (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(234,231,248,0.6)', border: '0.5px solid rgba(176,166,223,0.3)' }}>
            <div className="flex items-start gap-3">
              <Info size={15} className="mt-0.5 shrink-0" style={{ color: '#B0A6DF' }} />
              <div className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Как подготовить Google Таблицу</p>
                <p>1. Откройте таблицу в Google Таблицах</p>
                <p>2. Файл → Поделиться → <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Все, у кого есть ссылка</span></p>
                <p>3. Вставьте ссылку ниже</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="url"
              value={sheetsInput}
              onChange={e => setSheetsInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'rgba(234,231,248,0.6)',
                border: '0.5px solid rgba(176,166,223,0.5)',
                color: 'var(--color-text-primary)',
              }}
              onKeyDown={e => { if (e.key === 'Enter' && sheetsInput.trim()) onSheetsUrl(sheetsInput.trim()) }}
            />
            <button
              onClick={() => { if (sheetsInput.trim()) onSheetsUrl(sheetsInput.trim()) }}
              disabled={!sheetsInput.trim() || isLoading}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
              style={{ background: '#B0A6DF', color: 'var(--color-text-primary)' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin inline-block"
                    style={{ borderColor: 'var(--color-text-primary)', borderTopColor: 'transparent' }} />
                  Загружаем…
                </span>
              ) : 'Загрузить таблицу'}
            </button>
          </div>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="rounded-xl px-4 py-3 space-y-1"
          style={{ background: 'rgba(255,100,80,0.08)', border: '0.5px solid rgba(255,100,80,0.2)' }}>
          {parseErrors.map((e, i) => (
            <p key={i} className="text-xs" style={{ color: '#C0392B' }}>{e}</p>
          ))}
        </div>
      )}
    </div>
  )
}
