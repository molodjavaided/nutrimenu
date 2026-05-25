'use client'

import { ALLERGENS } from '@/lib/allergens'
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/ui/form-fields'
import { GlassButton, GlassDashedButton, NutriPill } from '@/components/ui-kit'
import type { ItemFormState } from './useItemFormState'

function ComputedNutriSummary({ s }: { s: ItemFormState }) {
  const hasIngredients = s.ingredients.length > 0
  const firstSize = s.sizes[0]
  const nutri = firstSize ? s.calculateNutriForSize(firstSize.id) : { calories: 0, protein: 0, fat: 0, carbs: 0 }
  const hasValues = nutri.calories > 0 || nutri.protein > 0 || nutri.fat > 0 || nutri.carbs > 0

  return (
    <div
      className="mb-6 p-3 rounded-xl flex items-center gap-3 flex-wrap"
      style={{ background: 'rgba(139,92,246,0.06)', border: '0.5px solid rgba(139,92,246,0.18)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
          КБЖУ блюда (из состава){s.hasMultipleSizes ? ' · первый размер' : ''}
        </p>
        {hasValues ? (
          <div className="flex items-center gap-2 flex-wrap">
            <NutriPill tone="calorie" size="sm" value={nutri.calories} unit=" ккал" />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {Math.round(nutri.protein * 10) / 10} б · {Math.round(nutri.fat * 10) / 10} ж · {Math.round(nutri.carbs * 10) / 10} у
            </span>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {hasIngredients ? 'Укажите граммы ингредиентов ниже' : 'Добавьте ингредиенты в состав ниже'}
          </p>
        )}
      </div>
      {s.hasMultipleSizes && hasValues && (
        <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          Все размеры ↓
        </span>
      )}
    </div>
  )
}

export default function BasicSection({ s }: { s: ItemFormState }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--color-text-primary)' }}>Основное</h2>

      <FormField label="Категория" required>
        {s.addingCategory ? (
          <div className="flex gap-2">
            <FormInput
              value={s.newCategoryName}
              onChange={e => s.setNewCategoryName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') s.handleCreateCategory()
                if (e.key === 'Escape') s.setAddingCategory(false)
              }}
              placeholder="Название категории"
              className="flex-1"
            />
            <GlassButton
              type="button"
              variant="primary"
              onClick={s.handleCreateCategory}
              style={{ background: 'var(--color-text-primary)', borderColor: 'rgba(44,41,80,0.6)' }}
            >
              Создать
            </GlassButton>
            <GlassButton type="button" variant="ghost" onClick={() => s.setAddingCategory(false)}>
              Отмена
            </GlassButton>
          </div>
        ) : (
          <div className="flex gap-2">
            <FormSelect value={s.categoryId} onChange={e => s.setCategoryId(e.target.value)} className="flex-1">
              {s.categories.length === 0 && <option value="">— нет категорий —</option>}
              {s.categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </FormSelect>
            <GlassDashedButton onClick={() => s.setAddingCategory(true)}>
              + Новая
            </GlassDashedButton>
          </div>
        )}
      </FormField>

      <FormField label="Название" required>
        <FormInput
          value={s.name}
          onChange={e => s.setName(e.target.value)}
          placeholder="Например: Боул"
          className="w-full"
        />
      </FormField>

      <FormField label="Цена (необязательно)">
        <div className="relative">
          <FormInput
            type="number"
            min="0"
            step="0.01"
            value={s.price}
            onChange={e => s.setPrice(e.target.value)}
            placeholder="0"
            className="w-full pr-10"
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ₽
          </span>
        </div>
      </FormField>

      <FormField label="Описание (необязательно)">
        <FormTextarea
          value={s.description}
          onChange={e => s.setDescription(e.target.value)}
          rows={3}
          placeholder="Состав, особенности приготовления..."
        />
      </FormField>

      <FormField label="Аллергены (необязательно)">
        <div className="flex flex-wrap gap-1.5">
          {ALLERGENS.map(a => {
            const active = s.allergens.includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => s.setAllergens(prev =>
                  prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id]
                )}
                className="transition-all active:scale-95"
                aria-pressed={active}
              >
                <NutriPill
                  tone={active ? 'danger' : 'neutral'}
                  size="sm"
                  style={active
                    ? { background: '#EF4444', color: '#fff', borderColor: 'rgba(239,68,68,0.6)', boxShadow: '0 2px 6px rgba(239,68,68,0.25)' }
                    : undefined
                  }
                >
                  {a.emoji} {a.label}
                </NutriPill>
              </button>
            )
          })}
        </div>
      </FormField>

      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Показывать гостям</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Скрытые блюда не видны на публичном меню</p>
        </div>
        <button
          type="button"
          onClick={() => s.setIsAvailable(v => !v)}
          className="w-11 h-6 rounded-full transition-colors relative shrink-0"
          style={{ background: s.isAvailable ? '#8B5CF6' : '#E2E8F0' }}
          aria-pressed={s.isAvailable}
          aria-label={s.isAvailable ? 'Скрыть от гостей' : 'Показать гостям'}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: s.isAvailable ? 'translateX(18px)' : 'translateX(0px)' }}
          />
        </button>
      </div>

      <FormField label="Фото блюда (необязательно)">
        <div className="flex items-center gap-3">
          {s.photo ? (
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.photo}
                alt="Фото блюда"
                className="w-20 h-20 rounded-xl object-cover"
                style={{ border: '0.5px solid rgba(255,255,255,0.5)' }}
                onError={() => {
                  console.error('Photo failed to load:', s.photo)
                  s.setPhotoError('Не удалось загрузить картинку')
                }}
              />
              <button
                onClick={() => s.setPhoto('')}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all active:scale-90"
                style={{ background: 'var(--color-text-muted)', color: '#fff' }}
                aria-label="Удалить фото"
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 text-2xl"
              style={{
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(6px)',
                border: '0.5px dashed rgba(139,92,246,0.40)',
              }}
            >
              🍽️
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label
              className="cursor-pointer inline-flex items-center justify-center gap-2 text-sm font-medium h-11 px-4 rounded-xl transition-all active:scale-[0.97]"
              style={{
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                color: 'var(--color-text-primary)',
                border: '0.5px solid rgba(139,92,246,0.30)',
                boxShadow: '0 2px 8px rgba(139,92,246,0.08)',
                opacity: s.photoUploading ? 0.6 : 1,
              }}
            >
              {s.photoUploading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Загружаем...
                </>
              ) : s.photo ? 'Заменить фото' : 'Загрузить фото'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={s.photoUploading}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  s.setPhotoUploading(true)
                  s.setPhotoError('')
                  try {
                    const form = new FormData()
                    form.append('file', file)
                    const res = await fetch('/api/upload', { method: 'POST', body: form })
                    const data = await res.json().catch(() => ({}))
                    if (res.ok && data.url) {
                      s.setPhoto(data.url)
                    } else {
                      console.error('Upload failed:', res.status, data)
                      s.setPhotoError(data.error ?? `Ошибка загрузки (${res.status})`)
                    }
                  } catch (err) {
                    console.error('Upload error:', err)
                    s.setPhotoError('Нет соединения')
                  } finally {
                    s.setPhotoUploading(false)
                    e.target.value = ''
                  }
                }}
              />
            </label>
            {s.photoError && (
              <p className="text-xs" style={{ color: '#DC2626' }}>{s.photoError}</p>
            )}
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>JPG, PNG, WebP · до 5 МБ</p>
          </div>
        </div>
        {s.photo && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>Позиция фото:</span>
            <div className="flex gap-1">
              {(['top', 'center', 'bottom'] as const).map(pos => {
                const active = s.photoPosition === pos
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => s.setPhotoPosition(pos)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.95]"
                    style={active
                      ? { background: 'var(--color-text-primary)', color: '#FEFEF2', boxShadow: '0 2px 6px rgba(44,41,80,0.2)' }
                      : { background: 'rgba(139,92,246,0.08)', color: 'var(--color-text-secondary)', border: '0.5px solid rgba(139,92,246,0.18)' }
                    }
                  >
                    {pos === 'top' ? 'Верх' : pos === 'center' ? 'Центр' : 'Низ'}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </FormField>

      {s.mode !== 'quick' && <ComputedNutriSummary s={s} />}

      {s.mode === 'quick' && (
        <>
          <FormField label="Вес порции">
            <div className="flex gap-2">
              <FormInput
                type="number"
                inputMode="decimal"
                min={0}
                value={s.quickWeight || ''}
                onChange={e => s.setQuickWeight(Number(e.target.value))}
                placeholder="0"
                className="flex-1"
              />
              <FormSelect
                value={s.quickWeightUnit}
                onChange={e => s.setQuickWeightUnit(e.target.value as 'г' | 'мл')}
                className="w-24"
              >
                <option value="г">г</option>
                <option value="мл">мл</option>
              </FormSelect>
            </div>
          </FormField>

          <FormField label="КБЖУ на порцию" required>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Калории', value: s.quickCalories, set: s.setQuickCalories },
                { label: 'Белки', value: s.quickProtein, set: s.setQuickProtein },
                { label: 'Жиры', value: s.quickFat, set: s.setQuickFat },
                { label: 'Углеводы', value: s.quickCarbs, set: s.setQuickCarbs },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
                  <FormInput
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.1}
                    value={value || ''}
                    onChange={e => set(Number(e.target.value))}
                    placeholder="0"
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </FormField>
        </>
      )}
    </div>
  )
}
