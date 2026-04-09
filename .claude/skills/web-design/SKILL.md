---
name: web-design
description: Apply UX/UI best practices when designing or reviewing interfaces in NutriMenu. Use this skill when building or critiquing any screen — dashboard or public menu — with focus on usability, accessibility, and mobile-first design.
allowed-tools: Read, Edit, Write, Glob, Grep
---

## Goal

Produce interfaces that are usable, accessible, and visually consistent. NutriMenu has two distinct audiences — owners (dashboard) and guests (public menu). Design decisions must serve the right audience.

## Two Surfaces, Two Contexts

**Dashboard** (`/dashboard/*`) — owner on desktop or tablet:
- Data-dense, functional UI is appropriate
- Prioritize clarity over decoration
- Inputs, drag-and-drop, forms — efficiency matters
- Error states and empty states must be explicit

**Public Menu** (`/menu/[slug]`) — guest on mobile:
- Mobile-first is non-negotiable — design for 375px width minimum
- Fast to scan: category tabs → dish list → detail sheet
- Touch targets minimum 44×44px (buttons, tabs, interactive cards)
- Readable without zooming: body text minimum 16px
- No horizontal scroll

## Visual Hierarchy

Every screen needs three levels:
1. **Primary** — what the user must notice first (dish name, price, CTA)
2. **Secondary** — supporting info (КБЖУ summary, category label)
3. **Tertiary** — detail on demand (full ingredient list, allergens — inside DishSheet)

Don't promote everything. If everything is bold, nothing is bold.

## Color System

Brand palette — use these, don't introduce new colors without reason:
| Token | Hex | Use |
|-------|-----|-----|
| Dark navy | `#2C2950` | Primary text, headers, navbar background |
| Soft purple | `#B0A6DF` | Accents, active states, highlights |
| Light lavender | `#EAE7F8` | Backgrounds, cards, subtle fills |
| Warm white | `#FEFEF2` | Page background, surface |

Apply via inline `style={{ color: '...' }}` — these colors are not in Tailwind config.

Contrast rules (WCAG AA minimum):
- Text on light background: ≥ 4.5:1 ratio
- Large text / UI components: ≥ 3:1 ratio
- Never put `#B0A6DF` text on `#EAE7F8` background — insufficient contrast

## Typography

- Body text: 16px minimum on mobile
- Section headers: clear size jump (20–24px), not just bold
- Nutrition values (КБЖУ): use tabular/monospace figures if possible so columns align
- Line height: 1.4–1.6 for body, 1.1–1.2 for headings
- Truncate long dish names with `line-clamp-2`, never let them break layout

## Spacing & Layout

- Use consistent spacing scale (Tailwind: 4, 8, 12, 16, 24, 32px)
- Cards need breathing room — minimum 16px internal padding on mobile
- Category tabs: sticky on scroll so guests don't lose context
- DishSheet (bottom sheet): 90vh max, scrollable inside, safe-area padding for notched phones

## States Every Interactive Element Needs

- **Default** — resting state
- **Hover** — visible feedback (desktop)
- **Active/Pressed** — touch feedback (mobile)
- **Disabled** — 40% opacity + cursor: not-allowed
- **Loading** — skeleton or spinner, never blank
- **Empty** — helpful message, not just blank space ("No items in this category yet")
- **Error** — red, specific message, never just "Something went wrong"

## Accessibility Checklist

- All images have `alt` text (or `alt=""` if decorative)
- Form inputs have associated `<label>` (use shadcn/ui Label)
- Focus ring visible — don't remove `outline` without replacement
- Color is never the only indicator of state (add icon or text too)
- DishSheet is keyboard-closable (Escape key — shadcn Sheet handles this)
- Icon-only buttons have `aria-label`

## Mobile-Specific Rules

- No `hover`-only interactions on the guest menu — everything must work on touch
- Avoid tiny close buttons in top corners — bottom sheet dismiss via drag or large button
- Form fields on mobile: `inputMode` hints (`inputMode="decimal"` for nutrition numbers)
- Avoid fixed elements that overlap content — use safe-area-inset padding

## Learnings

- (Updated after each session)
