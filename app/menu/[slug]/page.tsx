import { Metadata } from 'next'
import { db } from '@/lib/db'
import MenuClientWrapper from '@/components/menu/MenuClientWrapper'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const venue = await db.venue.findUnique({
    where: { slug },
    select: { name: true, description: true, address: true, logo: true, slug: true },
  })

  if (!venue) {
    return { title: 'Меню не найдено' }
  }

  const title = `${venue.name} — меню с КБЖУ`
  const description = venue.description
    ?? `Меню заведения ${venue.name}${venue.address ? ` — ${venue.address}` : ''}. Полная информация о составе и питательной ценности блюд.`
  const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nutrimenu.ru'}/menu/${venue.slug}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      ...(venue.logo ? { images: [{ url: venue.logo, width: 400, height: 400, alt: venue.name }] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(venue.logo ? { images: [venue.logo] } : {}),
    },
    alternates: { canonical: url },
  }
}

export default async function MenuPage({ params }: Props) {
  const { slug } = await params

  const venue = await db.venue.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, address: true },
  })

  const jsonLd = venue
    ? {
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name: venue.name,
        url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nutrimenu.ru'}/menu/${venue.slug}`,
        ...(venue.address ? { address: { '@type': 'PostalAddress', streetAddress: venue.address } } : {}),
        hasMenu: {
          '@type': 'Menu',
          url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nutrimenu.ru'}/menu/${venue.slug}`,
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <MenuClientWrapper slug={slug} />
    </>
  )
}
