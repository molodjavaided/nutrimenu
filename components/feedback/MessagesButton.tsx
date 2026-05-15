'use client'

import { useSyncExternalStore } from 'react'

type Category = 'bug' | 'idea' | 'question' | 'billing' | 'other'

interface State {
  open: boolean
  initialCategory?: Category
}

let state: State = { open: false }
const listeners = new Set<() => void>()

function emit() { listeners.forEach(l => l()) }

export const messagesStore = {
  open(cat?: Category) {
    state = { open: true, initialCategory: cat }
    emit()
  },
  close() {
    state = { open: false }
    emit()
  },
}

export function useMessagesPanelState(): State {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    () => state,
    () => state,
  )
}
