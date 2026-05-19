const STORAGE_KEY = 'nutrimenu.recent-ingredients'
const MAX_RECENT = 20

function safeRead(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function safeWrite(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* quota / private mode — silently ignore */
  }
}

/** Список ID ингредиентов в порядке от самого недавно использованного. */
export function getRecentIngredientIds(): string[] {
  return safeRead()
}

/** Помечает ингредиент как использованный (поднимает наверх списка). */
export function markIngredientUsed(id: string): void {
  if (!id) return
  const current = safeRead()
  const next = [id, ...current.filter(x => x !== id)].slice(0, MAX_RECENT)
  safeWrite(next)
}
