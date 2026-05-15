# NutriMenu: Session Memory

## 🚀 Current Task

- **Goal:** Админ-панель: безопасность + управление планом + миграция server state на TanStack Query
- **Status:** In Progress
- **Last Action (2026-05-15, ч.2):** Введён тариф TEST. Регистрация ставит `plan: 'TEST'` + триал 14д. После триала — новое состояние `awaiting_plan`: меню гостям скрыто, дашборд блокирует добавление блюд/AI, владелец видит баннер «свяжитесь с админом». В админке: бейдж «Тест Nд» / «Ждёт тариф», quick-filter «Ждёт тариф» с счётчиком, при смене TEST→платный модалка с выбором продления (1м/3м/6м/1г/без). PLANS.TEST = лимиты Старта без AI. Plans/limits API учитывает бонусы во всех 3 callers. Миграция `add_test_plan`. TrialBanner перерисован под новые состояния.

- **Last Action (2026-05-15):** Детальная страница venue: переработана структура. Добавлены: продление триала (+7/+14/+30д), бонусные лимиты сверх плана (bonusItems / bonusAiImports / bonusTtkExports — кнопки +10/+50/+100 и кастомный ввод), файлы заведения (drag&drop, 10MB, PDF/DOC/XLS/JPG/PNG/WEBP, категории menu_source/ttk/logo/photo/other, Vercel Blob). Миграция `add_bonus_limits_and_venue_files`. `getEffectiveLimits()` теперь учитывает бонусы (прибавляет к лимиту плана, сохраняются при смене плана). Новые компоненты `components/admin/BonusGrants.tsx`, `components/admin/VenueFiles.tsx`, `lib/venue-files.ts`. Endpoints: `/api/admin/venues/[id]/files` (GET/POST), `/api/admin/venues/[id]/files/[fileId]` (DELETE).

## ❌ Незавершённые задачи

### Security (отложено)
- #3 audit log (AdminAction таблица)
- #4 rate-limit на /api/admin/*
- #5 2FA / IP allowlist для админа

### TanStack Query — миграция остального
- Дашборд (`/dashboard/*`) ещё на useEffect + setState. Переписать после стабилизации админки.
- `/admin/feedback` — пока на старом fetch.

### Прочее
- Email при одобрении (Resend) — блокер: нет домена
- TTK Канал 4: PDF/Photo → AI Vision

## 🧠 Архитектура (актуально)

- **Stack:** Next.js 16, Tailwind v4, Prisma + Neon, JWT, **@tanstack/react-query 5**
- **State management:** server state → TanStack Query. Client state — пока useState достаточно. Redux не вводим.
- **Admin gate:** `app/admin/layout.tsx` Server Component делает `getSession()` + redirect. Клиентская оболочка — `app/admin/AdminShell.tsx`.
- **Impersonation:** TTL 2ч (`IMPERSONATION_TTL_MS` в `lib/auth.ts`). `verifySessionToken` тихо дропает истёкший `impersonatingVenueId` → админ возвращается к своей идентичности.

## 📦 Новые файлы / endpoints

- `app/providers.tsx` — QueryClientProvider + Devtools
- `app/admin/AdminShell.tsx` — клиентская оболочка
- `lib/admin-api.ts` — типизированный клиент + queryKeys
- `app/api/admin/venues/[id]/plan/route.ts` — PATCH plan/paidUntil/extendDays

## 🔑 Лимиты планов (lib/plans.ts)
- START — 50 блюд, 5 AI-импортов/мес
- STANDARD — 200 блюд, 15 AI
- CUSTOM — Infinity
- TRIAL 14д, GRACE 30д
