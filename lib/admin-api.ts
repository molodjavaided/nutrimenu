/** Admin API client + query keys + typed fetchers. */

export type VenueStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type PlanId = 'TEST' | 'START' | 'STANDARD' | 'CUSTOM'

export interface AdminVenue {
  id: string
  name: string
  slug: string
  country: string | null
  city: string | null
  status: VenueStatus
  allowAdminEdit: boolean
  createdAt: string
  owner: { email: string; plan: PlanId; trialEndsAt: string | null; paidUntil: string | null }
}

export type SubscriptionState = 'trial' | 'awaiting_plan' | 'paid' | 'grace' | 'expired'

export function getSubscriptionState(
  plan: PlanId,
  trialEndsAt: string | null,
  paidUntil: string | null,
  now: number = Date.now(),
): SubscriptionState {
  if (plan === 'TEST') {
    if (trialEndsAt && new Date(trialEndsAt).getTime() > now) return 'trial'
    return 'awaiting_plan'
  }
  if (paidUntil && new Date(paidUntil).getTime() > now) return 'paid'
  if (paidUntil) {
    const graceEnd = new Date(paidUntil).getTime() + 30 * 24 * 60 * 60 * 1000
    if (now < graceEnd) return 'grace'
  }
  return 'expired'
}

export function daysUntil(iso: string | null, now: number = Date.now()): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - now) / (1000 * 60 * 60 * 24))
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
  country: string | null
  city: string | null
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
    plan: PlanId
    paidUntil: string | null
    trialEndsAt: string | null
    bonusItems: number
    bonusAiImports: number
    bonusTtkExports: number
  }
  categories: AdminVenueDetailCategory[]
}

export const adminKeys = {
  venues: ['admin', 'venues'] as const,
  venue: (id: string) => ['admin', 'venues', id] as const,
  files: (id: string) => ['admin', 'venues', id, 'files'] as const,
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

  bulkApprove: (ids: string[]): Promise<{ updated: number }> =>
    fetch('/api/admin/venues/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status: 'APPROVED' }),
    }).then(r => jsonOrThrow<{ updated: number }>(r)),

  impersonate: (id: string): Promise<{ ok: true }> =>
    fetch(`/api/admin/venues/${id}/impersonate`, { method: 'POST' }).then(r => jsonOrThrow<{ ok: true }>(r)),

  verifyEmail: (id: string): Promise<{ ok: true }> =>
    fetch(`/api/admin/venues/${id}/verify-email`, { method: 'POST' }).then(r => jsonOrThrow<{ ok: true }>(r)),

  generateResetLink: (id: string): Promise<{ link: string }> =>
    fetch(`/api/admin/venues/${id}/reset-password`, { method: 'POST' }).then(r => jsonOrThrow<{ link: string }>(r)),

  updatePlan: (
    id: string,
    body: {
      plan?: PlanId
      paidUntil?: string | null
      extendPaidDays?: number
      trialEndsAt?: string | null
      extendTrialDays?: number
      bonusItems?: number
      bonusAiImports?: number
      bonusTtkExports?: number
    },
  ): Promise<unknown> =>
    fetch(`/api/admin/venues/${id}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => jsonOrThrow<unknown>(r)),

  fetchFiles: (id: string): Promise<VenueFile[]> =>
    fetch(`/api/admin/venues/${id}/files`).then(r => jsonOrThrow<VenueFile[]>(r)),

  uploadFile: async (
    id: string,
    file: File,
    category: string,
    notes?: string,
  ): Promise<VenueFile> => {
    const form = new FormData()
    form.append('file', file)
    form.append('category', category)
    if (notes) form.append('notes', notes)
    return fetch(`/api/admin/venues/${id}/files`, { method: 'POST', body: form }).then(r =>
      jsonOrThrow<VenueFile>(r),
    )
  },

  deleteFile: (id: string, fileId: string): Promise<{ ok: true }> =>
    fetch(`/api/admin/venues/${id}/files/${fileId}`, { method: 'DELETE' }).then(r =>
      jsonOrThrow<{ ok: true }>(r),
    ),
}

export interface VenueFile {
  id: string
  venueId: string
  uploadedById: string
  uploaderRole: 'OWNER' | 'ADMIN'
  category: string
  filename: string
  url: string
  size: number
  mimeType: string
  notes: string | null
  createdAt: string
}
