# NutriMenu: Session Memory

## 🚀 Current Task

- **Goal:** Админ-панель: безопасность + управление планом + миграция server state на TanStack Query
- **Status:** In Progress
- **Last Action (2026-05-15, ч.4):** Telegram-бот брифинг. Миграция `add_telegram_briefing` (User.telegramChatId/Username, Venue.briefingState/CompletedAt). `lib/telegram.ts` расширен (`sendToChat`, `getTelegramFile`, `downloadTelegramFile`, `getBotInfo`, HMAC `signStartToken`/`verifyStartToken`). `lib/telegram-briefing.ts` — state machine из 5 вопросов (тип/блюд/ТТК/фото/время связи) с loop-сборкой файлов; всё мирорится в FeedbackReply, файлы качаются → Vercel Blob → VenueFile. Endpoints: `POST /api/telegram/webhook` (с проверкой `X-Telegram-Bot-Api-Secret-Token`), `POST /api/telegram/setup` (admin-only регистрация webhook), `GET /api/telegram/start-link` (deep-link для владельца). Admin reply в дашборде форвардится в TG если у владельца есть `telegramChatId`. В `MessagesPanel` пустой стейт — выбор канала: Telegram (быстрее) или «здесь в чате». **Env нужно:** `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` (TELEGRAM_BOT_TOKEN уже есть).

- **Last Action (2026-05-15, ч.3):** Двусторонняя переписка владелец↔админ. Расширил `Feedback` тредом (новая модель `FeedbackReply` + `lastReplyAt/ownerUnread/adminUnread`). Добавил категорию `billing`. Endpoints: `/api/feedback/threads` (мои треды), `/api/feedback/[id]` (GET с авто-mark-read), `/api/feedback/[id]/reply` (POST), `/api/feedback/unread` (бейдж). UI владельца: `MessagesPanel` (side panel со списком тредов и чатом) + `MessagesNavButton` в DashboardNav (sidebar+mobile) с бейджем непрочитанных. Удалил FAB FeedbackButton. TrialBanner «awaiting_plan»/«grace» → кнопка «Написать админу» открывает панель с предзаполненной категорией billing. UI админа: `/admin/feedback` мигрирован на TanStack Query, добавлена кнопка «Открыть переписку» → drawer с историей и reply. TG-нотификация админу при ответе владельца. Миграция `add_feedback_threads`.

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
