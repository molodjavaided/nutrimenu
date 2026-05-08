# NutriMenu: Session Memory

## 🚀 Current Task

- **Goal:** MVP Pre-Deploy — остались SEO, онбординг, email при одобрении, PDF import
- **Status:** In Progress
- **Last Action:** Полный анализ кодовой базы 2026-05-07. Build успешен, TypeScript ошибок нет.
- **Immediate Next Step:** SEO публичного меню — `generateMetadata` + OG + JSON-LD в `app/menu/[slug]/page.tsx`

## ✅ Завершённые задачи MVP

| Задача | Где реализовано |
|--------|----------------|
| QR-код | `app/dashboard/page.tsx` ~строка 158 |
| Статус заявки PENDING/REJECTED | `app/dashboard/page.tsx` строки 25, 47 |
| Сброс пароля | `/api/auth/forgot-password`, `/api/auth/reset-password`, страницы `/auth/*` |
| Загрузка фото | `/api/upload` (Vercel Blob), `ItemForm` |
| Rate limiting | `lib/ratelimit.ts` → Upstash Redis, подключён в 3 auth маршрутах |
| TTK: Вручную / XLSX / Google Sheets | `lib/ttk-strategies.ts`, `app/api/parse-ttk/route.ts`, `ImportModal.tsx` |

## ❌ Незавершённые задачи MVP

1. **SEO публичного меню** — `app/menu/[slug]/page.tsx` без `generateMetadata`, OG, JSON-LD
2. **Онбординг** — нет checklist на `/dashboard` для новых владельцев
3. **Email при одобрении** — `app/api/admin/venues/[id]/route.ts` не шлёт письмо

## ❌ Незавершённые (отдельный трек)

4. **TTK Канал 4: PDF / Фото → AI Vision** — не начат (высокая сложность)
5. **Тестирование Google Sheets** — нужен `ANTHROPIC_API_KEY` в `.env.local`

## 🧠 Архитектура (актуально)

- **Stack:** Next.js 16 App Router, Tailwind v4, Prisma + Neon Postgres, JWT сессии (jose + bcryptjs)
- **Auth:** `lib/auth.ts` — `getSession()`, `getEffectiveVenueId()` (поддержка импersonation)
- **DB:** `lib/db.ts` — Prisma singleton с Neon adapter
- **Nutrition:** `resolveNutri()` в `lib/utils.ts` — мержит варианты + модификаторы
- **Import:** `lib/ttk-strategies.ts` — 4 стратегии + AI fallback через Claude/Gemini

## 📦 Полная карта функций

### lib/utils.ts
`cn`, `roundNutri`, `resolveNutri`, `buildVariantLabel`, `calcNutriTotal`, `resolveIngredientPer100`, `resolveNutriFromComposition`

### lib/store.ts
`createImportBackup`, `rollbackImport`, `clearImportBackup`, `getVenue`, `saveVenue`, `getCategories`, `saveCategories`, `addCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`, `addItem`, `updateItem`, `deleteItem`, `reorderItems`, `getItemById`, `getLibraries`, `saveLibraries`, `initLibraries`, `getAllIngredients`, `saveLibraryIngredients`, `getIngredients`, `saveIngredients`, `addIngredient`, `updateIngredient`, `deleteIngredient`, `deduplicateLibraryIngredients`

### lib/auth.ts
`hashPassword`, `verifyPassword`, `createSessionToken`, `verifySessionToken`, `getSession`, `getEffectiveVenueId`, `setSessionCookie`

### lib/ttk-strategies.ts
`strategyHierarchical`, `strategyColumnar`, `strategyPerRow`, `strategyTabularSparse`, `detectAndParse`

### lib/claude-ttk.ts
`validateTTKDishes`, `parsePDFTTK`

### lib/gemini-ttk.ts
`validateTTKDishes`, `parsePDFTextTTK`, `parsePDFTTK`

### lib/importer.ts
`parseFile`, `buildImportedCategories`, `detectConflicts`, `dishKey`, `detectIngredientMatches`
