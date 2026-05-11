import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://plate.menu'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const venues = await db.venue.findMany({
    select: { slug: true, updatedAt: true },
    where: { slug: { not: '' } },
  }).catch(() => [])

  const venueEntries = venues.map(v => ({
    url: `${BASE_URL}/menu/${v.slug}`,
    lastModified: v.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE_URL}/venues`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    ...venueEntries,
  ]
}
