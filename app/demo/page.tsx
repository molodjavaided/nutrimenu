'use client'

import { useEffect, useState } from 'react'
import ItemForm from '@/components/dashboard/ItemForm'
import { DEMO_CATEGORIES, DEMO_INGREDIENTS } from '@/lib/demo-data'
import type { MenuItem } from '@/types'

const DEMO_SLUG = 'demo-nutrimenu'
const STORAGE_ITEMS = 'nutrimenu_demo_items'
const STORAGE_CATS = 'nutrimenu_categories'
const STORAGE_VENUE = 'nutrimenu_venue'
const STORAGE_INGS = 'nutrimenu_demo_ings'

function loadCats(): typeof DEMO_CATEGORIES {
  try {
    const raw = localStorage.getItem('nutrimenu_demo_cats')
    if (raw) return JSON.parse(raw)
  } catch {}
  return [...DEMO_CATEGORIES]
}

function saveCats(cats: typeof DEMO_CATEGORIES) {
  try { localStorage.setItem('nutrimenu_demo_cats', JSON.stringify(cats)) } catch {}
}

function loadIngs(): typeof DEMO_INGREDIENTS {
  try {
    const raw = localStorage.getItem(STORAGE_INGS)
    if (raw) return JSON.parse(raw)
  } catch {}
  return [...DEMO_INGREDIENTS]
}

function saveIngs(ings: typeof DEMO_INGREDIENTS) {
  try { localStorage.setItem(STORAGE_INGS, JSON.stringify(ings)) } catch {}
}

export default function DemoPage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Локальное состояние демо-данных
    const cats = loadCats()
    const ings = loadIngs()
    const origFetch = window.fetch.bind(window)

    function jsonResponse(body: unknown, status = 200) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    }

    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      const method = (init?.method ?? (typeof input === 'string' ? 'GET' : (input as Request).method)).toUpperCase()

      // /api/categories
      if (url.endsWith('/api/categories')) {
        if (method === 'GET') return jsonResponse(cats)
        if (method === 'POST') {
          const body = JSON.parse(init?.body as string)
          const cat = { id: `demo-cat-${Date.now()}`, name: body.name, icon: '🍽️', sortOrder: cats.length }
          cats.push(cat); saveCats(cats)
          return jsonResponse(cat)
        }
      }

      // /api/ingredients
      if (url.endsWith('/api/ingredients')) {
        if (method === 'GET') return jsonResponse(ings)
        if (method === 'POST') {
          const body = JSON.parse(init?.body as string)
          const ing = { ...body, id: body.id ?? `demo-ing-${Date.now()}`, isSystem: false }
          ings.push(ing); saveIngs(ings)
          return jsonResponse(ing)
        }
      }

      // /api/items — приём блюда, сохраняем в localStorage в формате categories[]
      if (url.endsWith('/api/items') && method === 'POST') {
        const item: MenuItem = JSON.parse(init?.body as string)
        const saved: MenuItem[] = (() => {
          try { return JSON.parse(localStorage.getItem(STORAGE_ITEMS) ?? '[]') } catch { return [] }
        })()
        saved.push(item)
        localStorage.setItem(STORAGE_ITEMS, JSON.stringify(saved))

        // Собираем структуру для /demo/preview
        const categoriesForPreview = cats.map(c => ({
          id: c.id, name: c.name, venueId: 'demo', order: c.sortOrder,
          items: saved.filter(i => i.categoryId === c.id),
        })).filter(c => c.items.length > 0)
        localStorage.setItem(STORAGE_CATS, JSON.stringify(categoriesForPreview))
        localStorage.setItem(STORAGE_VENUE, JSON.stringify({
          id: 'demo', name: 'Демо меню', slug: DEMO_SLUG, status: 'APPROVED',
        }))

        return jsonResponse({ ...item, id: item.id ?? `demo-item-${Date.now()}` })
      }

      // /api/user/onboarding — глушим, чтобы тур не запускался
      if (url.endsWith('/api/user/onboarding')) {
        return jsonResponse({ step: 0, isCompleted: true, isDismissed: true })
      }

      // /api/upload — фото в демо отключено
      if (url.endsWith('/api/upload')) {
        return jsonResponse({ error: 'Фото доступно после регистрации' }, 501)
      }

      // AI-эндпоинты (штрихкод, AI-импорт TTK) — заглушки
      if (url.match(/\/api\/(barcode|ai|gemini|ttk-import|ingredients-ai)/)) {
        return jsonResponse({ error: 'AI-функции доступны после регистрации' }, 501)
      }

      return origFetch(input, init)
    }

    setReady(true)
    return () => { window.fetch = origFetch }
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FEFEF2' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#B0A6DF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div style={{ background: 'linear-gradient(160deg, #EDE9FE 0%, #FEFEF2 55%, #E8F4F0 100%)', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div
          className="rounded-2xl p-4 mb-4 text-sm"
          style={{
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: '#5B4FBF',
          }}
        >
          <div className="font-semibold mb-1">🧪 Демо-режим</div>
          <div style={{ color: '#6B6490' }}>
            Попробуйте режим <strong>«По сложному проценту»</strong> — добавьте курицу с жаркой,
            масло с впитыванием, рис с уваркой и увидите расчёт КБЖУ и фуд-кост.
            Данные сохраняются в браузере, ничего никуда не уходит.
          </div>
        </div>
      </div>
      <ItemForm demoMode redirectAfterSave="/demo/preview" />
    </div>
  )
}
