'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ALLERGENS } from '@/lib/allergens'
import DishCard from '@/components/menu/DishCard'
import DishSheet from '@/components/menu/DishSheet'
import { MenuItem } from '@/types'

const DEMO_SLUG = 'demo-nutrimenu'

interface Form {
  name: string
  description: string
  price: string
  weight: string
  weightUnit: 'г' | 'мл'
  calories: string
  protein: string
  fat: string
  carbs: string
  allergens: string[]
}

const EMPTY: Form = {
  name: '',
  description: '',
  price: '',
  weight: '',
  weightUnit: 'г',
  calories: '',
  protein: '',
  fat: '',
  carbs: '',
  allergens: [],
}

export default function DemoPage() {
  const router = useRouter()
  const [form, setForm] = useState<Form>(EMPTY)
  const [tab, setTab] = useState<'form' | 'preview'>('form')
  const [sheetOpen, setSheetOpen] = useState(false)

  function field(key: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function toggleAllergen(id: string) {
    setForm(prev => ({
      ...prev,
      allergens: prev.allergens.includes(id)
        ? prev.allergens.filter(a => a !== id)
        : [...prev.allergens, id],
    }))
  }

  function handleSave() {
    const item = {
      id: 'demo-dish-1',
      name: form.name.trim() || 'Моё блюдо',
      description: form.description.trim() || undefined,
      price: form.price ? parseFloat(form.price) : undefined,
      weight: parseFloat(form.weight) || 0,
      weightUnit: form.weightUnit,
      calories: parseFloat(form.calories) || 0,
      protein: parseFloat(form.protein) || 0,
      fat: parseFloat(form.fat) || 0,
      carbs: parseFloat(form.carbs) || 0,
      allergens: form.allergens.length > 0 ? form.allergens : undefined,
      isAvailable: true,
      categoryId: 'demo-cat',
      venueId: 'demo',
      composition: [],
      sizes: [],
    }

    localStorage.setItem('nutrimenu_venue', JSON.stringify({
      id: 'demo', name: 'Демо меню', slug: DEMO_SLUG, status: 'APPROVED',
    }))
    localStorage.setItem('nutrimenu_categories', JSON.stringify([{
      id: 'demo-cat', name: 'Блюда', venueId: 'demo', order: 0, items: [item],
    }]))

    router.push('/demo/preview')
  }

  const isEmpty = !form.name && !form.calories
  const previewItem: MenuItem = {
    id: 'demo-preview',
    name: form.name.trim() || 'Название блюда',
    description: form.description.trim() || undefined,
    price: form.price ? parseFloat(form.price) : undefined,
    weight: parseFloat(form.weight) || 0,
    weightUnit: form.weightUnit,
    calories: Math.round(parseFloat(form.calories) || 0),
    protein: Math.round(parseFloat(form.protein) || 0),
    fat: Math.round(parseFloat(form.fat) || 0),
    carbs: Math.round(parseFloat(form.carbs) || 0),
    allergens: form.allergens.length > 0 ? form.allergens : undefined,
    isAvailable: true,
    categoryId: 'demo-cat',
    venueId: 'demo',
  }

  return (
    <>
      <style>{`
        .demo-input {
          width: 100%;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(176,166,223,0.35);
          border-radius: 10px;
          padding: 10px 13px;
          font-size: 15px;
          color: #2C2950;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }
        .demo-input:focus {
          border-color: #8B5CF6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
        }
        .demo-input::placeholder { color: #B0A6DF; }
        .allergen-chip {
          padding: 5px 11px;
          border-radius: 999px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid rgba(176,166,223,0.35);
          background: rgba(255,255,255,0.6);
          color: #6B6490;
          user-select: none;
        }
        .allergen-chip.active {
          background: #EF4444;
          border-color: #EF4444;
          color: #fff;
          font-weight: 500;
        }
        .save-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          background: #8B5CF6;
          color: #fff;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(139,92,246,0.3);
        }
        .save-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(139,92,246,0.4);
        }
        .save-btn:active { transform: scale(0.98); }
        .tab-btn {
          flex: 1; padding: 9px; font-size: 14px; font-weight: 500;
          border-radius: 10px; border: none; cursor: pointer; transition: all 0.15s;
        }
        .tab-btn.active { background: #fff; color: #2C2950; box-shadow: 0 2px 8px rgba(44,41,80,0.1); }
        .tab-btn.inactive { background: transparent; color: #9D99B8; }
        @keyframes fade-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .preview-card { animation: fade-in 0.25s ease; }
      `}</style>

      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'linear-gradient(160deg, #EDE9FE 0%, #FEFEF2 55%, #E8F4F0 100%)' }}
      >
        {/* ── Nav ── */}
        <nav className="flex items-center gap-3 px-5 py-4 max-w-6xl mx-auto w-full">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: '#9D99B8' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Plate
          </Link>
          <span style={{ color: '#D8D4F0' }}>/</span>
          <span className="text-sm font-medium" style={{ color: '#2C2950' }}>Попробовать</span>
        </nav>

        {/* ── Mobile tab switcher ── */}
        <div className="lg:hidden px-5 mb-4">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(176,166,223,0.2)' }}>
            <button className={`tab-btn ${tab === 'form' ? 'active' : 'inactive'}`} onClick={() => setTab('form')}>
              ✏️ Форма
            </button>
            <button className={`tab-btn ${tab === 'preview' ? 'active' : 'inactive'}`} onClick={() => setTab('preview')}>
              👀 Превью
            </button>
          </div>
        </div>

        {/* ── Main split ── */}
        <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-6xl mx-auto w-full px-5 pb-8">

          {/* ── LEFT: Form ── */}
          <div
            className={`${tab === 'preview' ? 'hidden' : 'flex'} lg:flex flex-col lg:w-[480px] shrink-0`}
          >
            <div
              className="flex-1 rounded-2xl p-6 flex flex-col gap-5"
              style={{
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 8px 32px rgba(44,41,80,0.08)',
              }}
            >
              <div>
                <h1 className="text-xl font-bold mb-0.5" style={{ color: '#2C2950' }}>
                  Создайте своё блюдо
                </h1>
                <p className="text-sm" style={{ color: '#9D99B8' }}>
                  Заполните поля — превью обновляется в реальном времени
                </p>
              </div>

              {/* Demo notice */}
              <div
                className="flex gap-2.5 rounded-xl p-3"
                style={{ background: 'rgba(139,92,246,0.07)', border: '0.5px solid rgba(139,92,246,0.2)' }}
              >
                <span className="text-base shrink-0">🧪</span>
                <p className="text-xs leading-relaxed" style={{ color: '#6B6490' }}>
                  Это тестовый режим. После{' '}
                  <a href="/auth/register" style={{ color: '#7C3AED', fontWeight: 600 }}>регистрации заведения</a>
                  {' '}— фото блюд, состав по ингредиентам, варианты размеров, аллергены из базы и QR-код для гостей.
                </p>
              </div>

              {/* Название */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#9D99B8' }}>
                  Название блюда *
                </label>
                <input
                  className="demo-input"
                  placeholder="Например: Паста Карбонара"
                  value={form.name}
                  onChange={field('name')}
                />
              </div>

              {/* Описание */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#9D99B8' }}>
                  Описание
                </label>
                <textarea
                  className="demo-input"
                  style={{ resize: 'none', minHeight: 72 }}
                  placeholder="Что входит в состав, особенности..."
                  value={form.description}
                  onChange={field('description')}
                  rows={3}
                />
              </div>

              {/* Цена + Вес */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#9D99B8' }}>Цена, ₽</label>
                  <input className="demo-input" type="number" inputMode="decimal" placeholder="490" value={form.price} onChange={field('price')} min={0} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#9D99B8' }}>Вес</label>
                  <div className="flex gap-1.5">
                    <input className="demo-input" type="number" inputMode="decimal" placeholder="300" value={form.weight} onChange={field('weight')} min={0} style={{ flex: 1 }} />
                    <select className="demo-input" value={form.weightUnit} onChange={field('weightUnit')} style={{ width: 60, padding: '10px 6px' }}>
                      <option value="г">г</option>
                      <option value="мл">мл</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* КБЖУ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#9D99B8' }}>КБЖУ на порцию</label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { key: 'calories', label: 'Ккал' },
                    { key: 'protein',  label: 'Белки' },
                    { key: 'fat',      label: 'Жиры' },
                    { key: 'carbs',    label: 'Углев.' },
                  ] as { key: keyof Form; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <span className="text-xs text-center" style={{ color: '#B0A6DF' }}>{label}</span>
                      <input
                        className="demo-input"
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={form[key] as string}
                        onChange={field(key)}
                        min={0}
                        style={{ textAlign: 'center', padding: '8px 6px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Аллергены */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#9D99B8' }}>Аллергены</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALLERGENS.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAllergen(a.id)}
                      className={`allergen-chip ${form.allergens.includes(a.id) ? 'active' : ''}`}
                    >
                      {a.emoji} {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button className="save-btn mt-auto" onClick={handleSave}>
                Посмотреть в меню
                <span className="ml-2">→</span>
              </button>
            </div>
          </div>

          {/* ── RIGHT: Preview card ── */}
          <div
            className={`${tab === 'form' ? 'hidden' : 'flex'} lg:flex lg:w-[400px] shrink-0 flex-col lg:sticky lg:top-6 pt-2 lg:pt-0 lg:pl-6`}
          >
            <div
              className="flex-1 rounded-2xl p-6 flex flex-col gap-5"
              style={{
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 8px 32px rgba(44,41,80,0.08)',
              }}
            >
              <div>
                <h2 className="text-xl font-bold mb-0.5" style={{ color: '#2C2950' }}>Так видят гости</h2>
                <p className="text-sm" style={{ color: '#9D99B8' }}>Обновляется в реальном времени</p>
              </div>

              {/* Dish card preview — same component guests see */}
              <div className="preview-card">
                <DishCard
                  item={previewItem}
                  quantity={0}
                  onOpen={() => setSheetOpen(true)}
                  onAdd={() => setSheetOpen(true)}
                  onRemove={() => {}}
                />
              </div>

              {/* Empty hint */}
              {isEmpty && (
                <p className="text-sm text-center" style={{ color: '#D8D4F0' }}>
                  Начните заполнять форму слева →
                </p>
              )}

              {/* Spacer + tip */}
              <div className="mt-auto pt-4" style={{ borderTop: '0.5px solid rgba(176,166,223,0.25)' }}>
                <p className="text-xs" style={{ color: '#B0A6DF' }}>
                  После нажатия «Посмотреть в меню» откроется полноценная гостевая страница — с вкладками категорий, поиском и трекером рациона.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* DishSheet — открывается при клике на превью */}
        <DishSheet
          item={sheetOpen ? previewItem : null}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onAdd={() => setSheetOpen(false)}
        />
      </div>
    </>
  )
}
