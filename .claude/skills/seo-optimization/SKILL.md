---
name: seo-optimization
description: Apply SEO best practices to NutriMenu public pages. Use this skill when adding or reviewing metadata, OG tags, structured data, or any public-facing page at /menu/[slug]. Optimizes for restaurant/menu discoverability in search engines.
allowed-tools: Read, Edit, Write, Glob, Grep
---

## Goal

Make NutriMenu public menu pages discoverable by search engines and shareable on social media. Each venue's menu (`/menu/[slug]`) is a standalone landing page that should rank for "[venue name] menu" searches and render a rich preview when shared on WhatsApp, Telegram, Instagram, etc.

## Pages in Scope

- `/menu/[slug]` — the main public page (guest-facing)
- Future: `/menu/[slug]/item/[id]` if individual dish pages are added

Dashboard pages (`/dashboard/*`) are NOT indexed — add `noindex` if missing.

## Metadata Checklist (per page)

### Basic meta tags
```tsx
// app/menu/[slug]/page.tsx — Server Component, generateMetadata export
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const venue = getVenueBySlug(params.slug) // from store or future API
  return {
    title: `${venue.name} — меню`,
    description: `Меню ресторана ${venue.name}. Полный состав блюд, калорийность и КБЖУ.`,
    robots: { index: true, follow: true },
  }
}
```

### Open Graph (social sharing)
```tsx
openGraph: {
  title: `${venue.name} — меню`,
  description: `Посмотрите меню ${venue.name} с калориями и составом`,
  type: 'website',
  url: `https://yourdomain.com/menu/${venue.slug}`,
  images: [{ url: venue.logoUrl ?? '/og-default.png', width: 1200, height: 630 }],
  locale: 'ru_RU',
},
twitter: {
  card: 'summary_large_image',
  title: `${venue.name} — меню`,
  description: `Меню с КБЖУ от ${venue.name}`,
  images: [venue.logoUrl ?? '/og-default.png'],
},
```

### Canonical URL
Always set canonical to prevent duplicate content (e.g. with/without trailing slash):
```tsx
alternates: {
  canonical: `https://yourdomain.com/menu/${params.slug}`,
},
```

## Structured Data (Schema.org)

Add JSON-LD for rich search results. Restaurant + Menu schema:

```tsx
// In the Server Component
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: venue.name,
  url: `https://yourdomain.com/menu/${venue.slug}`,
  image: venue.logoUrl,
  servesCuisine: venue.cuisineType ?? 'Кафе',
  hasMenu: {
    '@type': 'Menu',
    name: `Меню ${venue.name}`,
    hasMenuSection: categories.map(cat => ({
      '@type': 'MenuSection',
      name: cat.name,
      hasMenuItem: cat.items.map(item => ({
        '@type': 'MenuItem',
        name: item.name,
        description: item.description,
        offers: { '@type': 'Offer', price: item.price, priceCurrency: 'RUB' },
        nutrition: {
          '@type': 'NutritionInformation',
          calories: `${item.calories} ккал`,
          proteinContent: `${item.protein}г`,
          fatContent: `${item.fat}г`,
          carbohydrateContent: `${item.carbs}г`,
        },
      })),
    })),
  },
}

// Add to JSX:
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

## Performance (affects SEO ranking)

- **LCP** (Largest Contentful Paint): Venue logo/hero image should load fast — use `<Image>` from `next/image` with `priority` prop
- **CLS** (Cumulative Layout Shift): Reserve space for images with explicit `width`/`height` or `aspect-ratio`
- **No render-blocking**: Keep CSS inlined (Tailwind does this), avoid large synchronous JS on public menu
- **Font loading**: If adding custom fonts — use `next/font` with `display: swap`

## robots.txt

Ensure public menu pages are crawlable. Add or verify `app/robots.ts`:
```ts
export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/menu/' },
      { userAgent: '*', disallow: '/dashboard/' },
    ],
    sitemap: 'https://yourdomain.com/sitemap.xml',
  }
}
```

## Sitemap

When the number of venues grows, generate `app/sitemap.ts`:
```ts
export default function sitemap() {
  const venues = getAllVenues() // from store or API
  return venues.map(v => ({
    url: `https://yourdomain.com/menu/${v.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))
}
```

## QR Code Considerations

The main traffic source is QR scans, not search engines — but SEO matters for:
- Direct search by venue name
- Rich previews when guests share the menu link in chats
- Google Maps / 2GIS profile links

## Checklist Before Shipping a Menu Page

- [ ] `generateMetadata` exported from `app/menu/[slug]/page.tsx`
- [ ] `title` and `description` populated from venue data
- [ ] Open Graph `title`, `description`, `image` set
- [ ] Canonical URL set
- [ ] JSON-LD Restaurant schema added
- [ ] Dashboard routes have `robots: { index: false }`
- [ ] `app/robots.ts` allows `/menu/` and disallows `/dashboard/`

## Learnings

- (Updated after each session)
