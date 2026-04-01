import { Category, IngredientRef, MenuItem, Venue } from '@/types'

const VENUE_KEY = 'nutrimenu_venue'
const CATEGORIES_KEY = 'nutrimenu_categories'

// ─── Venue ───────────────────────────────────────────────────

export function getVenue(): Venue | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(VENUE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveVenue(venue: Venue): void {
  localStorage.setItem(VENUE_KEY, JSON.stringify(venue))
}

// ─── Categories ──────────────────────────────────────────────

export function getCategories(): Category[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(CATEGORIES_KEY)
  return raw ? JSON.parse(raw) : []
}

export function saveCategories(categories: Category[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
}

export function addCategory(name: string): Category {
  const cats = getCategories()
  const newCat: Category = {
    id: crypto.randomUUID(),
    name,
    venueId: '1',
    order: cats.length,
    items: [],
  }
  saveCategories([...cats, newCat])
  return newCat
}

export function updateCategory(id: string, name: string): void {
  const cats = getCategories()
  saveCategories(cats.map(c => c.id === id ? { ...c, name } : c))
}

export function deleteCategory(id: string): void {
  const cats = getCategories()
  saveCategories(cats.filter(c => c.id !== id))
}

export function reorderCategories(ordered: Category[]): void {
  saveCategories(ordered.map((c, i) => ({ ...c, order: i })))
}

// ─── Items ───────────────────────────────────────────────────

export function addItem(categoryId: string, item: MenuItem): void {
  const cats = getCategories()
  saveCategories(cats.map(c =>
    c.id === categoryId
      ? { ...c, items: [...(c.items ?? []), item] }
      : c
  ))
}

export function updateItem(categoryId: string, item: MenuItem): void {
  const cats = getCategories()
  saveCategories(cats.map(c =>
    c.id === categoryId
      ? { ...c, items: (c.items ?? []).map(i => i.id === item.id ? item : i) }
      : c
  ))
}

export function deleteItem(categoryId: string, itemId: string): void {
  const cats = getCategories()
  saveCategories(cats.map(c =>
    c.id === categoryId
      ? { ...c, items: (c.items ?? []).filter(i => i.id !== itemId) }
      : c
  ))
}

export function reorderItems(categoryId: string, items: MenuItem[]): void {
  const cats = getCategories()
  saveCategories(cats.map(c =>
    c.id === categoryId ? { ...c, items } : c
  ))
}

export function getItemById(itemId: string): { item: MenuItem; categoryId: string } | null {
  const cats = getCategories()
  for (const cat of cats) {
    const item = (cat.items ?? []).find(i => i.id === itemId)
    if (item) return { item, categoryId: cat.id }
  }
  return null
}

const INGREDIENTS_KEY = 'nutrimenu_ingredients'

export function getIngredients(): IngredientRef[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(INGREDIENTS_KEY)
  return raw ? JSON.parse(raw) : []
}

export function saveIngredients(ingredients: IngredientRef[]): void {
  localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients))
}

export function addIngredient(data: Omit<IngredientRef, 'id'>): IngredientRef {
  const ingredients = getIngredients()
  const newIng: IngredientRef = { ...data, id: crypto.randomUUID() }
  saveIngredients([...ingredients, newIng])
  return newIng
}

export function updateIngredient(id: string, data: Omit<IngredientRef, 'id'>): void {
  const ingredients = getIngredients()
  saveIngredients(ingredients.map(i => i.id === id ? { ...i, ...data } : i))
}

export function deleteIngredient(id: string): void {
  const ingredients = getIngredients()
  saveIngredients(ingredients.filter(i => i.id !== id))
}