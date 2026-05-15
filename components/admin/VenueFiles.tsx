'use client'

import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, adminKeys, VenueFile } from '@/lib/admin-api'
import { FILE_CATEGORIES, FILE_CATEGORY_LABEL, FileCategory, MAX_FILE_SIZE, isAllowedMime } from '@/lib/venue-files'
import { Upload, Trash2, FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon, ExternalLink } from 'lucide-react'

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <ImageIcon size={16} />
  if (mime === 'application/pdf') return <FileText size={16} />
  if (mime.includes('spreadsheet') || mime.includes('excel')) return <FileSpreadsheet size={16} />
  return <FileIcon size={16} />
}

interface Props {
  venueId: string
}

export function VenueFiles({ venueId }: Props) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<FileCategory>('menu_source')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: files = [], isLoading } = useQuery({
    queryKey: adminKeys.files(venueId),
    queryFn: () => adminApi.fetchFiles(venueId),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, cat }: { file: File; cat: FileCategory }) =>
      adminApi.uploadFile(venueId, file, cat),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.files(venueId) }),
    onError: err => setError(err instanceof Error ? err.message : 'Ошибка загрузки'),
  })

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => adminApi.deleteFile(venueId, fileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.files(venueId) }),
  })

  function handleFiles(list: FileList | File[]) {
    setError(null)
    const arr = Array.from(list)
    for (const f of arr) {
      if (!isAllowedMime(f.type)) { setError(`${f.name}: тип ${f.type || 'неизвестен'} не разрешён`); continue }
      if (f.size > MAX_FILE_SIZE) { setError(`${f.name}: больше 10 MB`); continue }
      uploadMutation.mutate({ file: f, cat: category })
    }
  }

  const grouped = FILE_CATEGORIES.reduce<Record<string, VenueFile[]>>((acc, cat) => {
    acc[cat] = files.filter(f => f.category === cat)
    return acc
  }, {})

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: '#EAE7F8' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold" style={{ color: '#9D99B8' }}>ФАЙЛЫ ЗАВЕДЕНИЯ</p>
        <p className="text-xs" style={{ color: '#B0A6DF' }}>До 10 MB · PDF, DOC, XLS, JPG, PNG, WEBP</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs" style={{ color: '#6B6490' }}>Категория для загрузки:</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as FileCategory)}
          className="text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.7)', color: '#2C2950', border: '0.5px solid rgba(176,166,223,0.4)' }}
        >
          {FILE_CATEGORIES.map(c => <option key={c} value={c}>{FILE_CATEGORY_LABEL[c]}</option>)}
        </select>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className="rounded-xl p-6 text-center cursor-pointer transition-all"
        style={{
          background: dragOver ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.5)',
          border: `1.5px dashed ${dragOver ? '#7C3AED' : 'rgba(176,166,223,0.6)'}`,
        }}
      >
        <Upload size={20} className="mx-auto mb-2" style={{ color: '#7C3AED' }} />
        <p className="text-sm font-medium" style={{ color: '#2C2950' }}>
          {uploadMutation.isPending ? 'Загрузка…' : 'Перетащите файлы или нажмите'}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#9D99B8' }}>
          Будут загружены как «{FILE_CATEGORY_LABEL[category]}»
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-xs text-center py-4" style={{ color: '#9D99B8' }}>Загрузка списка…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: '#9D99B8' }}>Файлов пока нет</p>
      ) : (
        <div className="space-y-3">
          {FILE_CATEGORIES.map(cat => {
            const items = grouped[cat]
            if (!items || items.length === 0) return null
            return (
              <div key={cat}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#7a748f' }}>
                  {FILE_CATEGORY_LABEL[cat]} <span style={{ color: '#B0A6DF' }}>· {items.length}</span>
                </p>
                <div className="space-y-1.5">
                  {items.map(f => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.6)' }}
                    >
                      <span style={{ color: '#7C3AED' }}><FileTypeIcon mime={f.mimeType} /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#2C2950' }}>{f.filename}</p>
                        <p className="text-xs" style={{ color: '#9D99B8' }}>
                          {fmtSize(f.size)} · {f.uploaderRole === 'ADMIN' ? 'админ' : 'владелец'} · {new Date(f.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}
                        title="Открыть"
                      ><ExternalLink size={13} /></a>
                      <button
                        onClick={() => {
                          if (confirm(`Удалить «${f.filename}»?`)) deleteMutation.mutate(f.id)
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-lg transition-all disabled:opacity-50"
                        style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
                        title="Удалить"
                      ><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
