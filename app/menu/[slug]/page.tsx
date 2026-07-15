import { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { getUserState } from '@/lib/plans'
import MenuClientWrapper from '@/components/menu/MenuClientWrapper'
import { Category, IngredientRef } from '@/types'

// Кэшируем HTML на CDN Vercel на 60 секунд.
// Все гости видят одинаковый HTML — isOwner определяется на клиенте.
export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

type MenuStatus = 'active' | 'coming_soon' | 'paused'

function getMenuStatus(
  venueStatus: string,
  plan: 'TEST' | 'START' | 'STANDARD' | 'CUSTOM',
  trialEndsAt: Date | null,
  paidUntil: Date | null,
): MenuStatus {
  if (venueStatus === 'REJECTED') return 'paused'
  if (venueStatus === 'PENDING') return 'coming_soon'
  const state = getUserState({ plan, trialEndsAt, paidUntil })
  if (state === 'paid' || state === 'trial') return 'active'
  return 'paused'
}

const getMenuData = unstable_cache(
  async (slug: string) => {
    const venue = await db.venue.findUnique({
      where: { slug },
      include: {
        owner: { select: { plan: true, trialEndsAt: true, paidUntil: true } },
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: { items: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } },
        },
      },
    })

    if (!venue) return null

    const menuStatus = getMenuStatus(venue.status, venue.owner.plan, venue.owner.trialEndsAt, venue.owner.paidUntil)

    if (menuStatus !== 'active') {
      return {
        menuStatus,
        venue: { id: venue.id, name: venue.name, logo: venue.logo ?? undefined, description: venue.description ?? undefined },
        categories: [] as Category[],
        ingredientRefs: [] as IngredientRef[],
      }
    }

    const ingredientRefs = await db.ingredientRef.findMany({
      where: { OR: [{ venueId: venue.id }, { isSystem: true }] },
    })

    const categories: Category[] = venue.categories.map(c => ({
      id: c.id,
      name: c.name,
      venueId: c.venueId,
      order: c.sortOrder,
      items: c.items.map(i => ({
        id: i.id,
        categoryId: i.categoryId,
        venueId: i.venueId,
        name: i.name,
        description: i.description ?? undefined,
        photo: i.photo ?? undefined,
        price: i.price ?? undefined,
        weight: i.weight,
        weightUnit: i.weightUnit as 'г' | 'мл',
        calories: i.calories,
        protein: i.protein,
        fat: i.fat,
        carbs: i.carbs,
        isAvailable: i.isAvailable,
        sizes: (i.sizes as never[]) ?? [],
        composition: (i.composition as never[]) ?? [],
        variantGroups: (i.variantGroups as never[]) ?? [],
        modifierGroups: (i.modifierGroups as never[]) ?? [],
      })),
    }))

    return {
      menuStatus: 'active' as MenuStatus,
      venue: {
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
        address: venue.address ?? undefined,
        description: venue.description ?? undefined,
        workingHours: venue.workingHours ?? undefined,
        logo: venue.logo ?? undefined,
        tags: venue.tags,
      },
      categories,
      ingredientRefs: ingredientRefs.map(r => ({
        id: r.id,
        name: r.name,
        unit: r.unit as 'г' | 'мл' | 'шт',
        weightPerUnit: r.weightPerUnit ?? undefined,
        caloriesPer100: r.caloriesPer100,
        proteinPer100: r.proteinPer100,
        fatPer100: r.fatPer100,
        carbsPer100: r.carbsPer100,
        isSystem: r.isSystem,
      })),
    }
  },
  ['menu-data'],
  { revalidate: 60 },
)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getMenuData(slug)

  if (!data) return { title: 'Меню не найдено' }

  const { venue } = data
  const title = `${venue.name} — меню с КБЖУ`
  const description = `Меню заведения ${venue.name}. Полная информация о составе и питательной ценности блюд.`
  const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://plate.menu'}/menu/${slug}`

  return {
    title,
    description,
    openGraph: {
      title, description, url, type: 'website', locale: 'ru_RU', siteName: 'Plate',
      images: venue.logo
        ? [{ url: venue.logo, width: 400, height: 400, alt: venue.name }]
        : [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Plate — цифровое меню' }],
    },
    twitter: {
      card: 'summary_large_image', title, description,
      images: venue.logo ? [venue.logo] : ['/opengraph-image'],
    },
    alternates: { canonical: url },
  }
}

export default async function MenuPage({ params }: Props) {
  const { slug } = await params
  const data = await getMenuData(slug)

  const jsonLd = data && 'slug' in data.venue ? {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: data.venue.name,
    url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://plate.menu'}/menu/${slug}`,
    hasMenu: { '@type': 'Menu', url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://plate.menu'}/menu/${slug}` },
  } : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // Escape < > & so an owner-controlled venue name containing </script> can't break out of the tag (stored XSS).
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026'),
          }}
        />
      )}
      <MenuClientWrapper slug={slug} initialData={data} />
    </>
  )
}
