---
name: backend-developer
description: Guide backend implementation for NutriMenu — currently localStorage-only. Use this skill when adding API routes, planning the migration from localStorage to a real database, or implementing any server-side logic.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Goal

Build correct, secure, and migration-ready server-side code for NutriMenu. The project currently has no backend — all data is in `localStorage` via `lib/store.ts`. Every backend decision should make the future migration to a real database easier, not harder.

## Current State

- **Persistence:** `localStorage` only — `lib/store.ts` (keys: `nutrimenu_venue`, `nutrimenu_categories`, `nutrimenu_ingredients`)
- **Auth:** none
- **Database:** none
- **API routes:** none yet
- **Framework:** Next.js 16 App Router — use Route Handlers (`app/api/*/route.ts`), not the old `pages/api/`

## Adding API Routes

Use Next.js 16 Route Handlers. Read `node_modules/next/dist/docs/` before writing route code — APIs may differ from training data.

File convention: `app/api/[resource]/route.ts`

```ts
// app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // ...
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // validate with zod before touching any data
  // ...
  return NextResponse.json(created, { status: 201 })
}
```

Always:
- Validate request body with **zod** before processing — same schemas as the frontend where possible
- Return proper HTTP status codes (200, 201, 400, 401, 404, 500)
- Never expose stack traces in error responses to the client

## Migration Path: localStorage → Database

When migrating, follow this order:
1. **Define schema** — derive from `types/index.ts` (Venue, Category, MenuItem, IngredientRef)
2. **Create API routes** that mirror current store functions in `lib/store.ts`
3. **Swap store functions** — replace localStorage reads/writes with `fetch()` calls to the new routes
4. **Add auth** — protect write endpoints before going live

Keep `lib/store.ts` as the single abstraction layer. Components should never call `fetch()` directly — they call store functions. This means migration only touches `lib/store.ts` and new route files, not components.

```ts
// lib/store.ts — today
export function getCategories(): Category[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem('nutrimenu_categories') ?? '[]')
}

// lib/store.ts — after migration (same interface, different impl)
export async function getCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories')
  return res.json()
}
```

## Data Validation

Always validate at the API boundary. Reuse zod schemas from the frontend:

```ts
import { menuItemSchema } from '@/lib/schemas' // shared schema
const parsed = menuItemSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
}
```

Never trust client-provided IDs for ownership checks. When auth is added, always verify the resource belongs to the authenticated user.

## Recommended Database (when ready)

For this project (SaaS, multi-tenant by venue slug, relational data):
- **Postgres** via Supabase or Neon (serverless-friendly for Vercel)
- **ORM:** Prisma (type-safe, schema migrations, works well with Next.js)
- Schema mirrors `types/index.ts` — `Venue`, `Category`, `MenuItem`, `IngredientRef`

Tables:
```
venues          — id, slug, name, ...
categories      — id, venue_id, name, sort_order
menu_items      — id, category_id, name, calories, protein, fat, carbs, ...
ingredient_refs — id, venue_id, name, calories_per_100g, ...
```

## Security Rules

- Sanitize all string inputs — no raw SQL string interpolation (use parameterized queries / Prisma)
- Rate-limit write endpoints (especially POST/PUT/DELETE) when auth is added
- Slug-based public routes (`/menu/[slug]`) are read-only — no auth needed, but no mutations allowed
- Never log request bodies that might contain passwords or tokens
- Environment variables for all secrets — never hardcode

## Environment Variables

Store in `.env.local` (never commit):
```
DATABASE_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
```

Access via `process.env.VAR_NAME` only in Server Components or Route Handlers — never in Client Components (they'd be exposed to the browser).

## Learnings

- (Updated after each session)
