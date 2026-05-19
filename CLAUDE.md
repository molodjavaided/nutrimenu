# CLAUDE.md

> This is a living document — update it as you add skills, learn from errors, and evolve the system.

---

## IMPORTANT: This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Project Context

### 🚨 IMPORTANT: Task Resume

Активная память проекта живёт в **auto-memory** (`~/.claude/projects/<project-hash>/memory/`). Индекс `MEMORY.md` подгружается автоматически — открой первым делом `project_next_tasks.md` и продолжай с верхней незакрытой задачи.

**Project:** NutriMenu
**Owner:** Yuri
**What we do:** SaaS app for restaurant and café owners to build nutrition-aware digital menus accessible to guests via QR code.
**Target audience:** Restaurant/café owners (dashboard) and their guests (public menu via QR)

### About the business

NutriMenu helps food businesses comply with nutrition disclosure requirements and give guests transparency about what they're eating. Owners manage their menu through a dashboard; guests scan a QR code and see a branded, filterable menu with full КБЖУ (calories/protein/fat/carbs) data.

### Current goals (порядок приоритетов)

1. **Полировка продукта** — текущая фаза. Чтобы первым пользователям было удобно и мы получили их доверие. UX, баги, мобилка, мелкие фичи которые повышают доверие.
2. **Первые платящие клиенты** — закрыть всё, что блокирует регистрацию → оплату → удержание.
3. **Перфоманс и масштаб** — 10 заведений × 100 блюд: запросы, пагинация, кеш.
4. **Расширение фич (крупные)** — только после 1-3. Мелкие фичи можно добавлять на любой фазе если они в линии с (1).

Актуальная очередь задач — `project_next_tasks.md` (auto-memory).

### What AI agents should handle

- Feature implementation across dashboard, admin, public menu, Telegram bot
- Refactoring и улучшение качества кода
- Дебаг логики нутриентов и AI-импорта (TTK, штрихкод)
- Изменения схемы БД и Prisma миграции

### Полномочия агента (по умолчанию разрешено)

- ✅ Пушить в `main` без PR (после `tsc` + визуальный прогон через `/qa`)
- ✅ Создавать и применять Prisma миграции (`migrate deploy` на Neon)
- ✅ Менять данные в БД напрямую (SQL-апдейты прод-данных)
- ✅ Удалять файлы и папки

Эти действия делаются без отдельного подтверждения. **Исключение:** массовое удаление пользовательских данных, drop таблиц, force-push — всегда спрашивать.

### Технические инварианты

- **Не добавлять новые AI-провайдеры.** Текущий зоопарк (Gemini + Perplexity Sonar + Claude резерв) — достаточен. OpenAI/Anthropic-новые/Mistral и т.п. — только по явному запросу.

### What I DON'T want

- Don't add features, refactors, or "improvements" beyond what was asked
- Don't add docstrings or comments to code you didn't touch
- Don't create unnecessary abstractions or helpers for one-time use
- Don't introduce backwards-compat shims — just change the code
- Don't add error handling for impossible scenarios
- Don't use preambles or polite fillers (e.g., "Certainly!", "I'll help with that"). Tool results first.
- Don't speak Russian for internal reasoning or comments—only for direct communication with me.
- Don't forget to be concise: one-sentence status updates are preferred.

### Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **DB:** Postgres (Neon) + Prisma — основной источник правды
- **Auth:** JWT в httpOnly cookie (`lib/auth.ts`), роли `admin | owner`, impersonation (TTL 2ч)
- **Server state:** TanStack Query v5 (новый код). Часть `/dashboard/*` ещё на useEffect — мигрируется по мере правок.
- **Styling:** Tailwind CSS v4 + inline style objects для бренд-цветов (`#2C2950`, `#B0A6DF`, `#EAE7F8`, `#FEFEF2`)
- **UI:** shadcn/ui, lucide-react
- **Forms:** react-hook-form + zod
- **DnD:** @dnd-kit/core, @dnd-kit/sortable
- **Files:** Vercel Blob (фото блюд, файлы заведения)
- **AI:** Gemini (TTK импорт, штрихкод lookup, ingredient meta), Perplexity Sonar (fallback), Claude (резерв через `lib/claude-ttk.ts`)
- **Notifications:** Telegram-бот (брифинг новых заведений, двусторонняя переписка владелец↔админ)
- **Rate limiting:** Upstash Redis (`lib/ratelimit.ts`)
- **Email:** Resend (заглушка — нет домена)

