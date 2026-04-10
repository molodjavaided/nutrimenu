# CLAUDE.md

> This is a living document — update it as you add skills, learn from errors, and evolve the system.
> Identical copies live in: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`. When you update one — update all three.

---

## IMPORTANT: This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Project Context

### 🚨 IMPORTANT: Task Resume

Every time you start, check `.claude/memory.md` to see the status of the last task. If a task is "In Progress", prioritize completing it before asking for new instructions.
**Project:** NutriMenu
**Owner:** Yuri
**What we do:** SaaS app for restaurant and café owners to build nutrition-aware digital menus accessible to guests via QR code.
**Target audience:** Restaurant/café owners (dashboard) and their guests (public menu via QR)

### About the business

NutriMenu helps food businesses comply with nutrition disclosure requirements and give guests transparency about what they're eating. Owners manage their menu through a dashboard; guests scan a QR code and see a branded, filterable menu with full КБЖУ (calories/protein/fat/carbs) data.

### Current goals

- Build out the MVP feature set: menu management, ingredient library, nutrition calculation
- Ensure the public menu renders correctly and fast on mobile
- Keep the codebase clean for future backend/auth migration (currently localStorage-only)

### What AI agents should handle

- Feature implementation across dashboard and public menu
- Refactoring and code quality improvements
- Debugging nutrition calculation logic
- Component and type changes

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

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4 + inline style objects for brand colors
- **UI:** shadcn/ui components, lucide-react icons
- **Forms:** react-hook-form + zod
- **DnD:** @dnd-kit/core, @dnd-kit/sortable
- **Persistence:** localStorage only (no backend/database yet)
- **Language:** TypeScript

---

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint (Next.js config, v9 flat config in eslint.config.mjs)
```

No test framework is configured.

---

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

- **Critical:** Always check for `window` before accessing storage. Do not suggest migration to SQL/NoSQL unless explicitly asked.

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
| `backend-developer` | Guide for adding API routes and migrating from localStorage to a real database. Covers Next.js Route Handlers, zod validation, migration path, Postgres/Prisma recommendations, security rules |

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
8. **Task Persistence.** Before any `/clear` or at the end of a work session, update `.claude/memory.md` with:
   - Current task status (Pending/In Progress/Done).
   - What exactly was done in the last step.
   - What the immediate NEXT step is.
   - Any blockers or bugs found.

---

## File Organization

| Path                     | Purpose                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `CLAUDE.md`              | Project instructions for Claude Code (identical to AGENTS.md)     |
| `AGENTS.md`              | Project instructions for Cursor/Windsurf (identical to CLAUDE.md) |
| `GEMINI.md`              | Project instructions for Gemini (identical to CLAUDE.md)          |
| `.claude/skills/<name>/` | SOPs — bundled skills (SKILL.md + scripts/)                       |
| `.claude/agents/`        | Sub-agent definitions                                             |
| `app/`                   | Next.js App Router pages and layouts                              |
| `components/`            | React components (ui/ = shadcn, rest = project)                   |
| `lib/`                   | Utilities: store.ts, utils.ts, mock-data.ts                       |
| `types/`                 | TypeScript types (index.ts = all domain types)                    |
| `.tmp/`                  | Intermediate files — never commit, always regenerated             |
| `.env`                   | API keys — never commit                                           |
