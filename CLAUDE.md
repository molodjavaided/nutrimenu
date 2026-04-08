# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint (Next.js config, v9 flat config in eslint.config.mjs)
```

No test framework is configured.

## Architecture

**NutriMenu** is a Next.js 16 (App Router) SaaS app for restaurant/café owners to build nutrition-aware digital menus accessible to guests via QR code.

### Two main sections

**Dashboard** (`/dashboard/*`) — owner-facing management UI:
- `/dashboard` — overview stats
- `/dashboard/menu` — category & item management with drag-and-drop reordering (`@dnd-kit/core`, `@dnd-kit/sortable`)
- `/dashboard/item/new` and `/dashboard/item/[id]` — item create/edit via `ItemForm`
- `/dashboard/ingredients` — ingredient reference library

**Public menu** (`/menu/[slug]`) — guest-facing read-only view:
- Thin async Server Component (`app/menu/[slug]/page.tsx`) passes `slug` to `MenuClientWrapper` (Client Component)
- `MenuClientWrapper` loads data from `localStorage` (or falls back to `mockCategories`/`mockVenue` from `lib/mock-data.ts`) and renders `MenuView`
- `MenuView` renders `CategoryTabs`, `DishCard`, `DishSheet` (item detail bottom sheet), and `NutriTracker`

### Data persistence

All data lives in `localStorage` (no backend/database). `lib/store.ts` provides typed read/write helpers for three keys:
- `nutrimenu_venue` — single `Venue` object
- `nutrimenu_categories` — `Category[]` where each category embeds its `MenuItem[]` items
- `nutrimenu_ingredients` — `IngredientRef[]` (ingredient reference dictionary)

All store functions guard against SSR with `typeof window === 'undefined'` checks.

### Nutrition data model (`types/index.ts`)

`MenuItem` nutrition can be computed at multiple levels of complexity:
1. **Flat**: base `calories/protein/fat/carbs` fields directly on `MenuItem`
2. **Variants** (`variantGroups → VariantGroup → options: VariantOption[]`): mutually exclusive selections (e.g. size, filling) that override base КБЖУ
3. **Modifiers** (`modifierGroups → ModifierGroup → modifiers: Modifier[]`): addons (`type: 'addon'`) add КБЖУ; replacements (`type: 'replace'`) swap an ingredient in the composition
4. **Composition** (`CompositionRow[]` referencing `IngredientRef` by id): ingredient-level calculation via `resolveNutriFromComposition()` in `lib/utils.ts`

`resolveNutri()` in `lib/utils.ts` is the main function that merges variant and modifier selections into final КБЖУ values shown to guests.

### UI stack

- **Tailwind CSS v4** (PostCSS plugin, config in `postcss.config.mjs`) — inline style objects are used alongside Tailwind for brand colors (`#2C2950`, `#B0A6DF`, `#EAE7F8`, `#FEFEF2`)
- **shadcn/ui** components in `components/ui/` (Button, Card, Input, Label, Badge, Tabs, Sheet, Dialog)
- **react-hook-form** + **zod** for form validation in `ItemForm`
- **lucide-react** for icons
- `cn()` utility in `lib/utils.ts` wraps `clsx` + `tailwind-merge`

### Path alias

`@/` maps to the project root (configured in `tsconfig.json`).