---

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint (Next.js config, v9 flat config in eslint.config.mjs)
```

Tests: **Vitest** (`npm test` = `vitest run`, `npm run test:watch` = `vitest`). Тесты в `test/*.test.ts`. Запускать конкретный файл: `npx vitest run test/foo.test.ts`.

---

## Architecture

**NutriMenu / Plate** — Next.js 16 SaaS для ресторанов: владелец ведёт меню с КБЖУ в дашборде, гость видит публичное меню через QR.

### Основные разделы

**Owner Dashboard** (`/dashboard/*`)

- `/dashboard` — обзор, онбординг-чеклист, QR
- `/dashboard/menu` — категории и блюда (drag-and-drop через @dnd-kit)
- `/dashboard/item/new` и `/dashboard/item/[id]` — создание/правка через `ItemForm` (разбит на `useItemFormState` + 4 секции, см. [[item-form-refactor]])
- `/dashboard/ingredients` — справочник ингредиентов (mono + composite)
- `/dashboard/settings` — настройки заведения

**Admin Panel** (`/admin/*`)

- `/admin/venues` — список заведений, статусы (PENDING/APPROVED/REJECTED), фильтры, impersonation
- `/admin/venues/[id]` — деталка: смена плана, продление триала, бонусные лимиты, файлы заведения
- `/admin/feedback` — переписка владелец↔админ (drawer с тредом + reply)
- `/admin` — глобальные тулы: AI-обогащение ингредиентов, кеш штрихкодов

**Auth** (`/auth/*`, `app/(auth)/`)

- Регистрация (ставит `plan: 'TEST'` + триал 14д), логин, забыл/сброс пароля
- JWT в httpOnly cookie, валидация через `verifySessionToken` в `lib/auth.ts`
- Layout-уровень: `app/admin/layout.tsx` — server-guard для админки

**Public Menu** (`/menu/[slug]`)

- Async Server Component → fetch из БД → передаёт в `MenuClientWrapper`
- `MenuView` рендерит `CategoryTabs`, `DishCard`, `DishSheet`, `NutriTracker`
- Состояния: `active` / `paused` (триал истёк, `awaiting_plan`) / `not-found`

**Telegram bot**

- `POST /api/telegram/webhook` — приём апдейтов, проверка `X-Telegram-Bot-Api-Secret-Token`
- `lib/telegram-briefing.ts` — state machine брифинга нового заведения (5 вопросов)
- Двусторонние сообщения мирорятся в `FeedbackReply`

### Data persistence

**Postgres (Neon) + Prisma** — единственный источник правды для продакшена.

- Schema: `prisma/schema.prisma`. Миграции: `prisma/migrations/*` + `npx prisma migrate deploy`.
- Доступ: `lib/db.ts` (singleton PrismaClient).
- `lib/store.ts` (localStorage) — **legacy для публичного меню/демо**. Используется только в `app/demo/*` и как fallback в `mockCategories`. **Не использовать в новом коде.**

### Тарифы и состояния пользователя (`lib/plans.ts`)

- `TEST` — 14д триал, лимиты Старта без AI
- `START` — бесплатно, до 20 блюд (или 50 — уточнить в plans.ts)
- `STANDARD` — 990 ₽/мес, AI-импорт, экспорт
- `CUSTOM` — Infinity, кастомизация
- Состояния: `trial` / `awaiting_plan` (после триала, меню скрыто) / `grace` / `paid` / `paused`
- Бонусные лимиты (bonusItems / bonusAiImports / bonusTtkExports) сохраняются при смене плана

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

---

## Agent Architecture

Inside `.claude/` there are two folders for extending AI behavior:

**Skills** (`.claude/skills/<name>/`) — SOPs, loaded on demand.

- Each Skill = `SKILL.md` instructions + optional `scripts/` folder
- Frontmatter: `name`, `description`, `allowed-tools`
- One skill = one workflow. Short, focused, concrete.

**Agents** (`.claude/agents/`) — sub-agents, spawned on demand.

- Lightweight agents with isolated context
- Use for: research, code review, QA, classification
- Read-only reporters — all changes happen in the parent agent

### How to create a new Skill

1. Create `.claude/skills/<skill-name>/SKILL.md`:

```markdown
---
name: [Skill Name]
description: [One sentence — what does this skill do]
allowed-tools: [Read, Write, WebSearch, WebFetch, Bash, etc.]
---

## Goal

[What is the end result?]

## Input

[What does the user provide?]

## Steps

1. [Concrete action]
2. ...

## Output Format

[Exact format of deliverable]

## Learnings

- (Updated after each run)
```

2. Add it to the "Available Skills" section below.

### How to create a Sub-Agent

Create `.claude/agents/<agent-name>.md`:

```markdown
---
model: sonnet
allowed-tools: [Read, Glob, Grep, WebSearch, WebFetch]
---

## Role

[One sentence]

## Instructions

[What to focus on, what format to return]

## Output Format

[Exact format]
```

---

## Available Skills

> Updated as skills are created.

### Frontend

| Skill                  | Description                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-design`      | Create distinctive, production-grade UI — avoids generic AI aesthetics. Covers typography, color, motion, spatial composition. _(Official Anthropic skill)_          |
| `react-best-practices` | Enforce React + Next.js 16 App Router best practices: Server vs Client components, hooks, TypeScript, forms, localStorage store, Tailwind + shadcn/ui patterns       |
| `web-design`           | UX/UI best practices for NutriMenu — visual hierarchy, brand color system, mobile-first rules, accessibility checklist, touch targets, states (empty/error/loading)  |
| `hookify`              | Write Claude Code hooks (`.claude/hookify.*.local.md`) to watch for patterns and show warnings. Covers bash, file, stop, prompt events. _(Official Anthropic skill)_ |
| `seo-optimization`     | SEO for public menu pages: `generateMetadata`, Open Graph, Schema.org JSON-LD, robots.txt, sitemap, Core Web Vitals                                                  |

### Backend

| Skill               | Description                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend-developer` | Guide for API routes, Prisma migrations, zod validation, security rules. Стек уже: Postgres (Neon) + Prisma + JWT.                                                                            |

### Workflow (slash commands — invoke as `/command-name`)

| Command           | Description                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/feature-dev`    | Guided feature development: discovery → exploration → clarifying questions → architecture → implementation → review _(Official Anthropic)_   |
| `/code-review`    | Review a GitHub PR with parallel agents — bugs + CLAUDE.md compliance. Use `--comment` to post inline GitHub comments _(Official Anthropic)_ |
| `/review-pr`      | Comprehensive PR review with specialized agents: comments, tests, errors, types, simplify _(Official Anthropic)_                             |
| `/commit`         | Stage and create a git commit from current changes _(Official Anthropic)_                                                                    |
| `/commit-push-pr` | Commit + push + open PR in one step _(Official Anthropic)_                                                                                   |
| `/clean-gone`     | Delete local branches whose remote has been deleted (`[gone]`) _(Official Anthropic)_                                                        |

### Security

| File                                      | Description                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/hooks/security_reminder_hook.py` | PreToolUse hook — warns on XSS, eval, exec, dangerouslySetInnerHTML, SQL injection, hardcoded secrets. Enable in `settings.local.json` _(Official Anthropic)_ |

---

## Operating Principles

1. **Check before building.** Before writing a script, check `.claude/skills/` and existing code. Only create new code if nothing exists.
2. **Plan before building.** For non-trivial tasks (especially Nutrition logic or DnD): propose a concise plan in 3-5 bullet points, wait for my "OK", then write code.
3. **One skill = one task.** Keep skills short and focused. If a skill does two things — split it.
4. **Scrap & redo after 2–3 failed attempts.** Stop patching — revert to clean state, implement the best solution in one clean pass.
5. **Self-annealing.** When something breaks: fix it, test it, update SKILL.md learnings so the same error won't happen again.
6. **Context Hygiene.** I will use `/clear` frequently to save tokens. Before I do, you must ensure any new architectural decisions or "learned" patterns are documented in the relevant Skill or `CLAUDE.md`.
7. **Silence is Golden.** Use `--silent` or `-q` flags for all CLI commands (npm, git) to keep the context window clean.
8. **Task Persistence.** В конце сессии или перед `/clear` обнови **auto-memory**: запиши в соответствующий `project_*.md` (или создай новый) текущий статус, что сделано последним шагом, следующий шаг, блокеры. Не используй `.claude/memory.md` или `.claude/CURRENT.md` — они удалены.
9. **Architecture decisions → Plan agent.** Для нетривиальных изменений (новая схема данных, миграция, рефакторинг 3+ файлов) — вызывай Agent с `subagent_type: Plan` до того, как редактировать.
10. **Pre-commit quality bar.** Перед коммитом нетривиальной фичи — обязательный визуальный прогон через `/qa` (золотой путь + 1-2 edge case). TypeScript-чек (`tsc`) идёт автоматически в pre-push hook. Тривиальные правки (один файл, очевидное поведение) — без `/qa`, только tsc.

---

## File Organization

| Path                                            | Purpose                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `CLAUDE.md`                                     | **Единственный источник правды** для инструкций агенту.                                |
| `docs/`                                         | Завершённые артефакты: `PITCH.md`, `PITCH_RAW.md`, `BACKLOG.md`. Не контекст для агента. |
| `.claude/skills/<name>/`                        | SOPs — bundled skills (SKILL.md + scripts/)                                            |
| `.claude/agents/`                               | Sub-agent definitions                                                                  |
| `~/.claude/projects/<hash>/memory/`             | **Auto-memory** — живая память проекта (MEMORY.md + project_*.md). Подгружается сама.  |
| `app/`                                          | Next.js App Router pages and layouts                                                   |
| `components/`                                   | React components (ui/ = shadcn, rest = project)                                        |
| `lib/`                                          | Server/shared utils: `db.ts` (Prisma), `auth.ts` (JWT), `plans.ts`, `telegram.ts`, AI-клиенты (`gemini-*.ts`, `claude-ttk.ts`), `store.ts` (legacy localStorage) |
| `prisma/`                                       | Schema + миграции. Применять через `npx prisma migrate deploy`.                        |
| `types/`                                        | TypeScript types (index.ts = all domain types)                                         |
| `.tmp/`                                         | Intermediate files — never commit, always regenerated                                  |
| `.env`                                          | API keys — never commit                                                                |
