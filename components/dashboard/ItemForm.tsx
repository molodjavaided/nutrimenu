'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ALLERGENS } from '@/lib/allergens'
import { FormField, FormInput, FormSelect, FormTextarea, NutriFields } from '@/components/ui/form-fields'
import { RemoveButton } from '@/components/ui/RemoveButton'
import IngredientPickerModal from './IngredientPickerModal'
import { MAX_SIZES, useItemFormState } from './item-form/useItemFormState'

// Keep cn imported in case future tweaks need it — single-line silencer.
void cn

export default function ItemForm({ itemId, categoryId: initialCategoryId }: { itemId?: string; categoryId?: string }) {
  const router = useRouter()
  const s = useItemFormState({ itemId, initialCategoryId })

  const {
    categories, libraries, ingredientRefs,
    setIngredientRefs, setLibraries,
    categoryId, setCategoryId, name, setName, price, setPrice,
    isAvailable, setIsAvailable, description, setDescription,
    photo, setPhoto, photoPosition, setPhotoPosition,
    photoUploading, setPhotoUploading, photoError, setPhotoError,
    allergens, setAllergens,
    addingCategory, setAddingCategory, newCategoryName, setNewCategoryName, handleCreateCategory,
    mode, setMode,
    quickWeight, setQuickWeight, quickWeightUnit, setQuickWeightUnit,
    quickCalories, setQuickCalories, quickProtein, setQuickProtein,
    quickFat, setQuickFat, quickCarbs, setQuickCarbs,
    ingredients, hasMultipleSizes, setHasMultipleSizes,
    sizes, setSizes, amounts, manualNutri,
    addIngredient, removeIngredient,
    addSize, updateSizeName, updateSizeUnit, updateSizePrice, applySizePreset, removeSize,
    updateAmount, updateManualNutri,
    calculateNutriForSize, getAmountFromComposition,
    variantGroups,
    addVariantGroup, updateVariantGroup, removeVariantGroup,
    addVariantOption, updateVariantOption, removeVariantOption,
    addonGroups, setAddonGroups,
    addAddonGroup, updateAddonGroup, removeAddonGroup,
    addAddonToGroup, updateAddon, removeAddon,
    pickerOpen, setPickerOpen,
    variantPickerTarget, setVariantPickerTarget,
    addonPickerTarget, setAddonPickerTarget,
    handleSave, isEdit,
  } = s

  return (
    <div className="px-4 py-6 md:p-8 max-w-5xl mx-auto">
      <button onClick={() => router.back()} className="mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        ← Назад
      </button>

      <h1 className="text-xl font-medium mb-6" style={{ color: 'var(--color-text-primary)' }}>
        {isEdit ? 'Редактировать блюдо' : 'Новое блюдо'}
      </h1>

      {/* ─── Переключатель режима ─── */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: '#EAE7F8' }}>
        {(['quick', 'detailed'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={mode === m
              ? { background: 'var(--color-text-primary)', color: '#FEFEF2' }
              : { color: 'var(--color-text-secondary)' }
            }
          >
            {m === 'quick' ? 'Быстро' : 'С составом'}
          </button>
        ))}
      </div>

      {/* ==================== ШАГ 1 ==================== */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--color-text-primary)' }}>Основное</h2>

        {/* Категория */}
        <FormField label="Категория" required>
          {addingCategory ? (
            <div className="flex gap-2">
              <FormInput
                autoFocus
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateCategory()
                  if (e.key === 'Escape') setAddingCategory(false)
                }}
                placeholder="Название категории"
                className="flex-1"
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                className="px-3 h-10 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-text-primary)', color: '#FEFEF2' }}
              >
                Создать
              </button>
              <button
                type="button"
                onClick={() => setAddingCategory(false)}
                className="px-3 h-10 rounded-xl text-sm"
                style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
              >
                Отмена
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <FormSelect value={categoryId} onChange={e => setCategoryId(e.target.value)} className="flex-1">
                {categories.length === 0 && <option value="">— нет категорий —</option>}
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </FormSelect>
              <button
                type="button"
                onClick={() => setAddingCategory(true)}
                className="px-3 h-10 rounded-xl text-sm whitespace-nowrap"
                style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)', border: '0.5px dashed rgba(176,166,223,0.6)' }}
              >
                + Новая
              </button>
            </div>
          )}
        </FormField>

        {/* Название */}
        <FormField label="Название" required>
          <FormInput
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Например: Боул"
            className="w-full"
          />
        </FormField>

        {/* Цена */}
        <FormField label="Цена (необязательно)">
          <div className="relative">
            <FormInput
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              className="w-full pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>₽</span>
          </div>
        </FormField>

        {/* Описание */}
        <FormField label="Описание (необязательно)">
          <FormTextarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Состав, особенности приготовления..."
          />
        </FormField>

        {/* Аллергены */}
        <FormField label="Аллергены (необязательно)">
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map(a => {
              const active = allergens.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAllergens(prev =>
                    prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id]
                  )}
                  className="px-2.5 py-1 rounded-full text-xs transition-all active:scale-95"
                  style={active
                    ? { background: '#EF4444', color: '#fff', fontWeight: 500 }
                    : { background: '#EAE7F8', color: 'var(--color-text-secondary)', border: '0.5px solid rgba(176,166,223,0.4)' }
                  }
                >
                  {a.emoji} {a.label}
                </button>
              )
            })}
          </div>
        </FormField>

        {/* Доступность */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Показывать гостям</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Скрытые блюда не видны на публичном меню</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailable(v => !v)}
            className="w-11 h-6 rounded-full transition-colors relative shrink-0"
            style={{ background: isAvailable ? '#8B5CF6' : '#E2E8F0' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: isAvailable ? 'translateX(18px)' : 'translateX(0px)' }}
            />
          </button>
        </div>

        {/* Фото */}
        <FormField label="Фото блюда (необязательно)">
          <div className="flex items-center gap-3">
            {photo ? (
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt="Фото блюда"
                  className="w-20 h-20 rounded-xl object-cover"
                  style={{ border: '0.5px solid rgba(255,255,255,0.5)' }}
                  onError={() => {
                    console.error('Photo failed to load:', photo)
                    setPhotoError('Не удалось загрузить картинку')
                  }}
                />
                <button
                  onClick={() => setPhoto('')}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ background: 'var(--color-text-muted)', color: '#fff' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                style={{ background: 'rgba(255,255,255,0.4)', border: '0.5px dashed rgba(176,166,223,0.6)' }}
              >
                🍽️
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label
                className="cursor-pointer flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all"
                style={{ background: '#EAE7F8', color: 'var(--color-text-primary)', opacity: photoUploading ? 0.6 : 1 }}
              >
                {photoUploading ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Загружаем...
                  </>
                ) : photo ? 'Заменить фото' : 'Загрузить фото'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={photoUploading}
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setPhotoUploading(true)
                    setPhotoError('')
                    try {
                      const form = new FormData()
                      form.append('file', file)
                      const res = await fetch('/api/upload', { method: 'POST', body: form })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok && data.url) {
                        setPhoto(data.url)
                      } else {
                        console.error('Upload failed:', res.status, data)
                        setPhotoError(data.error ?? `Ошибка загрузки (${res.status})`)
                      }
                    } catch (err) {
                      console.error('Upload error:', err)
                      setPhotoError('Нет соединения')
                    } finally {
                      setPhotoUploading(false)
                      e.target.value = ''
                    }
                  }}
                />
              </label>
              {photoError && (
                <p className="text-xs" style={{ color: '#DC2626' }}>{photoError}</p>
              )}
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>JPG, PNG, WebP · до 5 МБ</p>
            </div>
          </div>
          {photo && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>Позиция фото:</span>
              <div className="flex gap-1">
                {(['top', 'center', 'bottom'] as const).map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPhotoPosition(pos)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={photoPosition === pos
                      ? { background: '#2C2950', color: '#fff' }
                      : { background: 'rgba(44,41,80,0.1)', color: 'var(--color-text-primary)' }
                    }
                  >
                    {pos === 'top' ? 'Верх' : pos === 'center' ? 'Центр' : 'Низ'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </FormField>

        {/* ─── Быстрый режим: вес + КБЖУ вручную ─── */}
        {mode === 'quick' && (
          <>
            <FormField label="Вес порции">
              <div className="flex gap-2">
                <FormInput
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={quickWeight || ''}
                  onChange={e => setQuickWeight(Number(e.target.value))}
                  placeholder="0"
                  className="flex-1"
                />
                <FormSelect
                  value={quickWeightUnit}
                  onChange={e => setQuickWeightUnit(e.target.value as 'г' | 'мл')}
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
                  { label: 'Калории', value: quickCalories, set: setQuickCalories },
                  { label: 'Белки', value: quickProtein, set: setQuickProtein },
                  { label: 'Жиры', value: quickFat, set: setQuickFat },
                  { label: 'Углеводы', value: quickCarbs, set: setQuickCarbs },
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

        {/* Состав */}
        {mode === 'detailed' && <FormField label="Состав" required>
          <div className="space-y-2">
            {ingredients.map(ing => (
              <div key={ing.id} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-2 rounded-xl text-sm" style={{ background: '#EAE7F8', color: 'var(--color-text-primary)' }}>
                  {ing.name}
                </span>
                <RemoveButton onClick={() => removeIngredient(ing.id)} />
              </div>
            ))}

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full h-10 px-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-secondary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Выбрать из справочника
            </button>
          </div>
        </FormField>}

        {/* Размер порции */}
        {mode === 'detailed' && <>
        <FormField label="Размер порции" required>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!hasMultipleSizes}
                onChange={() => {
                  setHasMultipleSizes(false)
                  setSizes([{ id: 'default', name: '', unit: 'г' }])
                }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Один размер</span>
            </label>

            {!hasMultipleSizes && (
              <div className="ml-6 flex gap-2">
                <FormInput
                  value={sizes[0]?.name || ''}
                  onChange={e => updateSizeName(sizes[0]?.id || 'default', e.target.value)}
                  placeholder="Название (необязательно, например: Стандартный)"
                  className="flex-1"
                />
                <FormSelect
                  value={sizes[0]?.unit || 'г'}
                  onChange={e => updateSizeUnit(sizes[0]?.id || 'default', e.target.value as 'г' | 'мл')}
                  className="w-24"
                >
                  <option value="г">граммы (г)</option>
                  <option value="мл">миллилитры (мл)</option>
                </FormSelect>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={hasMultipleSizes}
                onChange={() => {
                  setHasMultipleSizes(true)
                  if (sizes.length === 1 && sizes[0].id === 'default') {
                    setSizes([
                      { id: crypto.randomUUID(), name: '', unit: 'г' },
                      { id: crypto.randomUUID(), name: '', unit: 'г' }
                    ])
                  }
                }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Несколько размеров</span>
            </label>

            {hasMultipleSizes && (
              <div className="ml-6">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs self-center" style={{ color: 'var(--color-text-muted)' }}>Шаблоны:</span>
                  {[
                    { label: 'S / M / L', preset: [{ name: 'S', unit: 'мл' as const }, { name: 'M', unit: 'мл' as const }, { name: 'L', unit: 'мл' as const }] },
                    { label: 'Маленькая / Средняя / Большая', preset: [{ name: 'Маленькая', unit: 'г' as const }, { name: 'Средняя', unit: 'г' as const }, { name: 'Большая', unit: 'г' as const }] },
                    { label: '200 / 300 / 400 мл', preset: [{ name: '200 мл', unit: 'мл' as const }, { name: '300 мл', unit: 'мл' as const }, { name: '400 мл', unit: 'мл' as const }] },
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applySizePreset(p.preset)}
                      className="text-xs px-2.5 py-1 rounded-full transition-all active:scale-95"
                      style={{ color: '#534AB7', background: '#EAE7F8' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2 mb-3">
                  {sizes.map((size, idx) => (
                    <div key={size.id} className="flex items-center gap-1 flex-wrap">
                      <FormInput
                        value={size.name}
                        onChange={e => updateSizeName(size.id, e.target.value)}
                        placeholder={idx === 0 ? "Маленькая" : idx === 1 ? "Средняя" : "Большая"}
                        className="w-32 h-11 px-2 rounded-lg"
                      />
                      <FormSelect
                        value={size.unit}
                        onChange={e => updateSizeUnit(size.id, e.target.value as 'г' | 'мл')}
                        className="w-20 h-11 px-2 rounded-lg"
                      >
                        <option value="г">г</option>
                        <option value="мл">мл</option>
                      </FormSelect>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={size.price ?? ''}
                          onChange={e => updateSizePrice(size.id, e.target.value === '' ? undefined : Number(e.target.value))}
                          placeholder="Цена"
                          className="w-24 h-11 px-2 rounded-lg text-sm outline-none"
                          style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                        />
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>₽</span>
                      </div>
                      {sizes.length > 1 && (
                        <RemoveButton size="sm" onClick={() => removeSize(size.id)} />
                      )}
                    </div>
                  ))}
                  {sizes.length < MAX_SIZES && (
                    <button
                      type="button"
                      onClick={addSize}
                      className="text-sm px-3 py-1.5 rounded-lg self-start"
                      style={{ color: '#B0A6DF', background: '#EAE7F8' }}
                    >
                      + Добавить размер ({sizes.length}/{MAX_SIZES})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </FormField>

        {/* Таблица ингредиентов × размеров */}
        {ingredients.length > 0 && sizes.length > 0 && (
          <div className="mb-5">
            {/* Mobile: стек по размерам */}
            <div className="md:hidden space-y-3">
              {sizes.map((size, sizeIdx) => {
                const sizeNutri = calculateNutriForSize(size.id)
                let sizeWeight = 0
                for (const ingredient of ingredients) {
                  const cell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
                  if (!cell?.amount) continue
                  if (ingredient.unit === 'шт') {
                    const ref = ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
                    sizeWeight += ref?.weightPerUnit ? cell.amount * ref.weightPerUnit : cell.amount
                  } else {
                    sizeWeight += cell.amount
                  }
                }
                return (
                <div key={size.id} className="rounded-xl overflow-hidden" style={{ border: '0.5px solid rgba(176,166,223,0.3)' }}>
                  <div className="px-3 py-2 text-xs font-medium" style={{ background: '#EAE7F8', color: '#534AB7' }}>
                    {size.name || (hasMultipleSizes ? `Размер ${sizeIdx + 1}` : 'Порция')} ({size.unit})
                  </div>
                  <div className="divide-y" style={{ borderColor: 'rgba(176,166,223,0.15)' }}>
                    {ingredients.map(ingredient => {
                      const unit = ingredient.unit
                      const isCount = unit === 'шт'
                      const amount = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)?.amount || 0
                      return (
                        <div key={ingredient.id} className="flex items-center justify-between px-3 py-2 gap-3" style={{ borderColor: 'rgba(176,166,223,0.15)' }}>
                          <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {ingredient.name}
                            <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>({unit})</span>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              inputMode={isCount ? 'numeric' : 'decimal'}
                              step={isCount ? 1 : 0.1}
                              min={0}
                              value={amount || ''}
                              onChange={e => updateAmount(ingredient.id, size.id, isCount ? parseInt(e.target.value, 10) || 0 : Number(e.target.value))}
                              placeholder={isCount ? 'шт' : '0'}
                              className="w-20 h-11 px-2 rounded-lg text-sm outline-none text-center"
                              style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
                            />
                            <span className="text-xs w-4" style={{ color: 'var(--color-text-muted)' }}>{unit}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="px-3 py-2 text-xs flex flex-wrap gap-x-3 gap-y-0.5" style={{ background: 'rgba(234,231,248,0.5)', color: '#534AB7' }}>
                    <span>Σ <b>{Math.round(sizeWeight)}</b> {size.unit}</span>
                    <span><b>{Math.round(sizeNutri.calories)}</b> ккал</span>
                    <span>Б {sizeNutri.protein.toFixed(1)}</span>
                    <span>Ж {sizeNutri.fat.toFixed(1)}</span>
                    <span>У {sizeNutri.carbs.toFixed(1)}</span>
                  </div>
                </div>
                )
              })}
            </div>

            {/* Desktop: таблица */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Ингредиент</th>
                    {sizes.map((size, idx) => (
                      <th key={size.id} className="text-center py-2 px-2 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        {size.name || (hasMultipleSizes ? `Размер ${idx + 1}` : 'Порция')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map(ingredient => {
                    const unit = ingredient.unit
                    const isCount = unit === 'шт'
                    return (
                      <tr key={ingredient.id}>
                        <td className="py-2 px-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {ingredient.name}
                          <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>({unit})</span>
                        </td>
                        {sizes.map(size => {
                          const amount = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)?.amount || 0
                          return (
                            <td key={size.id} className="py-1 px-2">
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="number"
                                  inputMode={isCount ? 'numeric' : 'decimal'}
                                  step={isCount ? 1 : 0.1}
                                  min={0}
                                  value={amount || ''}
                                  onChange={e => updateAmount(ingredient.id, size.id, isCount ? parseInt(e.target.value, 10) || 0 : Number(e.target.value))}
                                  placeholder={isCount ? 'шт' : '0'}
                                  className="w-20 h-11 px-2 rounded-lg text-sm outline-none text-center"
                                  style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)', color: 'var(--color-text-primary)' }}
                                />
                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{unit}</span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1px solid rgba(176,166,223,0.3)' }}>
                    <td className="py-2 px-3 text-xs font-medium" style={{ color: '#534AB7' }}>Σ итого</td>
                    {sizes.map(size => {
                      const n = calculateNutriForSize(size.id)
                      let w = 0
                      for (const ingredient of ingredients) {
                        const cell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
                        if (!cell?.amount) continue
                        if (ingredient.unit === 'шт') {
                          const ref = ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
                          w += ref?.weightPerUnit ? cell.amount * ref.weightPerUnit : cell.amount
                        } else {
                          w += cell.amount
                        }
                      }
                      return (
                        <td key={size.id} className="py-2 px-2 text-center text-xs" style={{ color: '#534AB7' }}>
                          <div><b>{Math.round(w)}</b> {size.unit} · <b>{Math.round(n.calories)}</b> ккал</div>
                          <div style={{ color: 'var(--color-text-muted)' }}>Б {n.protein.toFixed(1)} · Ж {n.fat.toFixed(1)} · У {n.carbs.toFixed(1)}</div>
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Итоговое КБЖУ */}
        {sizes.length > 0 && ingredients.length > 0 && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: '#EAE7F8' }}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>Итоговое КБЖУ (на порцию)</p>
            <div className="space-y-3">
              {sizes.map(size => {
                const nutri = calculateNutriForSize(size.id)
                const isManual = manualNutri[size.id]?.isManual

                let totalWeight = 0
                for (const ingredient of ingredients) {
                  const amountCell = amounts.find(a => a.ingredientId === ingredient.id && a.sizeId === size.id)
                  if (amountCell?.amount) {
                    if (ingredient.unit === 'шт') {
                      const ref = ingredientRefs.find(r => r.id === ingredient.ingredientRefId)
                      totalWeight += ref?.weightPerUnit
                        ? amountCell.amount * ref.weightPerUnit
                        : amountCell.amount
                    } else {
                      totalWeight += amountCell.amount
                    }
                  }
                }

                return (
                  <div key={size.id} className="border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                      <div>
                        <span className="text-sm font-medium" style={{ color: '#534AB7' }}>
                          {size.name || (hasMultipleSizes ? 'Новый размер' : 'Порция')}
                        </span>
                        {totalWeight > 0 && (
                          <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
                            ({Math.round(totalWeight)} {size.unit})
                          </span>
                        )}
                      </div>
                      {isManual && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F2D965', color: '#635200' }}>
                          отредактировано
                        </span>
                      )}
                    </div>
                    <NutriFields
                      nutri={nutri}
                      onChange={(field, value) => updateManualNutri(size.id, field, value)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </>}
      </div>

      {/* ==================== ШАГ 2 ==================== */}
      {mode === 'detailed' && <>
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--color-text-primary)' }}>Выборы для гостя</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Гость сможет выбирать из этих вариантов (крупа, начинка, белок и т.д.)
        </p>

        {variantGroups.map(group => {
          const replacedIng = group.replacesIngredientRefId
            ? ingredients.find(i => i.ingredientRefId === group.replacesIngredientRefId)
            : null
          const replacedAmountsPerSize = replacedIng
            ? sizes.map(s => ({
                size: s,
                amount: getAmountFromComposition(group.replacesIngredientRefId!, s.id),
              }))
            : null

          return (
          <div key={group.id} className="mb-6 p-4 rounded-2xl" style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.4)' }}>
            <div className="flex gap-2 mb-3">
              <input
                value={group.label}
                onChange={e => updateVariantGroup(group.id, { label: e.target.value })}
                placeholder="Название группы (Крупа / Белок / Молоко)"
                className="flex-1 h-11 px-3 rounded-xl text-sm outline-none"
                style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
              />
              <label className="flex items-center gap-2 text-xs cursor-pointer shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={e => updateVariantGroup(group.id, { required: e.target.checked })}
                />
                Обязательный
              </label>
              <RemoveButton variant="light" onClick={() => removeVariantGroup(group.id)} />
            </div>

            {ingredients.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Заменяет:</span>
                <select
                  value={group.replacesIngredientRefId || ''}
                  onChange={e => updateVariantGroup(group.id, { replacesIngredientRefId: e.target.value || undefined })}
                  className="flex-1 h-11 px-3 rounded-xl text-sm outline-none"
                  style={{ background: '#FEFEF2', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">— не привязано (ручной ввод) —</option>
                  {ingredients.map(ing => {
                    const ref = ingredientRefs.find(r => r.id === ing.ingredientRefId)
                    return (
                      <option key={ing.ingredientRefId} value={ing.ingredientRefId}>
                        {ref?.name ?? ing.name}
                      </option>
                    )
                  })}
                </select>
                {replacedAmountsPerSize && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {replacedAmountsPerSize.map(({ size, amount }, idx) => (
                      <span key={size.id} className="px-2 py-0.5 rounded-lg text-xs"
                        style={{ background: '#D8D4F0', color: '#534AB7' }}>
                        {size.name || (sizes.length === 1 ? 'порция' : `Размер ${idx + 1}`)}: {amount} {size.unit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {group.options.map(opt => {
                const selectedRef = ingredientRefs.find(r => r.id === opt.ingredientRefId)
                const firstSizeAmount = replacedAmountsPerSize?.[0]?.amount ?? opt.weight
                const displayCalories = selectedRef && firstSizeAmount > 0
                  ? Math.round(selectedRef.caloriesPer100 * firstSizeAmount / 100)
                  : opt.calories

                return (
                  <div key={opt.id} className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: '#FEFEF2' }}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setVariantPickerTarget({ groupId: group.id, optionId: opt.id })}
                        className="flex-1 h-10 px-3 rounded-lg text-sm text-left truncate transition-colors"
                        style={{
                          background: '#EAE7F8',
                          border: '0.5px solid rgba(176,166,223,0.3)',
                          color: selectedRef ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        }}
                      >
                        {selectedRef ? selectedRef.name : '— Выбрать ингредиент'}
                      </button>
                      <RemoveButton size="sm" onClick={() => removeVariantOption(group.id, opt.id)} />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {replacedAmountsPerSize ? (
                        <>
                          {replacedAmountsPerSize.map(({ size, amount }, idx) => (
                            <span key={size.id} className="px-2 py-1 rounded-lg text-xs"
                              style={{ background: '#EAE7F8', color: '#534AB7' }}>
                              {size.name || (sizes.length === 1 ? 'порция' : `Размер ${idx + 1}`)}: {amount} {size.unit}
                            </span>
                          ))}
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>из состава</span>
                        </>
                      ) : (
                        <div className="flex">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={opt.weight || ''}
                            onChange={e => {
                              const newWeight = Number(e.target.value)
                              updateVariantOption(group.id, opt.id, { weight: newWeight })
                              if (selectedRef) {
                                const ratio = newWeight / 100
                                updateVariantOption(group.id, opt.id, {
                                  calories: Math.round(selectedRef.caloriesPer100 * ratio),
                                  protein: Math.round(selectedRef.proteinPer100 * ratio * 10) / 10,
                                  fat: Math.round(selectedRef.fatPer100 * ratio * 10) / 10,
                                  carbs: Math.round(selectedRef.carbsPer100 * ratio * 10) / 10,
                                })
                              }
                            }}
                            placeholder="100"
                            className="w-20 h-10 px-2 rounded-l-lg text-sm outline-none text-center"
                            style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                          />
                          <select
                            value={opt.weightUnit}
                            onChange={e => updateVariantOption(group.id, opt.id, { weightUnit: e.target.value as 'г' | 'мл' })}
                            className="w-16 h-10 px-1 rounded-r-lg text-sm outline-none"
                            style={{ background: '#D8D4F0', border: '0.5px solid rgba(176,166,223,0.3)', color: '#534AB7' }}
                          >
                            <option value="г">г</option>
                            <option value="мл">мл</option>
                          </select>
                        </div>
                      )}
                      {displayCalories > 0 && (
                        <span className="text-xs" style={{ color: '#534AB7' }}>{displayCalories} ккал</span>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={opt.price ?? ''}
                          onChange={e => updateVariantOption(group.id, opt.id, { price: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="0"
                          className="w-16 h-8 px-2 rounded-lg text-sm outline-none text-center"
                          style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                        />
                        <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>₽</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => addVariantOption(group.id)}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl w-full"
                style={{ color: '#B0A6DF', background: 'rgba(176,166,223,0.1)', border: '0.5px dashed rgba(176,166,223,0.6)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Добавить вариант
              </button>
            </div>
          </div>
        )
        })}

        <button
          onClick={addVariantGroup}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm w-full justify-center"
          style={{ border: '0.5px dashed rgba(176,166,223,0.6)', color: '#B0A6DF', background: '#EAE7F8' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          + Добавить группу вариантов
        </button>
      </div>
      </>}

      {/* ==================== ШАГ 3: Добавки для гостя ==================== */}
      {mode === 'detailed' && (
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Добавки для гостя</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Ингредиенты, которые гость может добавить к блюду (сахар, молоко, соус и т.д.)
        </p>

        {addonGroups.map(group => (
          <div key={group.id} className="mb-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(176,166,223,0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <FormInput
                value={group.label}
                onChange={e => updateAddonGroup(group.id, { label: e.target.value })}
                placeholder="Название группы (напр. Сахар)"
                className="flex-1"
              />
              <button
                onClick={() => removeAddonGroup(group.id)}
                className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
                style={{ background: '#EAE7F8', color: 'var(--color-text-muted)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={group.allowCustomGrams}
                onChange={e => updateAddonGroup(group.id, { allowCustomGrams: e.target.checked })}
                className="w-4 h-4 rounded accent-lavender"
              />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Гость вводит граммы вручную</span>
            </label>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
              {group.allowCustomGrams
                ? 'КБЖУ хранится на 100 г — гость укажет количество и КБЖУ пересчитается'
                : 'Гость выбирает добавку кнопкой — КБЖУ добавляется целой порцией (+100 г)'
              }
            </p>

            {group.addons.map(addon => {
              const ref = ingredientRefs.find(r => r.id === addon.ingredientRefId)
              return (
                <div key={addon.id} className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setAddonPickerTarget({ groupId: group.id, addonId: addon.id })}
                    className="flex-1 h-10 px-3 rounded-xl text-sm text-left truncate"
                    style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: ref ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                  >
                    {ref ? ref.name : '— Выбрать ингредиент'}
                  </button>
                  {ref && (
                    <span className="text-xs shrink-0" style={{ color: '#534AB7' }}>
                      {ref.caloriesPer100} ккал/100г
                    </span>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={addon.price ?? ''}
                      onChange={e => setAddonGroups(prev => prev.map(g =>
                        g.id === group.id
                          ? { ...g, addons: g.addons.map(a => a.id === addon.id ? { ...a, price: e.target.value ? Number(e.target.value) : undefined } : a) }
                          : g
                      ))}
                      placeholder="0"
                      className="w-14 h-10 px-2 rounded-xl text-sm outline-none text-center"
                      style={{ background: '#EAE7F8', border: '0.5px solid rgba(176,166,223,0.3)', color: 'var(--color-text-primary)' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>₽</span>
                  </div>
                  <button
                    onClick={() => removeAddon(group.id, addon.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
                    style={{ background: '#EAE7F8', color: 'var(--color-text-muted)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              )
            })}

            <button
              onClick={() => addAddonToGroup(group.id)}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl w-full mt-1"
              style={{ color: '#B0A6DF', background: 'rgba(176,166,223,0.1)', border: '0.5px dashed rgba(176,166,223,0.6)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Добавить ингредиент
            </button>
          </div>
        ))}

        <button
          onClick={addAddonGroup}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm w-full justify-center"
          style={{ border: '0.5px dashed rgba(176,166,223,0.6)', color: '#B0A6DF', background: '#EAE7F8' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          + Добавить группу добавок
        </button>
      </div>
      )}

      {/* Кнопки */}
      <div className="flex justify-between pt-4 border-t" style={{ borderColor: 'rgba(176,166,223,0.3)' }}>
        <button
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: '#EAE7F8', color: 'var(--color-text-secondary)' }}
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={!name || !categoryId || (mode === 'detailed' && ingredients.length === 0)}
          className="px-6 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: name && categoryId && (mode === 'quick' || ingredients.length > 0) ? '#B0A6DF' : '#EAE7F8',
            color: name && categoryId && (mode === 'quick' || ingredients.length > 0) ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          }}
        >
          {isEdit ? 'Сохранить' : 'Добавить блюдо'}
        </button>
      </div>

      {pickerOpen && libraries.length > 0 && (
        <IngredientPickerModal
          libraries={libraries}
          allRefs={ingredientRefs}
          alreadyAddedIds={ingredients.map(i => i.ingredientRefId)}
          onSelect={ref => addIngredient(ref.id)}
          onClose={() => setPickerOpen(false)}
          onIngredientCreated={ref => {
            setIngredientRefs(prev => [...prev, ref])
            setLibraries(prev => prev.map(l =>
              l.id === 'my-library' ? { ...l, ingredients: [...l.ingredients, ref] } : l
            ))
          }}
        />
      )}

      {addonPickerTarget && libraries.length > 0 && (
        <IngredientPickerModal
          libraries={libraries}
          allRefs={ingredientRefs}
          alreadyAddedIds={[]}
          onSelect={ref => {
            const { groupId, addonId } = addonPickerTarget
            updateAddon(groupId, addonId, { ingredientRefId: ref.id, label: ref.name })
            setAddonPickerTarget(null)
          }}
          onClose={() => setAddonPickerTarget(null)}
          onIngredientCreated={ref => {
            setIngredientRefs(prev => [...prev, ref])
            setLibraries(prev => prev.map(l =>
              l.id === 'my-library' ? { ...l, ingredients: [...l.ingredients, ref] } : l
            ))
          }}
        />
      )}

      {variantPickerTarget && libraries.length > 0 && (
        <IngredientPickerModal
          libraries={libraries}
          allRefs={ingredientRefs}
          alreadyAddedIds={[]}
          onSelect={ref => {
            const { groupId, optionId } = variantPickerTarget
            const group = variantGroups.find(g => g.id === groupId)
            const opt = group?.options.find(o => o.id === optionId)
            if (!group || !opt) return
            const amount = group.replacesIngredientRefId
              ? getAmountFromComposition(group.replacesIngredientRefId, sizes[0]?.id ?? '')
              : (opt.weight || 100)
            const rawUnit = group.replacesIngredientRefId ? (sizes[0]?.unit ?? 'г') : ref.unit
            const unit: 'г' | 'мл' = rawUnit === 'мл' ? 'мл' : 'г'
            const ratio = amount / 100
            updateVariantOption(groupId, optionId, {
              ingredientRefId: ref.id,
              label: ref.name,
              weight: amount,
              weightUnit: unit,
              calories: Math.round(ref.caloriesPer100 * ratio),
              protein: Math.round(ref.proteinPer100 * ratio * 10) / 10,
              fat: Math.round(ref.fatPer100 * ratio * 10) / 10,
              carbs: Math.round(ref.carbsPer100 * ratio * 10) / 10,
            })
            setVariantPickerTarget(null)
          }}
          onClose={() => setVariantPickerTarget(null)}
        />
      )}
    </div>
  )
}
