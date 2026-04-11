import { Category, IngredientLibrary, IngredientRef, MenuItem, Venue } from '@/types'

const VENUE_KEY = 'nutrimenu_venue'
const CATEGORIES_KEY = 'nutrimenu_categories'
const INGREDIENTS_KEY = 'nutrimenu_ingredients'
const LIBRARIES_KEY = 'nutrimenu_ingredient_libraries'
const IMPORT_BACKUP_KEY = 'nutrimenu_import_backup'

// ─── Import backup / rollback ────────────────────────────────

interface ImportBackup {
  categories: string
  libraries: string
}

/** Snapshot current categories + ingredient libraries before an import. */
export function createImportBackup(): void {
  if (typeof window === 'undefined') return
  const backup: ImportBackup = {
    categories: localStorage.getItem(CATEGORIES_KEY) ?? '[]',
    libraries: localStorage.getItem(LIBRARIES_KEY) ?? '[]',
  }
  localStorage.setItem(IMPORT_BACKUP_KEY, JSON.stringify(backup))
}

/** Restore categories + libraries from last import backup. Returns true on success. */
export function rollbackImport(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(IMPORT_BACKUP_KEY)
  if (!raw) return false
  const backup: ImportBackup = JSON.parse(raw)
  localStorage.setItem(CATEGORIES_KEY, backup.categories)
  localStorage.setItem(LIBRARIES_KEY, backup.libraries)
  localStorage.removeItem(IMPORT_BACKUP_KEY)
  window.dispatchEvent(new CustomEvent('nutrimenu:updated'))
  return true
}

/** Discard the backup after the undo window closes. */
export function clearImportBackup(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(IMPORT_BACKUP_KEY)
}

// ─── Venue ───────────────────────────────────────────────────

export function getVenue(): Venue | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(VENUE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveVenue(venue: Venue): void {
  localStorage.setItem(VENUE_KEY, JSON.stringify(venue))
  window.dispatchEvent(new CustomEvent('nutrimenu:updated'))
}

// ─── Categories ──────────────────────────────────────────────

export function getCategories(): Category[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(CATEGORIES_KEY)
  if (!raw) return []
  const cats: Category[] = JSON.parse(raw)
  // Heal any duplicate item IDs written by earlier import bugs
  let dirty = false
  const healed = cats.map(c => {
    const seen = new Set<string>()
    const items = (c.items ?? []).filter(i => {
      if (seen.has(i.id)) return false
      seen.add(i.id)
      return true
    })
    if (items.length !== (c.items?.length ?? 0)) { dirty = true; return { ...c, items } }
    return c
  })
  // Write back the cleaned data so corrupt keys don't re-surface on next read
  if (dirty) localStorage.setItem(CATEGORIES_KEY, JSON.stringify(healed))
  return healed
}

export function saveCategories(categories: Category[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
  window.dispatchEvent(new CustomEvent('nutrimenu:updated'))
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

export const MY_LIBRARY_ID = 'my-library'

// ─── Libraries ───────────────────────────────────────────────

export function getLibraries(): IngredientLibrary[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(LIBRARIES_KEY)
  return raw ? JSON.parse(raw) : []
}

export function saveLibraries(libraries: IngredientLibrary[]): void {
  localStorage.setItem(LIBRARIES_KEY, JSON.stringify(libraries))
}

/**
 * Initialise libraries on first load.
 * - Migrates old nutrimenu_ingredients into the personal library if needed.
 * - Seeds provided system libraries if they're not yet present.
 */
export function initLibraries(systemLibraries: IngredientLibrary[]): IngredientLibrary[] {
  let libs = getLibraries()

  // Remove any legacy system libraries that are no longer in the current system list
  const currentSystemIds = new Set(systemLibraries.map(l => l.id))
  libs = libs.filter(l => !l.isSystem || currentSystemIds.has(l.id))

  // Always sync system libraries — replace stored content with latest definitions
  for (const sysLib of systemLibraries) {
    const existing = libs.find(l => l.id === sysLib.id)
    if (existing) {
      libs = libs.map(l => l.id === sysLib.id ? { ...sysLib } : l)
    } else {
      libs = [sysLib, ...libs]
    }
  }

  // Ensure personal library exists
  if (!libs.find(l => l.id === MY_LIBRARY_ID)) {
    // Migrate legacy data if present
    const legacy = localStorage.getItem(INGREDIENTS_KEY)
    const migratedIngredients: IngredientRef[] = legacy ? JSON.parse(legacy) : []
    libs = [...libs, {
      id: MY_LIBRARY_ID,
      name: 'Мои ингредиенты',
      isSystem: false,
      ingredients: migratedIngredients,
    }]
  }

  saveLibraries(libs)
  return libs
}

/** Flat list of all ingredients across all libraries — for ItemForm / DishSheet lookups */
export function getAllIngredients(): IngredientRef[] {
  return getLibraries().flatMap(l => l.ingredients)
}

export function saveLibraryIngredients(libraryId: string, ingredients: IngredientRef[]): void {
  const libs = getLibraries()
  saveLibraries(libs.map(l => l.id === libraryId ? { ...l, ingredients } : l))
}

// ─── Legacy helpers (kept for backwards compat, operate on personal library) ──

export function getIngredients(): IngredientRef[] {
  if (typeof window === 'undefined') return []
  const libs = getLibraries()
  return libs.find(l => l.id === MY_LIBRARY_ID)?.ingredients ?? []
}

export function saveIngredients(ingredients: IngredientRef[]): void {
  saveLibraryIngredients(MY_LIBRARY_ID, ingredients)
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