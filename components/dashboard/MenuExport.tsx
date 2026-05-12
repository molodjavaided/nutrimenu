'use client'

import { useState } from 'react'
import { Category, MenuItem, Venue, SizeOption } from '@/types'
import { getAllergenById } from '@/lib/allergens'

async function fetchData(): Promise<{ venue: Venue | null; categories: Category[] }> {
  const [vRes, cRes] = await Promise.all([
    fetch('/api/venue'),
    fetch('/api/categories'),
  ])
  const venue = vRes.ok ? await vRes.json() : null
  const categories = cRes.ok ? await cRes.json() : []
  return { venue, categories }
}

function allergenLabels(item: MenuItem): string {
  return (item.allergens ?? [])
    .map(id => getAllergenById(id)?.label)
    .filter(Boolean)
    .join(', ')
}

// Развернуть блюдо в строки: одна строка для каждого размера, либо одна для базового
function itemRows(item: MenuItem): { sizeLabel: string; weight: string; price: string | number; calories: number; protein: number; fat: number; carbs: number }[] {
  if (item.sizes && item.sizes.length > 0) {
    return item.sizes.map((s: SizeOption, idx: number) => ({
      sizeLabel: s.name || `Размер ${idx + 1}`,
      weight: `${s.weight} ${s.weightUnit}`,
      price: s.price ?? '',
      calories: s.calories,
      protein: s.protein,
      fat: s.fat,
      carbs: s.carbs,
    }))
  }
  return [{
    sizeLabel: '',
    weight: `${item.weight} ${item.weightUnit}`,
    price: item.price ?? '',
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
  }]
}

export function MenuExport() {
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)
  const [error, setError] = useState('')

  async function downloadXlsx() {
    setExporting('xlsx')
    setError('')
    try {
      const { utils, writeFile } = await import('xlsx')
      const { venue, categories } = await fetchData()

      const rows: (string | number)[][] = [
        ['Категория', 'Блюдо', 'Описание', 'Размер', 'Вес/Объём', 'Цена ₽', 'Ккал', 'Белки', 'Жиры', 'Углеводы', 'Аллергены'],
      ]

      for (const cat of categories) {
        for (const item of cat.items ?? []) {
          for (const r of itemRows(item)) {
            rows.push([
              cat.name,
              item.name,
              item.description ?? '',
              r.sizeLabel,
              r.weight,
              r.price,
              r.calories,
              r.protein,
              r.fat,
              r.carbs,
              allergenLabels(item),
            ])
          }
        }
      }

      const ws = utils.aoa_to_sheet(rows)
      ws['!cols'] = [20, 28, 40, 14, 12, 9, 8, 8, 8, 8, 22].map(w => ({ wch: w }))
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Меню')

      const filename = `menu-${venue?.slug ?? 'export'}.xlsx`
      writeFile(wb, filename)
    } catch (e) {
      console.error(e)
      setError('Не удалось создать файл')
    } finally {
      setExporting(null)
    }
  }

  async function printPdf() {
    setExporting('pdf')
    setError('')
    try {
      const { venue, categories } = await fetchData()

      const sections = categories.map(cat => {
        const itemsHtml = (cat.items ?? []).map(item => {
          const rs = itemRows(item)
          const allergens = allergenLabels(item)
          if (rs.length === 1) {
            const r = rs[0]
            return `
              <tr>
                <td><strong>${item.name}</strong>${item.description ? `<br/><span class="desc">${item.description}</span>` : ''}${allergens ? `<br/><span class="allergens">⚠️ ${allergens}</span>` : ''}</td>
                <td>${r.weight}</td>
                <td>${r.price ? r.price + ' ₽' : '—'}</td>
                <td>${r.calories}</td>
                <td>${r.protein}</td>
                <td>${r.fat}</td>
                <td>${r.carbs}</td>
              </tr>`
          }
          // Несколько размеров — заголовок + строки на размеры
          return `
            <tr class="dish-header"><td colspan="7"><strong>${item.name}</strong>${item.description ? `<br/><span class="desc">${item.description}</span>` : ''}${allergens ? `<br/><span class="allergens">⚠️ ${allergens}</span>` : ''}</td></tr>
            ${rs.map(r => `
              <tr class="size-row">
                <td>↳ ${r.sizeLabel} <span class="muted">(${r.weight})</span></td>
                <td>—</td>
                <td>${r.price ? r.price + ' ₽' : '—'}</td>
                <td>${r.calories}</td>
                <td>${r.protein}</td>
                <td>${r.fat}</td>
                <td>${r.carbs}</td>
              </tr>`).join('')}`
        }).join('')

        return `
          <section>
            <h2>${cat.name}</h2>
            <table>
              <thead>
                <tr>
                  <th>Блюдо</th><th>Вес</th><th>Цена</th>
                  <th>Ккал</th><th>Б</th><th>Ж</th><th>У</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </section>`
      }).join('')

      const locationLine = [venue?.city, venue?.country].filter(Boolean).join(', ')
      const addressLine = venue?.address ?? ''

      const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<title>Меню — ${venue?.name ?? ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #1a1a2e; padding: 20mm; }
  h1 { font-size: 22px; margin-bottom: 4px; color: #2C2950; }
  h2 { font-size: 14px; margin: 16px 0 6px; color: #2C2950; padding-bottom: 4px; border-bottom: 1px solid #2C2950; }
  .meta { color: #666; font-size: 10px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th { background: #2C2950; color: #FEFEF2; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 600; }
  th:nth-child(n+4) { text-align: center; }
  td { padding: 5px 8px; border-bottom: 0.5px solid #e5e0f5; vertical-align: top; }
  td:nth-child(n+4) { text-align: center; }
  tr:nth-child(even) td { background: #faf9ff; }
  tr.dish-header td { background: #EAE7F8 !important; }
  tr.size-row td { background: transparent !important; font-size: 10.5px; padding-left: 16px; }
  .desc { color: #666; font-size: 9.5px; font-weight: normal; }
  .allergens { color: #B91C1C; font-size: 9.5px; }
  .muted { color: #999; }
  footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e0f5; color: #888; font-size: 9.5px; text-align: center; }
  @media print {
    body { padding: 10mm 12mm; }
    section { page-break-inside: avoid; }
    @page { margin: 0; size: A4; }
  }
</style>
</head>
<body>
<h1>${venue?.name ?? 'Меню'}</h1>
${locationLine ? `<p class="meta">${locationLine}</p>` : ''}
${addressLine ? `<p class="meta">${addressLine}</p>` : ''}
${sections}
<footer>Создано в Plate · plate.menu</footer>
</body>
</html>`

      const win = window.open('', '_blank')
      if (!win) { setError('Разрешите всплывающие окна'); return }
      win.document.write(html)
      win.document.close()
      // Print after content loads (mobile/Chrome)
      const doPrint = () => { try { win.focus(); win.print() } catch {} }
      if (win.document.readyState === 'complete') doPrint()
      else win.addEventListener('load', doPrint, { once: true })
    } catch (e) {
      console.error(e)
      setError('Не удалось создать PDF')
    } finally {
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
        Экспортируйте меню с КБЖУ, размерами и аллергенами в файл для печати или архива.
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
      {error && <p className="text-xs mt-2" style={{ color: '#DC2626' }}>{error}</p>}
    </div>
  )
}
