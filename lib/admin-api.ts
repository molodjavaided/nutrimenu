/** Admin API client + query keys + typed fetchers. */

export type VenueStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AdminVenue {
  id: string
  name: string
  slug: string
  status: VenueStatus
  allowAdminEdit: boolean
  createdAt: string
  owner: { email: string }
}

export interface AdminVenuesStats {
  total: number
  newThisWeek: number
  byStatus: Record<string, number>
}

export interface AdminVenuesResponse {
  venues: AdminVenue[]
  stats: AdminVenuesStats
}

export interface AdminVenueDetailItem {
  id: string
  name: string
  description: string | null
  photo: string | null
  price: number | null
  weight: number
  weightUnit: string
  calories: number
  protein: number
  fat: number
  carbs: number
  isAvailable: boolean
  updatedAt: string
}

export interface AdminVenueDetailCategory {
  id: string
  name: string
  items: AdminVenueDetailItem[]
}

export interface AdminVenueDetail {
  id: string
  name: string
  slug: string
  address: string | null
  description: string | null
  status: VenueStatus
  adminNote: string | null
  createdAt: string
  updatedAt: string
  owner: {
    email: string
    emailVerified: boolean
    ttkImportCount: number
    createdAt: string
    plan: 'START' | 'STANDARD' | 'CUSTOM'
    paidUntil: string | null
    trialEndsAt: string | null
  }
  categories: AdminVenueDetailCategory[]
}

export const adminKeys = {
  venues: ['admin', 'venues'] as const,
  venue: (id: string) => ['admin', 'venues', id] as const,
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

export const adminApi = {
  fetchVenues: (): Promise<AdminVenuesResponse> =>
    fetch('/api/admin/venues').then(r => jsonOrThrow<AdminVenuesResponse>(r)),

  fetchVenue: (id: string): Promise<AdminVenueDetail> =>
    fetch(`/api/admin/venues/${id}/menu`).then(r => jsonOrThrow<AdminVenueDetail>(r)),

  patchVenue: (
    id: string,
    body: { status?: VenueStatus; adminNote?: string },
  ): Promise<AdminVenueDetail> =>
    fetch(`/api/admin/venues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => jsonOrThrow<AdminVenueDetail>(r)),

  deleteVenue: (id: string): Promise<{ ok: true }> =>
    fetch(`/api/admin/venues/${id}`, { method: 'DELETE' }).then(r => jsonOrThrow<{ ok: true }>(r)),

  impersonate: (id: string): Promise<{ ok: true }> =>
    fetch(`/api/admin/venues/${id}/impersonate`, { method: 'POST' }).then(r => jsonOrThrow<{ ok: true }>(r)),

  verifyEmail: (id: string): Promise<{ ok: true }> =>
    fetch(`/api/admin/venues/${id}/verify-email`, { method: 'POST' }).then(r => jsonOrThrow<{ ok: true }>(r)),

  generateResetLink: (id: string): Promise<{ link: string }> =>
    fetch(`/api/admin/venues/${id}/reset-password`, { method: 'POST' }).then(r => jsonOrThrow<{ link: string }>(r)),

  updatePlan: (
    id: string,
    body: { plan?: 'START' | 'STANDARD' | 'CUSTOM'; paidUntil?: string | null; extendDays?: number },
  ): Promise<{ plan: string; paidUntil: string | null; trialEndsAt: string | null }> =>
    fetch(`/api/admin/venues/${id}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => jsonOrThrow<{ plan: string; paidUntil: string | null; trialEndsAt: string | null }>(r)),
}
