import { NextRequest, NextResponse } from 'next/server'

const SHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const match = url.match(SHEET_ID_RE)
  if (!match) return NextResponse.json({ error: 'Неверная ссылка на Google Таблицу' }, { status: 400 })

  const id = match[1]
  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`

  let res: Response
  try {
    res = await fetch(exportUrl, { headers: { 'User-Agent': 'NutriMenu/1.0' } })
  } catch {
    return NextResponse.json({ error: 'Не удалось подключиться к Google' }, { status: 502 })
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { error: 'Таблица закрыта. Откройте доступ: Файл → Поделиться → Все, у кого есть ссылка.' },
        { status: 403 },
      )
    }
    return NextResponse.json({ error: `Google вернул ошибку ${res.status}` }, { status: res.status })
  }

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="sheet-${id}.xlsx"`,
    },
  })
}
