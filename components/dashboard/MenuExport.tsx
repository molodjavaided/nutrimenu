'use client'

import { useState } from 'react'
import { getCategories, getVenue } from '@/lib/store'

export function MenuExport() {
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)

  async function downloadXlsx() {
    setExporting('xlsx')
    try {
      const { utils, writeFile } = await import('xlsx')
      const venue = getVenue()
      const categories = getCategories()

      const rows: (string | number)[][] = [
        ['Категория', 'Блюдо', 'Описание', 'Вес', 'Цена', 'Ккал', 'Белки', 'Жиры', 'Углеводы', 'Аллергены'],
      ]

      for (const cat of categories) {
        for (const item of cat.items ?? []) {
          rows.push([
            cat.name,
            item.name,
            item.description ?? '',
            `${item.weight} ${item.weightUnit}`,
            item.price ?? '',
            item.calories,
            item.protein,
            item.fat,
            item.carbs,
            (item.allergens ?? []).join(', '),
          ])
        }
      }

      const ws = utils.aoa_to_sheet(rows)
      // Column widths
      ws['!cols'] = [20, 28, 40, 10, 8, 8, 8, 8, 8, 20].map(w => ({ wch: w }))
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Меню')

      const filename = `menu-${venue?.slug ?? 'export'}.xlsx`
      writeFile(wb, filename)
    } finally {
      setExporting(null)
    }
  }

  function printPdf() {
    setExporting('pdf')
    const venue = getVenue()
    const categories = getCategories()

    const rows = categories.flatMap(cat =>
      (cat.items ?? []).map(item => `
        <tr>
          <td>${cat.name}</td>
          <td><strong>${item.name}</strong>${item.description ? `<br/><span class="desc">${item.description}</span>` : ''}</td>
          <td>${item.weight} ${item.weightUnit}</td>
          <td>${item.price ? item.price + ' ₽' : '—'}</td>
          <td>${item.calories}</td>
          <td>${item.protein}</td>
          <td>${item.fat}</td>
          <td>${item.carbs}</td>
        </tr>
      `)
    ).join('')

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<title>Меню — ${venue?.name ?? ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; font-size: 11px; color: #1a1a2e; padding: 20mm; }
  h1 { font-size: 20px; margin-bottom: 4px; color: #2C2950; }
  .meta { color: #666; font-size: 10px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2C2950; color: #FEFEF2; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 0.5px solid #e5e0f5; vertical-align: top; }
  tr:nth-child(even) td { background: #faf9ff; }
  .desc { color: #666; font-size: 9.5px; }
  @media print {
    body { padding: 10mm 15mm; }
    @page { margin: 0; size: A4; }
  }
</style>
</head>
<body>
<h1>${venue?.name ?? 'Меню'}</h1>
${venue?.address ? `<p class="meta">${venue.address}</p>` : ''}
<table>
  <thead>
    <tr>
      <th>Категория</th><th>Блюдо</th><th>Вес</th><th>Цена</th>
      <th>Ккал</th><th>Белки</th><th>Жиры</th><th>Углеводы</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<p class="meta" style="margin-top:12px">Создано в Plate · plate.menu</p>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) { setExporting(null); return }
    win.document.write(html)
    win.document.close()
    win.onload = () => {
      win.print()
      setExporting(null)
    }
  }

  return (
    <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid rgba(176,166,223,0.3)' }}>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Скачать меню</h2>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(176,166,223,0.25)', color: '#7a748f' }}
        >
          Бета
        </span>
      </div>
      <p className="text-xs mb-4" style={{ color: '#7a748f' }}>
        Экспортируйте меню с КБЖУ в файл для печати или архива.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={printPdf}
          disabled={exporting !== null}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'var(--color-text-primary)', color: '#FEFEF2' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="1" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4 12h6M4 9.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M2 8v4h10V8" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
          {exporting === 'pdf' ? 'Открываем…' : 'PDF / Печать'}
        </button>

        <button
          type="button"
          onClick={downloadXlsx}
          disabled={exporting !== null}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#EAE7F8', color: 'var(--color-text-primary)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2h6l4 4v7H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M8 2v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M4.5 7.5l1.5 2 1.5-2M9.5 7.5l-1.5 2-1.5-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {exporting === 'xlsx' ? 'Создаём…' : 'Excel (XLSX)'}
        </button>
      </div>
    </div>
  )
}
