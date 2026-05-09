# NutriMenu: Session Memory

## 🚀 Current Task

- **Goal:** MVP Pre-Deploy — остался email при одобрении + PDF import
- **Status:** In Progress
- **Last Action:** Запушен коммит `5a150c6` — SEO, онбординг, кнопка "Искать заведение"
- **Immediate Next Step:** Email владельцу при одобрении заявки (`app/api/admin/venues/[id]/route.ts` → Resend)

## ✅ Завершённые задачи MVP

| Задача | Где реализовано |
|--------|----------------|
| QR-код | `app/dashboard/page.tsx` |
| Статус PENDING/REJECTED | `app/dashboard/page.tsx` строки 25, 47 |
| Сброс пароля | `/api/auth/forgot-password`, `/api/auth/reset-password`, страницы `/auth/*` |
| Загрузка фото | `/api/upload` (Vercel Blob), `ItemForm` |
| Rate limiting | `lib/ratelimit.ts` → Upstash Redis, 3 auth маршрута |
| SEO публичного меню | `app/menu/[slug]/page.tsx` — `generateMetadata`, OG, JSON-LD |
| Онбординг checklist | `app/dashboard/page.tsx` — 3 шага, исчезает после завершения |
| Кнопка "Искать заведение" | `app/auth/layout.tsx` — на всех auth страницах |
| TTK: Вручную / XLSX / Google Sheets | `lib/ttk-strategies.ts`, `app/api/parse-ttk/route.ts`, `ImportModal.tsx` |

## ❌ Незавершённые задачи

### MVP
1. **Email при одобрении** — `app/api/admin/venues/[id]/route.ts` не шлёт письмо при approve. Нужен Resend + шаблон письма.

### TTK Import (отдельный трек)
2. **Тестирование Google Sheets** — нужен `ANTHROPIC_API_KEY` в `.env.local` и тест с таблицей `15rOivm_9jZYw4LdH3OXPxF0B9nHKQfsT`
3. **TTK Канал 4: PDF / Фото → AI Vision** — не начат, высокая сложность

## 🧠 Архитектура (актуально)

- **Stack:** Next.js 16 App Router, Tailwind v4, Prisma + Neon Postgres, JWT (jose + bcryptjs)
- **Auth:** `lib/auth.ts` — `getSession()`, `getEffectiveVenueId()` (impersonation)
- **DB:** `lib/db.ts` — Prisma singleton с Neon adapter
- **Nutrition:** `resolveNutri()` в `lib/utils.ts`
- **Import:** `lib/ttk-strategies.ts` — 4 стратегии + AI fallback

## 📦 Ключевые функции

### lib/utils.ts
`cn`, `roundNutri`, `resolveNutri`, `buildVariantLabel`, `calcNutriTotal`, `resolveIngredientPer100`, `resolveNutriFromComposition`

### lib/store.ts
`getVenue`, `saveVenue`, `getCategories`, `saveCategories`, `addCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`, `addItem`, `updateItem`, `deleteItem`, `reorderItems`, `getItemById`, `getLibraries`, `saveLibraries`, `getAllIngredients`, `addIngredient`, `updateIngredient`, `deleteIngredient`

### lib/auth.ts
`hashPassword`, `verifyPassword`, `createSessionToken`, `verifySessionToken`, `getSession`, `getEffectiveVenueId`, `setSessionCookie`

### lib/ttk-strategies.ts
`strategyHierarchical`, `strategyColumnar`, `strategyPerRow`, `strategyTabularSparse`, `detectAndParse`
