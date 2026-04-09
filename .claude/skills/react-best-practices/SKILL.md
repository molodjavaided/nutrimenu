---
name: react-best-practices
description: Enforce React and Next.js 16 App Router best practices. Use this skill when writing, reviewing, or refactoring React components and hooks in this project.
allowed-tools: Read, Edit, Write, Glob, Grep
---

## Goal

Write React code that is correct, performant, and idiomatic for Next.js 16 App Router with TypeScript. No over-engineering, no unnecessary abstractions.

## Server vs Client Components

**Default to Server Components.** Only add `"use client"` when the component needs:
- `useState` / `useReducer` / `useRef`
- `useEffect` / lifecycle hooks
- Browser APIs (`window`, `localStorage`, `document`)
- Event handlers (`onClick`, `onChange`, etc.)
- Third-party client-only libraries

**Never** put `"use client"` on a component just to pass data — lift state up or use a thin Client wrapper.

Pattern: thin Client wrapper around a mostly-static Server Component tree.
```tsx
// page.tsx — Server Component (async, no "use client")
export default async function Page() {
  const data = await fetchData()
  return <ClientWrapper data={data} />
}

// ClientWrapper.tsx — Client Component (only what needs interactivity)
"use client"
export function ClientWrapper({ data }: Props) { ... }
```

## Component Rules

- One component per file. File name = component name in PascalCase.
- Props interface directly above the component, not exported unless needed elsewhere.
- Destructure props in the function signature.
- No default exports for utility functions — only for page/layout components (Next.js requirement).

```tsx
interface DishCardProps {
  item: MenuItem
  onSelect: (id: string) => void
}

export function DishCard({ item, onSelect }: DishCardProps) { ... }
```

## Hooks

- Custom hooks go in `lib/hooks/` or colocated with the component if single-use.
- Hook name must start with `use`.
- No hooks inside conditionals, loops, or nested functions.
- `useEffect` — always specify deps array. Empty `[]` = run once on mount. Missing deps = bug.
- Prefer `useMemo`/`useCallback` only when the computation is genuinely expensive or when referential stability matters (passed to memo'd child or used in effect deps). Don't wrap everything reflexively.

## TypeScript

- No `any`. Use `unknown` + type guard if type is truly unknown.
- No type assertions (`as Foo`) unless you have no alternative — add a comment explaining why.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- Import types with `import type { ... }` to keep bundles clean.

## Forms (react-hook-form + zod)

Pattern used in this project (`ItemForm`):
```tsx
const schema = z.object({ ... })
type FormValues = z.infer<typeof schema>

const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { ... },
})
```
- Never use uncontrolled inputs outside react-hook-form.
- Validate at the schema level — don't add manual checks in submit handlers.

## State Management

All data lives in `localStorage` via `lib/store.ts`. Rules:
- Never read/write localStorage directly in components — always go through store helpers.
- Wrap store reads in `useState` + `useEffect` to avoid SSR mismatch.
- When multiple components need the same data, lift to the nearest common ancestor or use a context — don't duplicate reads.

```tsx
const [categories, setCategories] = useState<Category[]>([])
useEffect(() => {
  setCategories(getCategories())
}, [])
```

## Lists and Keys

- Always use stable, unique keys — never array index unless the list is static and never reordered.
- `MenuItem.id` or `Category.id` are the correct keys in this project.

## Performance

- Don't wrap every component in `React.memo` — profile first.
- Large lists (ingredient picker, item list) benefit from virtualization if they grow beyond ~100 items.
- Avoid inline object/array/function creation in JSX props when passed to memoized children.

## Styling

This project uses **Tailwind CSS v4 + inline style objects** for brand colors:
- Brand colors (`#2C2950`, `#B0A6DF`, `#EAE7F8`, `#FEFEF2`) are applied via `style={{ color: '...' }}` — not Tailwind classes, since they are not in the config.
- Use `cn()` from `lib/utils.ts` for conditional class merging — never string concatenation.
- Use shadcn/ui primitives from `components/ui/` before writing custom markup for common patterns (Button, Input, Badge, Dialog, Sheet, etc.).

## Error Boundaries

No error boundary is configured yet. Don't add one unless asked — note it as a future improvement if relevant.

## Learnings

- (Updated after each session — add what worked, what failed, edge cases found)
