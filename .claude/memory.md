# NutriMenu: Session Memory

## 🚀 Current Task

- **Goal:** Админ-панель: безопасность + управление планом + миграция server state на TanStack Query
- **Status:** In Progress
- **Last Action (2026-05-15):** Список заведений переписан: вынесен `components/admin/VenueCard.tsx` (название + город/страна + 2 бейджа: статус заявки + состояние подписки). Quick-filters (На проверке / Триал ≤3д / Grace / Просрочено) с счётчиками. Сортировка (новые/старые/имя/статус) + пагинация 20/стр. Bulk approve через `PATCH /api/admin/venues/bulk` + чекбоксы у PENDING. API `/api/admin/venues` теперь возвращает country/city + trial/paid даты. Хелперы `getSubscriptionState` и `daysUntil` в `lib/admin-api.ts`.

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
