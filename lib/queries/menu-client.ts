'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Category, IngredientRef, MenuItem } from '@/types'

export const menuKeys = {
  categories: ['categories'] as const,
  ingredients: ['ingredients'] as const,
}

async function jsonOrThrow<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<T>
}

export function useCategoriesQuery(initialData?: Category[]) {
  return useQuery<Category[]>({
    queryKey: menuKeys.categories,
    queryFn: () => fetch('/api/categories').then(jsonOrThrow<Category[]>),
    initialData,
  })
}

type Snapshot = { previous?: Category[] }

function snapshot(qc: ReturnType<typeof useQueryClient>): Snapshot {
  return { previous: qc.getQueryData<Category[]>(menuKeys.categories) }
}

function rollback(qc: ReturnType<typeof useQueryClient>, ctx?: Snapshot) {
  if (ctx?.previous) qc.setQueryData(menuKeys.categories, ctx.previous)
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name }: { tempId: string; name: string }) => {
      const r = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      return jsonOrThrow<Category>(r)
    },
    onMutate: async ({ tempId, name }) => {
      await qc.cancelQueries({ queryKey: menuKeys.categories })
      const snap = snapshot(qc)
      qc.setQueryData<Category[]>(menuKeys.categories, prev => {
        const list = prev ?? []
        const optimistic: Category = {
          id: tempId,
          name,
          venueId: '',
          order: list.length,
          items: [],
        }
        return [...list, optimistic]
      })
      return snap
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: menuKeys.categories }),
  })
}

export function useRenameCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const r = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: menuKeys.categories })
      const snap = snapshot(qc)
      qc.setQueryData<Category[]>(menuKeys.categories, prev =>
        prev?.map(c => (c.id === id ? { ...c, name } : c)),
      )
      return snap
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: menuKeys.categories }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const r = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: menuKeys.categories })
      const snap = snapshot(qc)
      qc.setQueryData<Category[]>(menuKeys.categories, prev =>
        prev?.filter(c => c.id !== id),
      )
      return snap
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: menuKeys.categories }),
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId }: { categoryId: string; itemId: string }) => {
      const r = await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
    },
    onMutate: async ({ categoryId, itemId }) => {
      await qc.cancelQueries({ queryKey: menuKeys.categories })
      const snap = snapshot(qc)
      qc.setQueryData<Category[]>(menuKeys.categories, prev =>
        prev?.map(c =>
          c.id === categoryId
            ? { ...c, items: (c.items ?? []).filter(i => i.id !== itemId) }
            : c,
        ),
      )
      return snap
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: menuKeys.categories }),
  })
}

export function useReorderItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ items }: { categoryId: string; items: MenuItem[] }) => {
      const r = await fetch('/api/items/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items.map((it, i) => ({ id: it.id, sortOrder: i }))),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
    },
    onMutate: async ({ categoryId, items }) => {
      await qc.cancelQueries({ queryKey: menuKeys.categories })
      const snap = snapshot(qc)
      qc.setQueryData<Category[]>(menuKeys.categories, prev =>
        prev?.map(c => (c.id === categoryId ? { ...c, items } : c)),
      )
      return snap
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: menuKeys.categories }),
  })
}

export function useReorderCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ categories }: { categories: Category[] }) => {
      const r = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categories.map((c, i) => ({ id: c.id, sortOrder: i }))),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
    },
    onMutate: async ({ categories }) => {
      await qc.cancelQueries({ queryKey: menuKeys.categories })
      const snap = snapshot(qc)
      qc.setQueryData<Category[]>(menuKeys.categories, categories)
      return snap
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: menuKeys.categories }),
  })
}

export function useInvalidateCategories() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: menuKeys.categories })
}

export function useIngredientsQuery(initialData?: IngredientRef[]) {
  return useQuery<IngredientRef[]>({
    queryKey: menuKeys.ingredients,
    queryFn: () => fetch('/api/ingredients').then(jsonOrThrow<IngredientRef[]>),
    initialData,
  })
}

export function useInvalidateIngredients() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: menuKeys.ingredients })
}
