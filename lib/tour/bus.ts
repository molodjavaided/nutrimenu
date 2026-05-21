// Лёгкий event-bus для интерактивного тура. Компоненты эмитят события реальных
// действий пользователя, TourController слушает их для перехода между шагами.

export type TourEventName =
  | 'mode-set'         // payload: 'quick' | 'composition' | 'ttk'
  | 'picker-opened'    // payload: undefined
  | 'picker-search'    // payload: string (текущий запрос)
  | 'ingredient-picked'// payload: string (ingredientRefId)
  | 'processing-set'   // payload: { refId: string; processing: string }
  | 'amount-set'       // payload: { refId: string; amount: number }
  | 'companion-added'  // payload: { parentRefId: string; kind: 'oil' | 'water' }
  | 'preview-opened'   // payload: undefined
  | 'preview-closed'   // payload: undefined
  | 'item-saved'       // payload: undefined

type Handler = (payload?: unknown) => void

const listeners = new Map<TourEventName, Set<Handler>>()

export const tourBus = {
  emit(event: TourEventName, payload?: unknown) {
    listeners.get(event)?.forEach(h => {
      try { h(payload) } catch { /* слушатель не должен ронять эмиттер */ }
    })
  },
  on(event: TourEventName, handler: Handler): () => void {
    let set = listeners.get(event)
    if (!set) { set = new Set(); listeners.set(event, set) }
    set.add(handler)
    return () => { listeners.get(event)?.delete(handler) }
  },
}
